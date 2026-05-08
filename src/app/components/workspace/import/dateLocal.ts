/** Calendar YYYY-MM-DD in local timezone (avoids UTC shift from toISOString). */
export function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parse a date string or datetime into local calendar YYYY-MM-DD.
 * - Pure `YYYY-MM-DD` is returned as-is (calendar date, no shift).
 * - Other parsable strings use the local calendar day of the parsed instant.
 */
export function parseFlexibleToLocalYmd(s: string, fallbackYmd: string): string {
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return fallbackYmd;
  return formatLocalYmd(d);
}

export function localTodayYmd(): string {
  return formatLocalYmd(new Date());
}

/** Monday `YYYY-MM-DD` (local calendar) for the week containing `ymd`. */
export function mondayYmdForLocalWeekContaining(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00');
  const jsDay = d.getDay(); // 0 Sun … 6 Sat
  const delta = jsDay === 0 ? -6 : 1 - jsDay;
  d.setDate(d.getDate() + delta);
  return formatLocalYmd(d);
}
