import type { CampaignItem, CampaignStatus } from './types';

const STATUSES: CampaignStatus[] = ['draft', 'booked', 'active', 'completed', 'paused'];

export function normalizeCampaignStatus(value: unknown): CampaignStatus {
  return typeof value === 'string' && (STATUSES as string[]).includes(value)
    ? (value as CampaignStatus)
    : 'draft';
}

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Draft',
  booked: 'Booked',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
};

/** Norwegian labels for planner / timeline UI */
export const CAMPAIGN_STATUS_LABELS_NB: Record<CampaignStatus, string> = {
  draft: 'Utkast',
  booked: 'Booket',
  active: 'Aktiv',
  paused: 'Pauset',
  completed: 'Fullført',
};

export type CampaignBarChip = {
  key: string;
  label: string;
  /** Lifecycle chip vs insight */
  kind: 'status' | 'warning' | 'info';
};

/**
 * Auto transitions (call periodically with today's local YYYY-MM-DD):
 * - Past end date → `completed` if was active, booked, or paused (not draft).
 * - Before start while `active` → `booked` (active is only entered from booked at/after start).
 * - On/after start and on/before end while `booked` → `active`.
 */
export function applyCampaignAutoStatus(campaign: CampaignItem, todayYmd: string): CampaignItem {
  const { startDate, endDate, status } = campaign;

  if (todayYmd > endDate) {
    if (status === 'active' || status === 'booked' || status === 'paused') {
      return { ...campaign, status: 'completed' };
    }
    return campaign;
  }

  if (todayYmd < startDate && status === 'active') {
    return { ...campaign, status: 'booked' };
  }

  if (todayYmd >= startDate && todayYmd <= endDate && status === 'booked') {
    return { ...campaign, status: 'active' };
  }

  return campaign;
}

/** Chips for the campaign timeline bar: one status chip + optional insight chips (always evaluated). */
export function getCampaignBarChips(campaign: CampaignItem): CampaignBarChip[] {
  const chips: CampaignBarChip[] = [
    {
      key: `status-${campaign.status}`,
      label: CAMPAIGN_STATUS_LABELS[campaign.status],
      kind: 'status',
    },
  ];

  if (campaign.orderLines.length === 0) {
    chips.push({ key: 'missing-ol', label: 'Missing order lines', kind: 'warning' });
  }

  let missingFlights = false;
  let missingCreative = false;
  for (const ol of campaign.orderLines) {
    if (ol.flights.length === 0) {
      missingFlights = true;
    }
    for (const fl of ol.flights) {
      if (!fl.creative) missingCreative = true;
    }
  }
  if (missingFlights) {
    chips.push({ key: 'missing-flights', label: 'Missing flights', kind: 'warning' });
  }
  if (missingCreative) {
    chips.push({ key: 'missing-creative', label: 'Missing creative', kind: 'warning' });
  }

  if (campaign.orderLines.length > 0) {
    const w = campaign.orderLines.reduce((s, ol) => s + (ol.budgetWeight || 0), 0);
    if (w !== 100) {
      chips.push({ key: 'ol-weights', label: 'Order lines ≠ 100%', kind: 'info' });
    }
  }

  if (campaign.budget.total > 0 && campaign.orderLines.length > 0) {
    for (const ol of campaign.orderLines) {
      if (ol.flights.length <= 1) continue;
      const fw = ol.flights.reduce((s, f) => s + (f.budgetWeight || 0), 0);
      if (fw !== 100) {
        chips.push({ key: 'fl-weights', label: 'Flight weights ≠ 100%', kind: 'info' });
        break;
      }
    }
  }

  if (campaign.budget.total === 0 && campaign.orderLines.length > 0) {
    chips.push({ key: 'no-budget', label: 'No campaign budget', kind: 'info' });
  }

  return chips;
}
