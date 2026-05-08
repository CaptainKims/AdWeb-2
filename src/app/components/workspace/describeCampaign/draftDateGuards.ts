import type { ImportCampaignDraft } from '../import/importDto';

/** Compare YYYY-MM-DD strings lexicographically (calendar order). Returns true iff a < b when both parse. */
function isoYmdBefore(a: string, b: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return false;
  return a < b;
}

/** All campaign/order line/flight start/end ISO strings present in an import-ready draft (non-normalized blanks skipped). */
export function collectCampaignIsoDates(d: ImportCampaignDraft): string[] {
  const dates: string[] = [];
  if (d.startDate) dates.push(d.startDate);
  if (d.endDate) dates.push(d.endDate);
  for (const ol of d.orderLines) {
    if (ol.startDate) dates.push(ol.startDate);
    if (ol.endDate) dates.push(ol.endDate);
    for (const fl of ol.flights || []) {
      if (fl.startDate) dates.push(fl.startDate);
      if (fl.endDate) dates.push(fl.endDate);
    }
  }
  return dates.filter(t => /^\d{4}-\d{2}-\d{2}$/.test(t));
}

/** Any calendar date strictly before local `todayYmd`. */
export function draftHasAnyDateStrictlyBeforeToday(d: ImportCampaignDraft, todayYmd: string): boolean {
  return collectCampaignIsoDates(d).some(ymd => isoYmdBefore(ymd, todayYmd));
}
