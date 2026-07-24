// Pure recurrence + soft-delete domain helpers.
// Prototype-only: covers the demo permutations we surface in UI, NOT a
// production RRULE engine. Deliberately narrow.

import type { TaskTemplate, TaskInstance } from "./task";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

/** ISO weekday: 0 = Sunday, 6 = Saturday (matches JS getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  /** Every N units. 1 = every day/week/month. */
  interval: number;
  /** Weekly only: days of week the occurrence lands on. */
  byWeekday?: ReadonlyArray<Weekday>;
  /** HH:mm local — used to stamp the scheduled time. */
  timeOfDay?: string;
  /** Optional hard end date (ISO). */
  endsOnIso?: string;
}

export type MissedAction = "nothing" | "skip" | "reschedule_next" | "escalate";

/** Anything with an optional soft-delete marker. */
export interface SoftDeletable {
  deletedAt?: string;
  deletedByMemberId?: string;
}

export function isSoftDeleted(x: SoftDeletable): boolean {
  return !!x.deletedAt;
}

/** Only owner / adult may restore in UI. */
export type ViewerRole = "owner" | "adult" | "child" | "guest";
export function canRestore(role: ViewerRole): boolean {
  return role === "owner" || role === "adult";
}

/**
 * Restore window shown in UI. Kept as pure derivation so tests can pin
 * "now". The prompt asks for at least 48h.
 */
export const RESTORE_WINDOW_HOURS = 48;
export function withinRestoreWindow(
  x: SoftDeletable,
  nowIso: string,
  hours = RESTORE_WINDOW_HOURS,
): boolean {
  if (!x.deletedAt) return false;
  const deleted = Date.parse(x.deletedAt);
  const now = Date.parse(nowIso);
  return now - deleted <= hours * 60 * 60 * 1000;
}

// -------- Human-readable rule (Hebrew) --------

const WEEKDAY_HE: Record<Weekday, string> = {
  0: "ראשון",
  1: "שני",
  2: "שלישי",
  3: "רביעי",
  4: "חמישי",
  5: "שישי",
  6: "שבת",
};

export function describeRule(rule: RecurrenceRule): string {
  const parts: string[] = [];
  const n = Math.max(1, rule.interval);
  if (rule.frequency === "daily") {
    parts.push(n === 1 ? "כל יום" : `כל ${n} ימים`);
  } else if (rule.frequency === "weekly") {
    const days = (rule.byWeekday ?? []).map((d) => WEEKDAY_HE[d]).join(", ");
    parts.push(
      n === 1
        ? days
          ? `כל שבוע בימי ${days}`
          : "כל שבוע"
        : days
          ? `כל ${n} שבועות בימי ${days}`
          : `כל ${n} שבועות`,
    );
  } else {
    parts.push(n === 1 ? "כל חודש" : `כל ${n} חודשים`);
  }
  if (rule.timeOfDay) parts.push(`בשעה ${rule.timeOfDay}`);
  if (rule.endsOnIso) parts.push(`עד ${rule.endsOnIso.slice(0, 10)}`);
  return parts.join(" · ");
}

// -------- Occurrence key + generator --------

/**
 * Canonical key preventing duplicate occurrences for the same template+time.
 * Uses ISO instant so DST changes don't collide.
 */
export function occurrenceKey(templateId: string, scheduledAtIso: string): string {
  return `${templateId}@${scheduledAtIso}`;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + n);
  return c;
}
function addMonths(d: Date, n: number): Date {
  const c = new Date(d);
  c.setUTCMonth(c.getUTCMonth() + n);
  return c;
}
function applyTime(d: Date, timeOfDay?: string): Date {
  if (!timeOfDay) return d;
  const [h, m] = timeOfDay.split(":").map((x) => Number(x));
  const c = new Date(d);
  c.setUTCHours(h ?? 0, m ?? 0, 0, 0);
  return c;
}

/**
 * Enumerate future occurrences within [fromIso, toIso]. Cap defends against
 * runaway rules.
 */
export function generateOccurrences(
  template: Pick<TaskTemplate, "id"> & { recurrence?: RecurrenceRule },
  fromIso: string,
  toIso: string,
  cap = 50,
): string[] {
  const rule = template.recurrence;
  if (!rule) return [];
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const hardEnd = rule.endsOnIso ? new Date(rule.endsOnIso) : null;
  const end = hardEnd && hardEnd < to ? hardEnd : to;
  const results: string[] = [];
  const n = Math.max(1, rule.interval);

  let cursor = applyTime(from, rule.timeOfDay);
  while (cursor < from) cursor = addDays(cursor, 1);

  const push = (d: Date) => {
    if (d >= from && d <= end) results.push(d.toISOString());
  };

  if (rule.frequency === "daily") {
    let c = new Date(cursor);
    while (c <= end && results.length < cap) {
      push(c);
      c = addDays(c, n);
    }
  } else if (rule.frequency === "weekly") {
    const days = (rule.byWeekday && rule.byWeekday.length ? rule.byWeekday : [
      cursor.getUTCDay() as Weekday,
    ]) as ReadonlyArray<Weekday>;
    let weekStart = new Date(cursor);
    weekStart = addDays(weekStart, -weekStart.getUTCDay());
    while (weekStart <= end && results.length < cap) {
      for (const wd of days) {
        const d = applyTime(addDays(weekStart, wd), rule.timeOfDay);
        if (d >= from && d <= end && results.length < cap) push(d);
      }
      weekStart = addDays(weekStart, 7 * n);
    }
  } else {
    let c = new Date(cursor);
    while (c <= end && results.length < cap) {
      push(c);
      c = addMonths(c, n);
    }
  }

  // De-dupe + stable sort.
  return Array.from(new Set(results)).sort();
}

// -------- Edit-scope enum (this / this-and-future / template) --------

export type EditScope = "this_only" | "this_and_future" | "template";

// -------- Instance helpers --------

/** True when the occurrence has already happened (do NOT allow editing past). */
export function isPastOccurrence(instance: Pick<TaskInstance, "dueAt">, nowIso: string): boolean {
  if (!instance.dueAt) return false;
  return Date.parse(instance.dueAt) < Date.parse(nowIso);
}
