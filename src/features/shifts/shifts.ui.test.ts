import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { computePreview } from "@/features/shifts/preview";
import type { ShiftRule } from "@/data/shiftsRepo";
import * as shiftsRepo from "@/data/shiftsRepo";

const MEMBERS = [
  { id: "a", name: "נועה" },
  { id: "b", name: "יואב" },
  { id: "c", name: "מיכל" },
];

const rule = (over: Partial<ShiftRule> = {}): ShiftRule => ({
  id: "r1",
  name: "test",
  strategy: "fixed_sequence",
  participantMemberIds: ["a", "b", "c"],
  sequence: ["a", "b", "c"],
  frequency: "daily",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("shifts preview (pure integration)", () => {
  beforeEach(() => shiftsRepo.reset());

  it("is deterministic for the same input", () => {
    const from = new Date("2026-07-24T00:00:00.000Z");
    const p1 = computePreview({ rule: rule(), members: MEMBERS, availability: {}, from, count: 5 });
    const p2 = computePreview({ rule: rule(), members: MEMBERS, availability: {}, from, count: 5 });
    expect(p1.map((x) => x.result.selectedProfileId)).toEqual(
      p2.map((x) => x.result.selectedProfileId),
    );
  });

  it("rotates through the sequence deterministically", () => {
    const from = new Date("2026-07-24T00:00:00.000Z");
    const p = computePreview({
      rule: rule(),
      members: MEMBERS,
      availability: {},
      from,
      count: 4,
      lastAssigneeIdBefore: "c",
    });
    expect(p.map((x) => x.result.selectedProfileId)).toEqual(["a", "b", "c", "a"]);
  });

  it("respects per-day unavailability", () => {
    const from = new Date("2026-07-24T00:00:00.000Z");
    const day0 = from.toISOString().slice(0, 10);
    const p = computePreview({
      rule: rule(),
      members: MEMBERS,
      availability: { [day0]: ["a"] },
      from,
      count: 1,
      lastAssigneeIdBefore: "c",
    });
    expect(p[0]!.result.selectedProfileId).toBe("b");
    expect(p[0]!.result.reasonCode).toBe("PRIMARY_UNAVAILABLE");
  });

  it("returns null when nobody is available and marks NO_ELIGIBLE_PARTICIPANT", () => {
    const from = new Date("2026-07-24T00:00:00.000Z");
    const day0 = from.toISOString().slice(0, 10);
    const p = computePreview({
      rule: rule(),
      members: MEMBERS,
      availability: { [day0]: ["a", "b", "c"] },
      from,
      count: 1,
    });
    expect(p[0]!.result.selectedProfileId).toBeNull();
    expect(p[0]!.result.reasonCode).toBe("NO_ELIGIBLE_PARTICIPANT");
  });
});

// Regression for the timezone-determinism bug: occurrence date keys used to be
// derived from local midnight and then read as a UTC ISO slice, so in any zone
// with a non-zero offset the availability lookup missed by a day and the same
// input produced different assignments per host timezone. These tests exercise
// the engine under several offsets (zero, positive, negative, and an extreme
// +14 zone) and assert identical, deterministic results everywhere.
describe("shifts preview — timezone determinism (regression)", () => {
  const originalTZ = process.env.TZ;
  beforeEach(() => shiftsRepo.reset());
  afterEach(() => {
    process.env.TZ = originalTZ;
  });

  // process.env.TZ is honored by V8's Date on the next Date operation, so setting
  // it before constructing `from` reproduces a host running in that timezone.
  function runInTZ<T>(tz: string, fn: () => T): T {
    process.env.TZ = tz;
    return fn();
  }

  const ZONES = ["UTC", "Asia/Jerusalem", "America/Los_Angeles", "Pacific/Kiritimati"];

  it("respects per-day unavailability in every timezone", () => {
    for (const tz of ZONES) {
      const res = runInTZ(tz, () => {
        const from = new Date("2026-07-24T00:00:00.000Z");
        const day0 = from.toISOString().slice(0, 10);
        return computePreview({
          rule: rule(),
          members: MEMBERS,
          availability: { [day0]: ["a"] },
          from,
          count: 1,
          lastAssigneeIdBefore: "c",
        });
      });
      expect(res[0]!.result.selectedProfileId, `TZ=${tz}`).toBe("b");
      expect(res[0]!.result.reasonCode, `TZ=${tz}`).toBe("PRIMARY_UNAVAILABLE");
    }
  });

  it("returns null when nobody is available in every timezone", () => {
    for (const tz of ZONES) {
      const res = runInTZ(tz, () => {
        const from = new Date("2026-07-24T00:00:00.000Z");
        const day0 = from.toISOString().slice(0, 10);
        return computePreview({
          rule: rule(),
          members: MEMBERS,
          availability: { [day0]: ["a", "b", "c"] },
          from,
          count: 1,
        });
      });
      expect(res[0]!.result.selectedProfileId, `TZ=${tz}`).toBeNull();
      expect(res[0]!.result.reasonCode, `TZ=${tz}`).toBe("NO_ELIGIBLE_PARTICIPANT");
    }
  });

  it("yields identical assignments, reason codes and algorithm version across all timezones", () => {
    // Mark "a" unavailable on the 3rd occurrence to exercise the per-occurrence
    // date-key lookup at a non-first day, where the off-by-one used to surface.
    const day2 = new Date("2026-07-26T00:00:00.000Z").toISOString().slice(0, 10);
    const compute = () =>
      computePreview({
        rule: rule(),
        members: MEMBERS,
        availability: { [day2]: ["a"] },
        from: new Date("2026-07-24T00:00:00.000Z"),
        count: 5,
        lastAssigneeIdBefore: "c",
      }).map((e) => ({
        day: e.occurrenceIso.slice(0, 10),
        weekday: e.weekday,
        id: e.result.selectedProfileId,
        reason: e.result.reasonCode,
        algo: e.result.algorithmVersion,
      }));

    const baseline = runInTZ("UTC", compute);
    // Sanity: the seeded day keys are the intended civil dates, not shifted.
    expect(baseline.map((e) => e.day)).toEqual([
      "2026-07-24",
      "2026-07-25",
      "2026-07-26",
      "2026-07-27",
      "2026-07-28",
    ]);
    // And the unavailability on day 3 was honored (someone other than "a").
    expect(baseline[2]!.id).not.toBe("a");

    for (const tz of ZONES.filter((z) => z !== "UTC")) {
      expect(runInTZ(tz, compute), `TZ=${tz}`).toEqual(baseline);
    }
  });
});

describe("shiftsRepo", () => {
  beforeEach(() => shiftsRepo.reset());

  it("creates and updates rules without touching earlier history", () => {
    const r = shiftsRepo.createRule({
      name: "פינוי אשפה",
      strategy: "fixed_sequence",
      participantMemberIds: ["a", "b"],
      sequence: ["a", "b"],
      frequency: "daily",
    });
    shiftsRepo.recordHistory({
      ruleId: r.id,
      occurrenceIso: "2026-07-20T00:00:00.000Z",
      memberId: "a",
      reasonCode: "NEXT_IN_SEQUENCE",
      humanExplanation: "…",
      algorithmVersion: "shifts.v1",
    });
    const updated = shiftsRepo.updateRule(r.id, { name: "פינוי אשפה — לילה" });
    expect(updated.name).toBe("פינוי אשפה — לילה");
    expect(shiftsRepo.getHistory(r.id)).toHaveLength(1);
    expect(shiftsRepo.getHistory(r.id)[0]!.demo).toBe(true);
  });

  it("deleting a rule also removes its demo history rows", () => {
    const r = shiftsRepo.createRule({
      name: "x",
      strategy: "manual",
      participantMemberIds: [],
      frequency: "daily",
    });
    shiftsRepo.recordHistory({
      ruleId: r.id,
      occurrenceIso: "2026-07-20T00:00:00.000Z",
      memberId: null,
      reasonCode: "MANUAL_ASSIGNMENT_REQUIRED",
      humanExplanation: "…",
      algorithmVersion: "shifts.v1",
    });
    shiftsRepo.deleteRule(r.id);
    expect(shiftsRepo.getHistory(r.id)).toHaveLength(0);
  });
});
