import type { CampaignItem, FlightItem, OrderLineItem, TargetingConfig } from '../types';
import {
  CAMPAIGN_COLORS,
  DEFAULT_WEIGHT_CURVE,
  ORDER_LINE_COLORS,
  type CampaignStatus,
  type Channel,
  type Currency,
  type BudgetType,
} from '../types';
import type { ImportCampaignDraft } from './importDto';
import { normalizeCampaignStatus } from '../campaignTimelineChips';
import { normalizeChannel, importStringToCounties } from './validateImport';
import { localTodayYmd, parseFlexibleToLocalYmd } from './dateLocal';
import {
  distributeFlightRangesInOrderLine,
  flightsHaveInclusiveOverlap,
  packFlightsSequentialNoOverlap,
} from '../flightOverlap';

export interface MergeDraftsOptions {
  /** Conversational AI (DescribeCampaign): partition blank flight dates; resolve overlaps after merge. */
  aiDescribeImport?: boolean;
}

function isIsoYmd(s: string | undefined): boolean {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

function resolveCampaignHull(d: ImportCampaignDraft, today: string): { start: string; end: string } {
  const rs = (d.startDate ?? '').trim();
  const re = (d.endDate ?? '').trim();
  if (isIsoYmd(rs) && isIsoYmd(re)) {
    let start = parseFlexibleToLocalYmd(rs, today);
    let end = parseFlexibleToLocalYmd(re, start);
    if (end < start) end = start;
    return { start, end };
  }
  return { start: '', end: '' };
}

function resolveOlHull(
  ol: ImportCampaignDraft['orderLines'][0],
  campStart: string,
  campEnd: string,
  today: string,
): { start: string; end: string } {
  const os = (ol.startDate ?? '').trim();
  const oe = (ol.endDate ?? '').trim();
  const fb = campStart && campEnd ? campStart : today;
  if (isIsoYmd(os) && isIsoYmd(oe)) {
    let start = parseFlexibleToLocalYmd(os, fb);
    let end = parseFlexibleToLocalYmd(oe, start);
    if (campStart && campEnd) {
      if (start < campStart) start = campStart;
      if (end > campEnd) end = campEnd;
    }
    if (end < start) end = start;
    return { start, end };
  }
  if (campStart && campEnd) return { start: campStart, end: campEnd };
  return { start: '', end: '' };
}

function resolveFlightHull(
  fl: { startDate?: string; endDate?: string },
  olStart: string,
  olEnd: string,
  today: string,
): { start: string; end: string } {
  const fs = (fl.startDate ?? '').trim();
  const fe = (fl.endDate ?? '').trim();
  const fb = olStart && olEnd ? olStart : today;
  if (isIsoYmd(fs) && isIsoYmd(fe)) {
    let start = parseFlexibleToLocalYmd(fs, fb);
    let end = parseFlexibleToLocalYmd(fe, start);
    if (olStart && olEnd) {
      if (start < olStart) start = olStart;
      if (end > olEnd) end = olEnd;
    }
    if (end < start) end = start;
    return { start, end };
  }
  if (olStart && olEnd) return { start: olStart, end: olEnd };
  return { start: '', end: '' };
}

function normalizeRequisitionList(raw: ImportCampaignDraft['orderLines'][0]['requisitionNumbers']): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map(s => String(s).trim()).filter(Boolean);
  const s = String(raw).trim();
  if (!s) return [];
  return s.split(/[\n,;]+/).map(p => p.trim()).filter(Boolean);
}

function mapTargeting(
  genId: () => string,
  t: ImportCampaignDraft['orderLines'][0]['targeting'],
): TargetingConfig {
  if (!t) {
    return { id: genId(), counties: [], gender: 'all', context: 'all' };
  }
  const rawCounty = (t.county && String(t.county).trim()) || 'All';
  const counties = importStringToCounties(rawCounty);
  const gender = t.gender ?? 'all';
  const context = t.context ?? 'all';
  return {
    id: genId(),
    counties,
    gender,
    context,
  };
}

export function mergeDraftsToCampaignItems(
  drafts: ImportCampaignDraft[],
  genId: () => string,
  colorStartIndex: number,
  options?: MergeDraftsOptions,
): CampaignItem[] {
  const today = localTodayYmd();
  return drafts.map((d, ci) => {
    const campId = genId();
    const budgetId = genId();
    const color = CAMPAIGN_COLORS[(colorStartIndex + ci) % CAMPAIGN_COLORS.length];
    const { start: campStart, end: campEnd } = resolveCampaignHull(d, today);

    const orderLines: OrderLineItem[] = d.orderLines.map((ol, oi) => {
      const olId = genId();
      const { start: olStart, end: olEnd } = resolveOlHull(ol, campStart, campEnd, today);
      const rawFlights = ol.flights || [];

      let flights: FlightItem[] = rawFlights.map(fl => {
        const rawCh = typeof fl.channel === 'string' ? fl.channel : 'tv';
        const ch: Channel = normalizeChannel(rawCh) ?? 'digital';
        const flId = genId();
        const { start: fs, end: fe } = resolveFlightHull(fl, olStart, olEnd, today);
        return {
          id: flId,
          name: fl.name || 'Flight',
          channel: ch,
          startDate: fs,
          endDate: fe,
          budgetWeight: Math.round(Math.min(100, Math.max(0, fl.budgetWeight ?? 0))) || 0,
          targetAudience: fl.targetAudience ?? '',
          collapsed: false,
          weightCurve: [...DEFAULT_WEIGHT_CURVE],
        };
      });

      const flWeights = flights.reduce((a, f) => a + f.budgetWeight, 0);
      if (flights.length > 0 && flWeights !== 100) {
        const base = Math.floor(100 / flights.length);
        let left = 100 - base * flights.length;
        flights.forEach((f, idx) => {
          f.budgetWeight = base + (idx === 0 ? left : 0);
        });
      }

      if (
        options?.aiDescribeImport &&
        isIsoYmd(olStart) &&
        isIsoYmd(olEnd) &&
        flights.length > 1
      ) {
        const allUndated = rawFlights.every(rf => {
          const a = (rf.startDate ?? '').trim();
          const b = (rf.endDate ?? '').trim();
          return !isIsoYmd(a) || !isIsoYmd(b);
        });
        if (allUndated) {
          flights = distributeFlightRangesInOrderLine([...flights], olStart, olEnd);
        } else if (flightsHaveInclusiveOverlap(flights)) {
          flights = packFlightsSequentialNoOverlap([...flights], olStart, olEnd);
        }
      }

      return {
        id: olId,
        name: ol.name || 'Order line',
        startDate: olStart,
        endDate: olEnd,
        status: 'draft' as CampaignStatus,
        color: ORDER_LINE_COLORS[oi % ORDER_LINE_COLORS.length],
        budgetWeight: Math.round(Math.min(100, Math.max(0, ol.budgetWeight ?? 0))) || 0,
        flights,
        targeting: mapTargeting(genId, ol.targeting),
        requisitionNumbers: normalizeRequisitionList(ol.requisitionNumbers),
        notes: '',
        collapsed: false,
      };
    });

    const olwSum = orderLines.reduce((a, o) => a + o.budgetWeight, 0);
    if (orderLines.length > 0 && olwSum !== 100) {
      const base = Math.floor(100 / orderLines.length);
      let left = 100 - base * orderLines.length;
      orderLines.forEach((o, idx) => {
        o.budgetWeight = base + (idx === 0 ? left : 0);
      });
    }

    const currency = (d.budget?.currency ?? 'NOK') as Currency;
    const btype = (d.budget?.type ?? 'gross') as BudgetType;

    return {
      id: campId,
      name: d.name || 'Imported campaign',
      advertiser: d.advertiser ?? '',
      startDate: campStart,
      endDate: campEnd,
      status: normalizeCampaignStatus(d.status),
      color,
      budget: {
        id: budgetId,
        total: d.budget?.total ?? 0,
        currency,
        type: btype,
      },
      orderLines,
      notes: d.notes ?? '',
      collapsed: false,
    };
  });
}
