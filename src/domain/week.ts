// Pure week arithmetic for the weekly chores view.
//
// The family week runs SUNDAY → SATURDAY (02-ux-ui-guidelines.md).
//
// Every date here is an ISO `YYYY-MM-DD` day key, never a timestamp, and every
// computation runs on the UTC calendar. That is deliberate and is the WP0
// regression: occurrence dates were once derived from local midnight and then
// read as a UTC ISO slice, so a chore "on Tuesday" drifted by a day outside UTC
// (ADR-006, 08-rotation-engine.md). Day keys must not depend on where the phone
// happens to be.
//
// No React, no I/O, no Hebrew — 02-ux-ui-guidelines.md forbids Hebrew inside
// domain logic, so day NAMES are supplied by the locale layer, not by this file.

/** 0 = Sunday … 6 = Saturday, matching Date#getUTCDay. */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** An ISO calendar day, `YYYY-MM-DD`. */
export type DayKey = string;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Format a Date as a UTC day key. Never uses local time. */
export function toDayKey(date: Date): DayKey {
  const y = String(date.getUTCFullYear()).padStart(4, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parse a day key to the UTC midnight instant it denotes.
 *
 * `Date.UTC` maps years 0–99 to 1900–1999, so a two-digit year would silently
 * become a twentieth-century one. Real occurrence dates are never that old, but
 * a parser that quietly returns the wrong century is worse than one that costs
 * an extra line, so the year is set explicitly.
 */
export function fromDayKey(key: DayKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(2000, (m ?? 1) - 1, d ?? 1));
  date.setUTCFullYear(y ?? 1970);
  return date;
}

export function isDayKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(fromDayKey(value).getTime());
}

/** The weekday index of a day key, on the UTC calendar. */
export function weekdayOf(key: DayKey): WeekdayIndex {
  return fromDayKey(key).getUTCDay() as WeekdayIndex;
}

/** Shift a day key by whole days. */
export function addDays(key: DayKey, days: number): DayKey {
  return toDayKey(new Date(fromDayKey(key).getTime() + days * MS_PER_DAY));
}

/**
 * The Sunday that starts the family week containing `key`.
 * A key that is already a Sunday is its own week start.
 */
export function startOfWeek(key: DayKey): DayKey {
  return addDays(key, -weekdayOf(key));
}

/** The seven day keys of the family week containing `key`, Sunday first. */
export function weekDayKeys(key: DayKey): DayKey[] {
  const sunday = startOfWeek(key);
  return Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
}

/**
 * The inclusive `[from, to]` day-key range of the week containing `key`.
 * Used to bound the occurrence query so a week fetch is one round trip.
 */
export function weekRange(key: DayKey): { from: DayKey; to: DayKey } {
  const days = weekDayKeys(key);
  return { from: days[0]!, to: days[6]! };
}

/**
 * "Today" as a day key.
 *
 * The household's calendar day is what matters, not the device's, so this takes
 * the instant explicitly and reads it on the UTC calendar — the same rule the
 * occurrence dates were stored under.
 */
export function todayKey(now: Date = new Date()): DayKey {
  return toDayKey(now);
}

export function isSameDay(a: DayKey, b: DayKey): boolean {
  return a === b;
}

/** Whether `key` falls inside the week containing `reference`. */
export function isInWeekOf(key: DayKey, reference: DayKey): boolean {
  const { from, to } = weekRange(reference);
  return key >= from && key <= to;
}

export interface WeekDay<T> {
  dayKey: DayKey;
  weekday: WeekdayIndex;
  isToday: boolean;
  items: T[];
}

/**
 * Bucket dated items into the seven days of the week containing `reference`.
 *
 * Always returns seven days, including empty ones: a day with no chore is a
 * meaningful, designed empty state, not a row to omit.
 */
export function groupByWeekDay<T>(
  items: ReadonlyArray<T>,
  getDayKey: (item: T) => DayKey,
  reference: DayKey,
  today: DayKey = reference,
): WeekDay<T>[] {
  const buckets = new Map<DayKey, T[]>();
  for (const dayKey of weekDayKeys(reference)) buckets.set(dayKey, []);
  for (const item of items) {
    const bucket = buckets.get(getDayKey(item));
    // Anything outside the requested week is ignored rather than folded into an
    // adjacent day, which would silently misreport when a chore is due.
    if (bucket) bucket.push(item);
  }
  return weekDayKeys(reference).map((dayKey) => ({
    dayKey,
    weekday: weekdayOf(dayKey),
    isToday: dayKey === today,
    items: buckets.get(dayKey) ?? [],
  }));
}
