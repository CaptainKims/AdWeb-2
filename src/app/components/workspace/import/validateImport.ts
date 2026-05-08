import type { CampaignItem, Channel, FlightItem, OrderLineItem, TargetingConfig } from '../types';
import { NORWEGIAN_FYLKER, type TargetingContext, type TargetingGender } from '../types';

/** Pre-2024 merged fylker names → 2024 fylker list (imports + localStorage migration). */
const LEGACY_COUNTY_TO_FYLKER: Record<string, readonly string[]> = {
  Viken: ['Akershus', 'Buskerud', 'Østfold'],
  'Vestfold og Telemark': ['Vestfold', 'Telemark'],
  'Troms og Finnmark': ['Troms', 'Finnmark'],
};

export type ImportIssueSeverity = 'blocking' | 'warning';

export interface ImportIssue {
  severity: ImportIssueSeverity;
  code: string;
  message: string;
  campaignIndex: number;
  orderLineIndex?: number;
  flightIndex?: number;
}

const CHANNELS: Channel[] = ['tv', 'digital', 'radio', 'outdoor'];

/** Map messy agency labels to AdWeb channels; returns null if unknown. */
export function normalizeChannel(raw: string): Channel | null {
  const s = raw.trim().toLowerCase();
  if (['tv', 'television', 'linear tv', 'broadcast'].some(x => s.includes(x))) return 'tv';
  if (['digital', 'online', 'display', 'video', 'programmatic', 'web', 'social'].some(x => s.includes(x))) return 'digital';
  if (['radio', 'audio'].some(x => s.includes(x))) return 'radio';
  if (['outdoor', 'ooh', 'out-of-home', 'billboard'].some(x => s.includes(x))) return 'outdoor';
  if (CHANNELS.includes(s as Channel)) return s as Channel;
  return null;
}

export function normalizeCounty(raw: string): { county: string; valid: boolean } {
  const t = raw.trim();
  if (/^all$/i.test(t)) return { county: 'All', valid: true };
  const exact = NORWEGIAN_FYLKER.find(f => f.toLowerCase() === t.toLowerCase());
  if (exact) return { county: exact, valid: true };
  const partial = NORWEGIAN_FYLKER.find(f => t.toLowerCase().includes(f.toLowerCase()) || f.toLowerCase().includes(t.toLowerCase()));
  if (partial) return { county: partial, valid: true };
  return { county: t, valid: false };
}

/** Convert a single import / legacy string into selected fylker; `[]` = nationwide. */
export function importStringToCounties(raw: string): string[] {
  const t = raw.trim();
  if (!t || /^all$/i.test(t)) return [];
  const legacy = LEGACY_COUNTY_TO_FYLKER[t];
  if (legacy) return [...legacy];
  const { county, valid } = normalizeCounty(t);
  if (!valid || county === 'All') return [];
  return [county];
}

const FYLKE_LIST = NORWEGIAN_FYLKER as readonly string[];

/** One-time migration from `county` string to `counties` array. */
export function migrateCampaignsTargetingFromLegacy(campaigns: CampaignItem[]): CampaignItem[] {
  let changed = false;
  const next = campaigns.map(c => ({
    ...c,
    orderLines: c.orderLines.map(ol => {
      if (!ol.targeting) return ol;
      const raw = ol.targeting as TargetingConfig & { county?: string };
      if (!('county' in (raw as Record<string, unknown>))) {
        return ol;
      }
      changed = true;
      const counties = importStringToCounties(raw.county ?? 'All');
      return {
        ...ol,
        targeting: {
          id: raw.id,
          counties,
          gender: raw.gender,
          context: raw.context,
        },
      };
    }),
  }));
  return changed ? next : campaigns;
}

/** One-time migration: ensure each order line has `requisitionNumbers: string[]`. */
export function migrateOrderLineRequisitionNumbers(campaigns: CampaignItem[]): CampaignItem[] {
  let changed = false;
  const next = campaigns.map(c => ({
    ...c,
    orderLines: c.orderLines.map(ol => {
      const raw = ol as OrderLineItem & { requisitionNumbers?: unknown };
      if (Array.isArray(raw.requisitionNumbers) && raw.requisitionNumbers.every(x => typeof x === 'string')) {
        return ol;
      }
      changed = true;
      return { ...ol, requisitionNumbers: [] as string[] };
    }),
  }));
  return changed ? next : campaigns;
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

function clampOrder(camp: CampaignItem, ol: OrderLineItem): OrderLineItem {
  const cs = (camp.startDate ?? '').trim();
  const ce = (camp.endDate ?? '').trim();
  const campOk = /^\d{4}-\d{2}-\d{2}$/.test(cs) && /^\d{4}-\d{2}-\d{2}$/.test(ce) && cs <= ce;
  let { startDate: s, endDate: e } = ol;
  if (campOk) {
    if (s < cs) s = cs;
    if (e > ce) e = ce;
    if (e < s) e = s;
  }
  const flights = ol.flights.map(f => {
    let fs = f.startDate;
    let fe = f.endDate;
    if (campOk) {
      if (fs < s) fs = s;
      if (fe > e) fe = e;
      if (fe < fs) fe = fs;
    }
    return { ...f, startDate: fs, endDate: fe };
  });
  return { ...ol, startDate: s, endDate: e, flights };
}

/** Validate merged campaigns; returns issues and a deep-cloned patched copy for display. */
export function validateImportedCampaigns(campaigns: CampaignItem[]): { issues: ImportIssue[]; patched: CampaignItem[] } {
  const issues: ImportIssue[] = [];
  const patched: CampaignItem[] = campaigns.map(c => structuredClone(c));

  patched.forEach((camp, ci) => {
    if (!camp.name?.trim()) {
      issues.push({ severity: 'warning', code: 'empty_campaign_name', message: 'Campaign name is empty.', campaignIndex: ci });
    }
    if (!isIsoDate(camp.startDate) || !isIsoDate(camp.endDate)) {
      issues.push({
        severity: 'warning',
        code: 'campaign_dates',
        message: `Campaign dates should be YYYY-MM-DD (got ${camp.startDate} – ${camp.endDate}).`,
        campaignIndex: ci,
      });
    }
    if (camp.startDate > camp.endDate) {
      issues.push({ severity: 'warning', code: 'campaign_date_order', message: 'Campaign start is after end date.', campaignIndex: ci });
    }

    if (camp.orderLines.length === 0) {
      issues.push({ severity: 'warning', code: 'no_order_lines', message: 'Campaign has no order lines.', campaignIndex: ci });
    }

    let olWeightSum = 0;
    camp.orderLines.forEach((ol, oi) => {
      if (!ol.targeting) {
        issues.push({
          severity: 'warning',
          code: 'missing_order_line_targeting',
          message: `Order line "${ol.name}" has no targeting (regions, gender, context).`,
          campaignIndex: ci,
          orderLineIndex: oi,
        });
      } else {
        const unknown = (ol.targeting.counties ?? []).filter(c => !FYLKE_LIST.includes(c));
        if (unknown.length > 0) {
          issues.push({
            severity: 'warning',
            code: 'invalid_county',
            message: `Unknown fylke(s): ${unknown.join(', ')}.`,
            campaignIndex: ci,
            orderLineIndex: oi,
          });
        }
      }

      if (!isIsoDate(ol.startDate) || !isIsoDate(ol.endDate)) {
        issues.push({
          severity: 'warning',
          code: 'ol_dates',
          message: `Order line "${ol.name}" has non-ISO dates.`,
          campaignIndex: ci,
          orderLineIndex: oi,
        });
      }

      ol.flights.forEach((fl, fi) => {
        const ch = normalizeChannel(fl.channel as unknown as string);
        if (!ch) {
          issues.push({
            severity: 'warning',
            code: 'unknown_channel',
            message: `Flight "${fl.name}" has unknown channel "${String(fl.channel)}".`,
            campaignIndex: ci,
            orderLineIndex: oi,
            flightIndex: fi,
          });
        }
        if (!isIsoDate(fl.startDate) || !isIsoDate(fl.endDate)) {
          issues.push({
            severity: 'warning',
            code: 'flight_dates',
            message: `Flight "${fl.name}" has non-ISO dates.`,
            campaignIndex: ci,
            orderLineIndex: oi,
            flightIndex: fi,
          });
        }
      });

      const fw = ol.flights.reduce((a, f) => a + (f.budgetWeight || 0), 0);
      if (ol.flights.length > 0 && fw !== 100) {
        issues.push({
          severity: 'warning',
          code: 'flight_weights_sum',
          message: `Order line "${ol.name}": flight budget weights sum to ${fw}% (expected 100%).`,
          campaignIndex: ci,
          orderLineIndex: oi,
        });
      }
      olWeightSum += ol.budgetWeight || 0;
    });

    if (camp.orderLines.length > 0 && olWeightSum !== 100) {
      issues.push({
        severity: 'warning',
        code: 'ol_weights_sum',
        message: `Order line budget weights sum to ${olWeightSum}% (expected 100%).`,
        campaignIndex: ci,
      });
    }
  });

  // Patch unknown channels to 'digital' with implicit warning already filed
  patched.forEach((camp, ci) => {
    camp.orderLines = camp.orderLines.map((ol, oi) => {
      let next = clampOrder(camp, ol);
      next = {
        ...next,
        flights: next.flights.map((fl, fi) => {
          const ch = normalizeChannel(fl.channel as unknown as string);
          return { ...fl, channel: ch ?? ('digital' as Channel) };
        }),
      };
      return next;
    });
  });

  return { issues, patched };
}

export function applyPrototypeTargetingDefaults(camp: CampaignItem, genId: () => string): CampaignItem {
  const next = structuredClone(camp);
  next.orderLines = next.orderLines.map(ol => {
    if (ol.targeting) return ol;
    const t: TargetingConfig = {
      id: genId(),
      counties: [],
      gender: 'all' as TargetingGender,
      context: 'all' as TargetingContext,
    };
    return { ...ol, targeting: t };
  });
  return next;
}
