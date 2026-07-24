// Application-layer helper: turn a rule + members + availability into a
// deterministic list of upcoming assignments by calling the engine once per
// occurrence. Purely delegates — no selection logic here.

import { selectAssignee, type EngineInput, type EngineResult, type Weekday } from "@/domain/shifts";
import type { ShiftRule, AvailabilityMap } from "@/data/shiftsRepo";

export interface PreviewEntry {
  occurrenceIso: string;
  weekday: Weekday;
  result: EngineResult;
}

interface Args {
  rule: ShiftRule;
  members: ReadonlyArray<{ id: string; eligible?: boolean }>;
  availability: AvailabilityMap;
  from: Date;
  count: number;
  /** Optional prior assignee before the first previewed occurrence. */
  lastAssigneeIdBefore?: string | null;
}

// Occurrence dates are advanced on the UTC calendar so the derived date key
// (`toISOString().slice(0, 10)`) is deterministic and never depends on the host
// timezone. A household "day" is a civil date, not a wall-clock instant. The
// previous code took local midnight (`setHours`) and then read a UTC ISO slice,
// which shifted the key back by a day in positive-offset zones (e.g. Asia/Jerusalem)
// and forward in negative-offset zones — making the same input non-deterministic.
// The rest of the app keys availability by `toISOString().slice(0, 10)` too
// (AvailabilityEditor, shiftsRepo), so UTC keeps preview and storage aligned.
function nextOccurrenceDates(rule: ShiftRule, from: Date, count: number): Date[] {
  const out: Date[] = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  if (rule.frequency === "daily") {
    for (let i = 0; i < count; i++) {
      const d = new Date(cursor);
      d.setUTCDate(d.getUTCDate() + i);
      out.push(d);
    }
    return out;
  }
  // weekly: advance to the configured weekly weekday and step 7 days
  const targetDay = rule.weeklyOn ?? 0;
  while (cursor.getUTCDay() !== targetDay) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  for (let i = 0; i < count; i++) {
    const d = new Date(cursor);
    d.setUTCDate(d.getUTCDate() + i * 7);
    out.push(d);
  }
  return out;
}

export function computePreview(args: Args): PreviewEntry[] {
  const dates = nextOccurrenceDates(args.rule, args.from, args.count);
  const participants = args.rule.participantMemberIds.map((id) => ({
    memberId: id,
    eligible: args.members.find((m) => m.id === id)?.eligible ?? true,
  }));
  let last: string | null = args.lastAssigneeIdBefore ?? null;
  const out: PreviewEntry[] = [];
  for (const d of dates) {
    const iso = d.toISOString();
    const dayKey = iso.slice(0, 10);
    const input: EngineInput = {
      rule: {
        strategy: args.rule.strategy,
        sequence: args.rule.sequence,
        weekday: args.rule.weekday,
        avoidConsecutive: args.rule.avoidConsecutive,
        fallback: args.rule.fallback,
      },
      participants,
      availability: { unavailableMemberIds: args.availability[dayKey] ?? [] },
      lastAssigneeId: last,
      targetWeekday: d.getUTCDay() as Weekday,
    };
    const result = selectAssignee(input);
    out.push({ occurrenceIso: iso, weekday: d.getUTCDay() as Weekday, result });
    if (result.selectedProfileId) last = result.selectedProfileId;
  }
  return out;
}
