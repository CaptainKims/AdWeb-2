import type { CampaignItem, FlightItem, OrderLineItem } from './types';

/**
 * Ordinal day from Unix epoch (UTC midnight), for civil YYYY-MM-DD strings.
 * Must match `ordToYmd` (inverse). Do not use noon + round — that maps every date +1 day.
 */
export function ymdToOrd(ymd: string): number {
  const t = Date.parse(`${ymd}T00:00:00Z`);
  if (Number.isNaN(t)) return NaN;
  return Math.floor(t / 86400000);
}

export function ordToYmd(ord: number): string {
  const d = new Date(ord * 86400000);
  return d.toISOString().slice(0, 10);
}

function minOrd(a: number, b: number): number {
  return Math.min(a, b);
}
function maxOrd(a: number, b: number): number {
  return Math.max(a, b);
}

/** Min/max ordinal over all flights and order lines (descendants only). */
export function descendantDateSpan(c: CampaignItem): { lo: number; hi: number } | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (const ol of c.orderLines) {
    const ols = ymdToOrd(ol.startDate);
    const ole = ymdToOrd(ol.endDate);
    if (Number.isFinite(ols)) lo = minOrd(lo, ols);
    if (Number.isFinite(ole)) hi = maxOrd(hi, ole);
    for (const fl of ol.flights) {
      const fls = ymdToOrd(fl.startDate);
      const fle = ymdToOrd(fl.endDate);
      if (Number.isFinite(fls)) lo = minOrd(lo, fls);
      if (Number.isFinite(fle)) hi = maxOrd(hi, fle);
    }
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return { lo, hi };
}

function mapLinear(d: string, oldLo: number, oldHi: number, newLo: number, newHi: number): string {
  const di = ymdToOrd(d);
  const span = oldHi - oldLo;
  if (span <= 0) return ordToYmd(newLo);
  const t = (di - oldLo) / span;
  const ni = Math.round(newLo + t * (newHi - newLo));
  return ordToYmd(Math.min(newHi, Math.max(newLo, ni)));
}

/** OL dates = exact hull of its flights (no extra slack on the OL bar). */
export function expandOrderLineToFlights(ol: OrderLineItem): OrderLineItem {
  if (ol.flights.length === 0) return ol;
  let lo = Infinity;
  let hi = -Infinity;
  for (const f of ol.flights) {
    const a = ymdToOrd(f.startDate);
    const b = ymdToOrd(f.endDate);
    if (Number.isFinite(a)) lo = minOrd(lo, a);
    if (Number.isFinite(b)) hi = maxOrd(hi, b);
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return ol;
  return { ...ol, startDate: ordToYmd(lo), endDate: ordToYmd(hi) };
}

/** Campaign dates = exact hull of all OLs (each OL already fitted to its flights). */
export function expandCampaignToOrderLines(c: CampaignItem): CampaignItem {
  if (c.orderLines.length === 0) return c;
  const orderLines = c.orderLines.map(ol => expandOrderLineToFlights(ol));
  let lo = Infinity;
  let hi = -Infinity;
  for (const ol of orderLines) {
    const a = ymdToOrd(ol.startDate);
    const b = ymdToOrd(ol.endDate);
    if (Number.isFinite(a)) lo = minOrd(lo, a);
    if (Number.isFinite(b)) hi = maxOrd(hi, b);
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { ...c, orderLines };
  return { ...c, startDate: ordToYmd(lo), endDate: ordToYmd(hi), orderLines };
}

/**
 * Apply new campaign [newStart, newEnd].
 * If the new window is shorter than descendant content span, scale all flight dates
 * (then OLs from flights, then campaign bounds) linearly into the new window.
 * Otherwise clamp children into the new window (existing behaviour).
 */
export function applyCampaignDateBounds(c: CampaignItem, newStart: string, newEnd: string): CampaignItem {
  const ns = ymdToOrd(newStart);
  const ne = ymdToOrd(newEnd);
  if (ns > ne) return { ...c, startDate: newEnd, endDate: newStart };

  const span = descendantDateSpan(c);
  if (!span) {
    return { ...c, startDate: newStart, endDate: newEnd };
  }
  const { lo, hi } = span;
  const contentW = hi - lo;
  const newW = ne - ns;

  if (contentW <= 0) {
    return { ...c, startDate: newStart, endDate: newEnd };
  }

  if (newW >= contentW) {
    const orderLines = c.orderLines.map(ol => {
      const olClamped = clampOlToParent(ol, newStart, newEnd);
      const flights = olClamped.flights.map(f => ({
        ...f,
        ...clampFlightToParent(f, olClamped.startDate, olClamped.endDate),
      }));
      let ol2 = expandOrderLineToFlights({ ...olClamped, flights });
      ol2 = clampOlToParent(ol2, newStart, newEnd);
      const flights2 = ol2.flights.map(f => ({
        ...f,
        ...clampFlightToParent(f, ol2.startDate, ol2.endDate),
      }));
      return expandOrderLineToFlights({ ...ol2, flights: flights2 });
    });
    return { ...c, startDate: newStart, endDate: newEnd, orderLines };
  }

  const orderLines = c.orderLines.map(ol => ({
    ...ol,
    startDate: mapLinear(ol.startDate, lo, hi, ns, ne),
    endDate: mapLinear(ol.endDate, lo, hi, ns, ne),
    flights: ol.flights.map(f => ({
      ...f,
      startDate: mapLinear(f.startDate, lo, hi, ns, ne),
      endDate: mapLinear(f.endDate, lo, hi, ns, ne),
    })),
  }));

  let next: CampaignItem = {
    ...c,
    startDate: newStart,
    endDate: newEnd,
    orderLines: orderLines.map(expandOrderLineToFlights),
  };
  return next;
}

export function clampDateRangeToParent(start: string, end: string, pStart: string, pEnd: string): { startDate: string; endDate: string } {
  const ps = ymdToOrd(pStart);
  const pe = ymdToOrd(pEnd);
  let s = ymdToOrd(start);
  let e = ymdToOrd(end);
  if (s < ps) s = ps;
  if (e > pe) e = pe;
  if (s > e) e = s;
  return { startDate: ordToYmd(s), endDate: ordToYmd(e) };
}

function clampFlightToParent(
  f: FlightItem,
  pStart: string,
  pEnd: string,
): { startDate: string; endDate: string } {
  return clampDateRangeToParent(f.startDate, f.endDate, pStart, pEnd);
}

function clampOlToParent(ol: OrderLineItem, pStart: string, pEnd: string): OrderLineItem {
  const ps = ymdToOrd(pStart);
  const pe = ymdToOrd(pEnd);
  let s = ymdToOrd(ol.startDate);
  let e = ymdToOrd(ol.endDate);
  if (s < ps) s = ps;
  if (e > pe) e = pe;
  if (s > e) e = s;
  return { ...ol, startDate: ordToYmd(s), endDate: ordToYmd(e) };
}

/** After flight edits: clamp flight to OL, expand OL to flights, expand campaign. */
export function normalizeAfterFlightChange(c: CampaignItem, olId: string): CampaignItem {
  const orderLines = c.orderLines.map(ol => {
    if (ol.id !== olId) return ol;
    const flights = ol.flights.map(f => ({
      ...f,
      ...clampFlightToParent(f, ol.startDate, ol.endDate),
    }));
    return expandOrderLineToFlights({ ...ol, flights });
  });
  return expandCampaignToOrderLines({ ...c, orderLines });
}

/** After OL date edits: clamp flights, expand OL, expand campaign. */
export function normalizeAfterOrderLineDateChange(c: CampaignItem, olId: string): CampaignItem {
  const orderLines = c.orderLines.map(ol => {
    if (ol.id !== olId) return ol;
    const flights = ol.flights.map(f => ({
      ...f,
      ...clampFlightToParent(f, ol.startDate, ol.endDate),
    }));
    return expandOrderLineToFlights({ ...ol, flights });
  });
  return expandCampaignToOrderLines({ ...c, orderLines });
}

/** User-edited OL range is merged with flight span so OL always covers all flights. */
export function mergeOrderLineUserDatesWithFlights(ol: OrderLineItem, userS: string, userE: string): OrderLineItem {
  let lo = ymdToOrd(userS);
  let hi = ymdToOrd(userE);
  for (const f of ol.flights) {
    lo = minOrd(lo, ymdToOrd(f.startDate));
    hi = maxOrd(hi, ymdToOrd(f.endDate));
  }
  const startDate = ordToYmd(lo);
  const endDate = ordToYmd(hi);
  const flights = ol.flights.map(f => ({
    ...f,
    ...clampFlightToParent(f, startDate, endDate),
  }));
  return expandOrderLineToFlights({ ...ol, startDate, endDate, flights });
}

/** True when campaign [start,end] fully contains all OL and flight dates. */
export function campaignDatesCoverDescendants(c: CampaignItem): boolean {
  const span = descendantDateSpan(c);
  if (!span) return true;
  const cs = ymdToOrd(c.startDate);
  const ce = ymdToOrd(c.endDate);
  return cs <= span.lo && ce >= span.hi;
}

/** True when OL dates fully contain all of its flights. */
export function orderLineCoversFlights(ol: OrderLineItem): boolean {
  if (ol.flights.length === 0) return true;
  const ex = expandOrderLineToFlights(ol);
  return ex.startDate === ol.startDate && ex.endDate === ol.endDate;
}

export function needsDateHarmonize(c: CampaignItem): boolean {
  if (!campaignDatesCoverDescendants(c)) return true;
  if (c.orderLines.some(ol => !orderLineCoversFlights(ol))) return true;
  const span = descendantDateSpan(c);
  if (!span) return false;
  const cs = ymdToOrd(c.startDate);
  const ce = ymdToOrd(c.endDate);
  /** Campaign must match the descendant hull exactly (no bar past the last child, no gap before the first). */
  if (cs !== span.lo || ce !== span.hi) return true;
  return false;
}

/** Expand each OL to its flight span, then expand campaign to cover all OLs. */
export function harmonizeCampaignDates(c: CampaignItem): CampaignItem {
  const orderLines = c.orderLines.map(expandOrderLineToFlights);
  return expandCampaignToOrderLines({ ...c, orderLines });
}
