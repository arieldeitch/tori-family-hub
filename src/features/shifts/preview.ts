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

function nextOccurrenceDates(rule: ShiftRule, from: Date, count: number): Date[] {
  const out: Date[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  if (rule.frequency === "daily") {
    for (let i = 0; i < count; i++) {
      const d = new Date(cursor);
      d.setDate(d.getDate() + i);
      out.push(d);
    }
    return out;
  }
  // weekly: advance to the configured weekly weekday and step 7 days
  const targetDay = rule.weeklyOn ?? 0;
  while (cursor.getDay() !== targetDay) {
    cursor.setDate(cursor.getDate() + 1);
  }
  for (let i = 0; i < count; i++) {
    const d = new Date(cursor);
    d.setDate(d.getDate() + i * 7);
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
      targetWeekday: d.getDay() as Weekday,
    };
    const result = selectAssignee(input);
    out.push({ occurrenceIso: iso, weekday: d.getDay() as Weekday, result });
    if (result.selectedProfileId) last = result.selectedProfileId;
  }
  return out;
}
