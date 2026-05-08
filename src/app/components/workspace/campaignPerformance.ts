import type { CampaignItem } from './types';
import { formatLocalYmd, localTodayYmd } from './import/dateLocal';
import { estimatedCampaignViewsTotal } from './inventoryBudget';

export type PerformanceTone = 'under' | 'on' | 'over';

export interface PerformanceChartPoint {
  date: string;
  /** Linear cumulative plan: 0 at start → campaign estimated views on last day. */
  estimatedCumulative: number;
  /** Mock cumulative delivered; `null` from the day after “today” until campaign end (not delivered yet). */
  deliveredCumulative: number | null;
}

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function smoothstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function enumerateYmd(startYmd: string, endYmd: string): string[] {
  const start = new Date(`${startYmd}T12:00:00`);
  const end = new Date(`${endYmd}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  const out: string[] = [];
  const d = new Date(start);
  while (d <= end) {
    out.push(formatLocalYmd(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** Planned cumulative at end of day `dayIndex` (0-based), linear 0 → E over the campaign. */
function plannedLinearCumulativeThroughDayIndex(dayIndex: number, n: number, E: number): number {
  if (n <= 0) return 0;
  if (n === 1) return E;
  const k = Math.min(Math.max(dayIndex, 0), n - 1);
  return Math.round((E * (k + 1)) / n);
}

function toneFromRatio(r: number): PerformanceTone {
  if (r < 0.98) return 'under';
  if (r > 1.02) return 'over';
  return 'on';
}

/** Planned total impressions from inventory-adjusted campaign budget (prototype). */
export function plannedEstimatedViewsForCampaign(campaign: CampaignItem): number {
  return estimatedCampaignViewsTotal(campaign);
}

export function performanceToneForCampaign(campaign: CampaignItem): PerformanceTone | null {
  const snap = deliverySnapshot(campaign);
  if (!snap) return null;
  return toneFromRatio(snap.ratio);
}

export function deliverySnapshot(campaign: CampaignItem): {
  ratio: number;
  plannedCumulativeToDate: number;
  deliveredCumulativeToDate: number;
} | null {
  const dates = enumerateYmd(campaign.startDate, campaign.endDate);
  const n = dates.length;
  if (n === 0) return null;

  const today = localTodayYmd();
  const deliveredThrough = today < campaign.startDate ? '' : (today > campaign.endDate ? campaign.endDate : today);
  if (!deliveredThrough) return null;

  const lastIdx = dates.findIndex(d => d > deliveredThrough);
  const lastDeliveredIdx = lastIdx === -1 ? n - 1 : lastIdx - 1;
  if (lastDeliveredIdx < 0) return null;

  const E = plannedEstimatedViewsForCampaign(campaign);
  const h = hashSeed(campaign.id);
  const rF = 0.9 + (h % 2000) / 10_000;

  const plannedCumulativeToDate = plannedLinearCumulativeThroughDayIndex(lastDeliveredIdx, n, E);
  const frac = n === 1 ? 1 : (lastDeliveredIdx + 1) / n;
  const deliveredCumulativeToDate = Math.round(E * rF * smoothstep01(frac));

  const ratio = plannedCumulativeToDate > 0 ? deliveredCumulativeToDate / plannedCumulativeToDate : 1;
  return { ratio, plannedCumulativeToDate, deliveredCumulativeToDate };
}

export function deliveryStatusTooltip(campaign: CampaignItem): string {
  const snap = deliverySnapshot(campaign);
  const E = plannedEstimatedViewsForCampaign(campaign);
  if (!snap) return 'Delivery (mock): no elapsed days yet in this campaign.';
  const pct = (100 * snap.deliveredCumulativeToDate / Math.max(1, snap.plannedCumulativeToDate)).toFixed(0);
  return `Delivery (mock): ${formatViewsCompact(snap.deliveredCumulativeToDate)} delivered vs ${formatViewsCompact(snap.plannedCumulativeToDate)} planned to date (${pct}%). Total estimate ${formatViewsCompact(E)} (prototype).`;
}

/** Active campaign with at least one calendar day on or before today inside the flight window. */
export function showCampaignDeliveryBarLight(campaign: CampaignItem): boolean {
  if (campaign.status !== 'active') return false;
  return deliverySnapshot(campaign) != null;
}

/**
 * Cumulative estimated views (linear 0 → goal) across the campaign, plus mock cumulative
 * delivered only through today (future days have no delivered curve yet).
 */
export function buildPerformanceSeries(campaign: CampaignItem): PerformanceChartPoint[] {
  const dates = enumerateYmd(campaign.startDate, campaign.endDate);
  const n = dates.length;
  if (n === 0) return [];

  const E = plannedEstimatedViewsForCampaign(campaign);
  const h = hashSeed(campaign.id);
  const rF = 0.9 + (h % 2000) / 10_000;
  const today = localTodayYmd();
  const deliveredThrough = today < campaign.startDate ? '' : (today > campaign.endDate ? campaign.endDate : today);

  const lastIdx = deliveredThrough ? dates.findIndex(d => d > deliveredThrough) : -1;
  const lastDeliveredIdx = lastIdx === -1 ? (deliveredThrough ? n - 1 : -1) : lastIdx - 1;

  const cumActual: number[] = [];
  for (let i = 0; i < n; i++) {
    const frac = n === 1 ? 1 : (i + 1) / n;
    cumActual.push(Math.round(E * rF * smoothstep01(frac)));
  }

  if (n === 1) {
    const del = lastDeliveredIdx >= 0 ? cumActual[0] : null;
    return [
      { date: dates[0], estimatedCumulative: 0, deliveredCumulative: 0 },
      { date: dates[0], estimatedCumulative: E, deliveredCumulative: del },
    ];
  }

  const pts: PerformanceChartPoint[] = [];
  pts.push({
    date: dates[0],
    estimatedCumulative: 0,
    deliveredCumulative: 0,
  });

  for (let i = 0; i < n; i++) {
    const estimatedCumulative = i === n - 1 ? E : Math.round((E * (i + 1)) / n);
    let deliveredCumulative: number | null = null;
    if (i <= lastDeliveredIdx && lastDeliveredIdx >= 0) {
      deliveredCumulative = cumActual[i];
    }
    pts.push({
      date: dates[i],
      estimatedCumulative,
      deliveredCumulative,
    });
  }

  return pts;
}

export function campaignHasPerformanceChart(campaign: CampaignItem): boolean {
  return buildPerformanceSeries(campaign).length > 0;
}

export function formatViewsCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toLocaleString('nb-NO');
}
