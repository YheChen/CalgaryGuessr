/**
 * Calgary-timezone date helpers.
 *
 * Calgary is America/Edmonton (Mountain Time), NOT America/Toronto. Everything
 * day-shaped in the app agrees on this one boundary, so the daily challenge and
 * the play streak can never disagree about when today ended.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * Today's calendar day in Calgary as "YYYY-MM-DD".
 *
 * en-CA formats as YYYY-MM-DD already. `now` is injectable for deterministic
 * tests.
 */
export function calgaryDateKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** UTC midnight of a "YYYY-MM-DD" key, for comparing days without drift. */
export function dateKeyToUtc(key: string): number | null {
  const parts = key.split("-").map(Number);
  const [year, month, day] = parts;
  if (
    parts.length !== 3 ||
    !year ||
    !month ||
    !day ||
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  return Date.UTC(year, month - 1, day);
}

/** Whole days from `fromKey` to `toKey`; null when either key is unparseable. */
export function daysBetweenKeys(fromKey: string, toKey: string): number | null {
  const from = dateKeyToUtc(fromKey);
  const to = dateKeyToUtc(toKey);
  if (from === null || to === null) {
    return null;
  }
  return Math.round((to - from) / MS_PER_DAY);
}

/**
 * Format a "YYYY-MM-DD" key for display without going through Date, which
 * would parse it as UTC midnight and shift the day in a negative-offset zone
 * like Calgary's.
 */
export function formatDayLabel(value: string): string {
  const [, month, day] = value.split("-");
  const monthLabel = MONTHS[Number(month) - 1];
  if (!monthLabel || !day) {
    return value;
  }
  return `${monthLabel} ${Number(day)}`;
}
