import type { CampaignItem, FlightItem, OrderLineItem } from './types';
import { LIST_NOK_PER_VIEW, PROTOTYPE_WEEKLY_VIEW_INVENTORY } from './inventoryPolicy';
import { mondayYmdForLocalWeekContaining } from './import/dateLocal';
import { ymdToOrd, ordToYmd } from './timelineDateHierarchy';

export function countCampaignDaysInclusive(startYmd: string, endYmd: string): number {
  const a = ymdToOrd(startYmd);
  const b = ymdToOrd(endYmd);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 1;
  return b - a + 1;
}

function enumerateDays(startYmd: string, endYmd: string): string[] {
  const lo = ymdToOrd(startYmd);
  const hi = ymdToOrd(endYmd);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) return [];
  const out: string[] = [];
  for (let o = lo; o <= hi; o++) out.push(ordToYmd(o));
  return out;
}

function overlapDaysInWeekMondayKey(
  campaignStart: string,
  campaignEnd: string,
  weekMondayKey: string,
): number {
  let n = 0;
  for (const d of enumerateDays(campaignStart, campaignEnd)) {
    if (mondayYmdForLocalWeekContaining(d) === weekMondayKey) n++;
  }
  return n;
}

function horizonWeekMondayKeys(campaigns: CampaignItem[]): string[] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const c of campaigns) {
    const a = ymdToOrd(c.startDate);
    const b = ymdToOrd(c.endDate);
    if (Number.isFinite(a)) lo = Math.min(lo, a);
    if (Number.isFinite(b)) hi = Math.max(hi, b);
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [];
  const keys = new Set<string>();
  for (let o = lo; o <= hi; o++) {
    const ymd = ordToYmd(o);
    keys.add(mondayYmdForLocalWeekContaining(ymd));
  }
  return [...keys];
}

/** Customer pays `LIST_NOK_PER_VIEW × (1 − discount/100)` per view (prototype). */
export function effectiveNokPerViewAfterDiscount(discountPercent: number): number {
  const d = Math.min(100, Math.max(0, discountPercent));
  return Math.max(0.01, LIST_NOK_PER_VIEW * (1 - d / 100));
}

/** Implied total views from a budget amount at the given discount (list 1 NOK = 1 view before discount). */
export function impliedViewsFromBudgetAmount(budget: number, discountPercent: number): number {
  return budget * (LIST_NOK_PER_VIEW / effectiveNokPerViewAfterDiscount(discountPercent));
}

export interface CampaignAskMeta {
  campaignId: string;
  userIntent: number;
  discountPercent: number;
  days: number;
  /** Implied total views from monetary intent at list pricing and discount. */
  totalImpliedViews: number;
}

export interface InventoryReconcileResult {
  campaigns: CampaignItem[];
  /** Minimum uniform scale applied to user-intent budgets (1 = no cut). */
  scaleApplied: number;
  /** True when any campaign’s budget.total changed from prior snapshot. */
  anyAdjustment: boolean;
}

/**
 * Uniform scale across all campaigns’ **user-intent** budgets so that for every calendar week,
 * sum of implied weekly view demand ≤ {@link PROTOTYPE_WEEKLY_VIEW_INVENTORY}.
 * Demand uses each campaign’s **discount** when mapping budget → views.
 */
export function reconcileCampaignBudgetsForInventory(campaigns: CampaignItem[]): InventoryReconcileResult {
  const weeklyCap = PROTOTYPE_WEEKLY_VIEW_INVENTORY;

  const meta: CampaignAskMeta[] = campaigns.map(c => {
    const userIntent = Math.max(0, c.budgetUserIntentTotal ?? c.budget.total);
    const days = Math.max(1, countCampaignDaysInclusive(c.startDate, c.endDate));
    const discountPercent = c.inventoryDiscountPercent ?? 0;
    const totalImpliedViews = Math.max(0, impliedViewsFromBudgetAmount(userIntent, discountPercent));
    return {
      campaignId: c.id,
      userIntent,
      discountPercent,
      days,
      totalImpliedViews,
    };
  });

  const weekKeys = horizonWeekMondayKeys(campaigns);

  let scale = 1;
  for (const weekMondayKey of weekKeys) {
    let sum = 0;
    for (let i = 0; i < campaigns.length; i++) {
      const c = campaigns[i]!;
      const m = meta[i]!;
      const overlap = overlapDaysInWeekMondayKey(c.startDate, c.endDate, weekMondayKey);
      if (overlap <= 0) continue;
      sum += (m.totalImpliedViews * overlap) / m.days;
    }
    if (sum > weeklyCap && sum > 0) scale = Math.min(scale, weeklyCap / sum);
  }

  const prevTotals = new Map(campaigns.map(c => [c.id, c.budget.total] as const));

  const next = campaigns.map((c, i) => {
    const m = meta[i]!;
    const userIntent = m.userIntent;
    const rawNext = Math.round(userIntent * scale);
    const newTotal = Math.max(0, rawNext);
    const note =
      newTotal < userIntent && userIntent > 0
        ? buildInventoryNote(userIntent, newTotal)
        : undefined;

    return {
      ...c,
      budgetUserIntentTotal: userIntent,
      budget: { ...c.budget, total: newTotal },
      inventoryLastNote: note,
    };
  });

  let anyAdjustment = false;
  for (const c of next) {
    if (prevTotals.get(c.id) !== c.budget.total) anyAdjustment = true;
  }

  return { campaigns: next, scaleApplied: scale, anyAdjustment };
}

function buildInventoryNote(intent: number, adjusted: number): string {
  if (adjusted >= intent) {
    return 'Budsjettet matcher tilgjengelig leveransekapasitet i denne perioden (prototype).';
  }
  return `Budsjettet er justert fra ${intent.toLocaleString('nb-NO')} kr til ${adjusted.toLocaleString('nb-NO')} kr da det overstiger tilgjengelige visninger.`;
}

/** Total estimated views from **actual** campaign budget after inventory (plan), respecting discount. */
export function estimatedCampaignViewsTotal(c: CampaignItem): number {
  const d = c.inventoryDiscountPercent ?? 0;
  return Math.max(0, Math.round(impliedViewsFromBudgetAmount(c.budget.total, d)));
}

export function estimatedOrderLineViews(camp: CampaignItem, ol: OrderLineItem): number {
  const campV = estimatedCampaignViewsTotal(camp);
  const w = ol.budgetWeight / 100;
  return Math.round(campV * w);
}

export function estimatedFlightViews(camp: CampaignItem, ol: OrderLineItem, fl: FlightItem): number {
  const olV = estimatedOrderLineViews(camp, ol);
  const w = fl.budgetWeight / 100;
  return Math.round(olV * w);
}

/** Migrate legacy campaigns: lock user intent to current total when missing; default discount 0. */
export function migrateBudgetUserIntent(campaigns: CampaignItem[]): CampaignItem[] {
  return campaigns.map(c => ({
    ...c,
    budgetUserIntentTotal: c.budgetUserIntentTotal ?? c.budget.total,
    inventoryDiscountPercent: c.inventoryDiscountPercent ?? 0,
  }));
}
