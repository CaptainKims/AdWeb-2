import type { FlightItem } from './types';
import { ordToYmd, ymdToOrd } from './timelineDateHierarchy';

/** Inclusive calendar ranges overlap iff they share at least one day. */
export function rangesOverlapInclusive(aS: number, aE: number, bS: number, bE: number): boolean {
  return aS <= bE && bS <= aE;
}

function clampOrd(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Trim flight G [gs,ge] so it does not overlap active [as,ae]. Ordinals are inclusive day indices.
 * When both ends remain, keeps the longer contiguous segment.
 */
function trimNonActiveAgainstActive(
  gs: number,
  ge: number,
  as: number,
  ae: number,
  olLo: number,
  olHi: number,
): { s: number; e: number } {
  if (!rangesOverlapInclusive(gs, ge, as, ae)) {
    return {
      s: clampOrd(gs, olLo, olHi),
      e: clampOrd(ge, olLo, olHi),
    };
  }

  const leftEnd = as - 1;
  const rightStart = ae + 1;
  const leftLen = leftEnd >= gs ? leftEnd - gs + 1 : 0;
  const rightLen = ge >= rightStart ? ge - rightStart + 1 : 0;

  let pick: { s: number; e: number } | null = null;
  if (leftLen >= 1 && rightLen >= 1) {
    pick = leftLen >= rightLen ? { s: gs, e: leftEnd } : { s: rightStart, e: ge };
  } else if (leftLen >= 1) {
    pick = { s: gs, e: leftEnd };
  } else if (rightLen >= 1) {
    pick = { s: rightStart, e: ge };
  }

  if (pick) {
    return {
      s: clampOrd(pick.s, olLo, olHi),
      e: clampOrd(pick.e, olLo, olHi),
    };
  }

  // Sub-range of active: park one day outside active, inside [olLo, olHi].
  if (as - 1 >= olLo && as - 1 <= olHi && !rangesOverlapInclusive(as - 1, as - 1, as, ae)) {
    return { s: as - 1, e: as - 1 };
  }
  if (ae + 1 >= olLo && ae + 1 <= olHi && !rangesOverlapInclusive(ae + 1, ae + 1, as, ae)) {
    return { s: ae + 1, e: ae + 1 };
  }
  for (let d = olLo; d <= olHi; d++) {
    if (!rangesOverlapInclusive(d, d, as, ae)) return { s: d, e: d };
  }
  return { s: olLo, e: olLo };
}

function workingHullOrd(olStart: string, olEnd: string, flights: FlightItem[], as: number, ae: number): { lo: number; hi: number } {
  let lo = ymdToOrd(olStart);
  let hi = ymdToOrd(olEnd);
  lo = Math.min(lo, as, ae);
  hi = Math.max(hi, as, ae);
  for (const f of flights) {
    lo = Math.min(lo, ymdToOrd(f.startDate));
    hi = Math.max(hi, ymdToOrd(f.endDate));
  }
  return { lo, hi };
}

/**
 * Apply the dragged/edited flight's new range and shorten sibling flights in the same order line
 * so no two flights share a day. Siblings are trimmed against the active range, then packed
 * left-to-right by start date to remove residual overlaps.
 */
export function resolveFlightsNoOverlapForActiveChange(
  flights: FlightItem[],
  activeId: string,
  newStart: string,
  newEnd: string,
  orderLineStart: string,
  orderLineEnd: string,
): FlightItem[] {
  if (!flights.some(f => f.id === activeId)) return flights;

  let as = ymdToOrd(newStart);
  let ae = ymdToOrd(newEnd);
  if (as > ae) [as, ae] = [ae, as];

  const hull = workingHullOrd(orderLineStart, orderLineEnd, flights, as, ae);
  let olLo = hull.lo;
  let olHi = hull.hi;
  as = clampOrd(as, olLo, olHi);
  ae = clampOrd(ae, olLo, olHi);
  if (ae < as) ae = as;

  let next: FlightItem[] = flights.map(f =>
    f.id === activeId ? { ...f, startDate: ordToYmd(as), endDate: ordToYmd(ae) } : f,
  );

  const runTrimVsActive = (): void => {
    next = next.map(f => {
      if (f.id === activeId) return f;
      const gs = ymdToOrd(f.startDate);
      const ge = ymdToOrd(f.endDate);
      const t = trimNonActiveAgainstActive(gs, ge, as, ae, olLo, olHi);
      let s = t.s;
      let e = t.e;
      if (e < s) e = s;
      return { ...f, startDate: ordToYmd(s), endDate: ordToYmd(e) };
    });
  };

  const packNonActive = (): void => {
    const idxs = next.map((_, i) => i).filter(i => next[i]!.id !== activeId);
    idxs.sort((ia, ib) => ymdToOrd(next[ia]!.startDate) - ymdToOrd(next[ib]!.startDate));

    for (let k = 1; k < idxs.length; k++) {
      const ia = idxs[k - 1]!;
      const ib = idxs[k]!;
      let aS = ymdToOrd(next[ia]!.startDate);
      let aE = ymdToOrd(next[ia]!.endDate);
      const bS = ymdToOrd(next[ib]!.startDate);
      let bE = ymdToOrd(next[ib]!.endDate);
      if (!rangesOverlapInclusive(aS, aE, bS, bE)) continue;
      const newAE = bS - 1;
      if (newAE >= aS) {
        next[ia] = { ...next[ia]!, endDate: ordToYmd(newAE) };
      } else {
        const nbs = aE + 1;
        const ns = clampOrd(Math.max(nbs, bS), olLo, olHi);
        let ne = Math.min(olHi, Math.max(ns, bE));
        next[ib] = { ...next[ib]!, startDate: ordToYmd(ns), endDate: ordToYmd(ne) };
      }
    }
  };

  for (let pass = 0; pass < 12; pass++) {
    runTrimVsActive();
    packNonActive();
    let changed = false;
    for (const f of next) {
      if (f.id === activeId) continue;
      const gs = ymdToOrd(f.startDate);
      const ge = ymdToOrd(f.endDate);
      if (rangesOverlapInclusive(gs, ge, as, ae)) {
        changed = true;
        break;
      }
    }
    const idxs = next.map((_, i) => i).filter(i => next[i]!.id !== activeId);
    idxs.sort((ia, ib) => ymdToOrd(next[ia]!.startDate) - ymdToOrd(next[ib]!.startDate));
    for (let k = 1; k < idxs.length; k++) {
      const ia = idxs[k - 1]!;
      const ib = idxs[k]!;
      const aS = ymdToOrd(next[ia]!.startDate);
      const aE = ymdToOrd(next[ia]!.endDate);
      const bS = ymdToOrd(next[ib]!.startDate);
      const bE = ymdToOrd(next[ib]!.endDate);
      if (rangesOverlapInclusive(aS, aE, bS, bE)) {
        changed = true;
        break;
      }
    }
    if (!changed) break;
  }

  return next;
}

/**
 * Split [orderLineStart, orderLineEnd] into contiguous non-overlapping ranges (flight array order).
 * Uses greedy widths so the last flight absorbs any remainder days.
 */
export function distributeFlightRangesInOrderLine(
  flights: FlightItem[],
  orderLineStart: string,
  orderLineEnd: string,
): FlightItem[] {
  const n = flights.length;
  if (n === 0) return flights;
  const lo = ymdToOrd(orderLineStart);
  const hi = ymdToOrd(orderLineEnd);
  if (hi < lo) {
    const y = orderLineStart;
    return flights.map(f => ({ ...f, startDate: y, endDate: y }));
  }

  let cur = lo;
  return flights.map((f, i) => {
    const rest = n - i;
    const daysLeft = hi - cur + 1;
    if (rest === 1) {
      return { ...f, startDate: ordToYmd(cur), endDate: ordToYmd(hi) };
    }
    const len = Math.max(1, Math.floor(daysLeft / rest));
    const e = Math.min(hi, cur + len - 1);
    const seg = { ...f, startDate: ordToYmd(cur), endDate: ordToYmd(e) };
    cur = e + 1;
    return seg;
  });
}

/** True if any two flights share at least one calendar day (ignores invalid date strings). */
export function flightsHaveInclusiveOverlap(flights: FlightItem[]): boolean {
  const ranges = flights
    .map(f => {
      const a = ymdToOrd(f.startDate);
      const b = ymdToOrd(f.endDate);
      return Number.isFinite(a) && Number.isFinite(b) ? { lo: a, hi: b } : null;
    })
    .filter((x): x is { lo: number; hi: number } => x != null);
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      if (rangesOverlapInclusive(ranges[i]!.lo, ranges[i]!.hi, ranges[j]!.lo, ranges[j]!.hi)) return true;
    }
  }
  return false;
}

/**
 * Pack flights in **array order** into [orderLineStart, orderLineEnd] with no inclusive overlap.
 * Preserves requested duration when possible; shortens earlier flights to leave at least one day per remaining flight.
 */
export function packFlightsSequentialNoOverlap(
  flights: FlightItem[],
  orderLineStart: string,
  orderLineEnd: string,
): FlightItem[] {
  const lo = ymdToOrd(orderLineStart);
  const hi = ymdToOrd(orderLineEnd);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo || flights.length === 0) return flights;

  const n = flights.length;
  let cur = lo;

  return flights.map((f, i) => {
    const rest = n - i;
    const remainingDays = hi - Math.max(cur, lo) + 1;
    const fs = ymdToOrd(f.startDate);
    const fe = ymdToOrd(f.endDate);
    const wantLen = Number.isFinite(fs) && Number.isFinite(fe) ? Math.max(1, fe - fs + 1) : 1;

    const reserve = rest - 1;
    let maxLen = remainingDays - reserve;
    if (maxLen < 1) maxLen = remainingDays >= 1 ? 1 : 0;
    maxLen = Math.max(maxLen, 0);

    let len = wantLen;
    if (maxLen > 0) len = Math.min(wantLen, maxLen);
    len = Math.min(len, remainingDays);
    len = Math.max(1, len);

    if (cur > hi || remainingDays < 1) {
      const y = ordToYmd(hi);
      return { ...f, startDate: y, endDate: y };
    }

    let endOrd = cur + len - 1;
    if (endOrd > hi) endOrd = hi;
    if (endOrd < cur) endOrd = cur;

    const seg = { ...f, startDate: ordToYmd(cur), endDate: ordToYmd(endOrd) };
    cur = endOrd + 1;
    return seg;
  });
}
