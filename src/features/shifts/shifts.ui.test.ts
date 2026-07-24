import { describe, it, expect, beforeEach } from "vitest";
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
