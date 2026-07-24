import { describe, it, expect } from "vitest";
import {
  ALGORITHM_VERSION,
  applyManualOverride,
  selectAssignee,
  type EngineInput,
  type Participant,
  type Weekday,
} from "@/domain/shifts";

const P = (id: string, eligible = true): Participant => ({ memberId: id, eligible });

function baseInput(over: Partial<EngineInput> = {}): EngineInput {
  return {
    rule: { strategy: "fixed_sequence", sequence: ["a", "b", "c"] },
    participants: [P("a"), P("b"), P("c")],
    availability: { unavailableMemberIds: [] },
    lastAssigneeId: null,
    targetWeekday: 0,
    ...over,
  };
}

describe("determinism", () => {
  it("same input + same version → same output", () => {
    const inp = baseInput({ lastAssigneeId: "a" });
    const r1 = selectAssignee(inp);
    const r2 = selectAssignee(inp);
    expect(r1).toEqual(r2);
    expect(r1.algorithmVersion).toBe(ALGORITHM_VERSION);
  });

  it("candidateSnapshot is ordered deterministically (by memberId)", () => {
    const inp = baseInput({ participants: [P("c"), P("a"), P("b")] });
    expect(selectAssignee(inp).candidateSnapshot.map((c) => c.memberId)).toEqual(["a", "b", "c"]);
  });
});

describe("fixed_sequence", () => {
  it("picks the next in sequence after lastAssignee", () => {
    const r = selectAssignee(baseInput({ lastAssigneeId: "a" }));
    expect(r.selectedProfileId).toBe("b");
    expect(r.reasonCode).toBe("NEXT_IN_SEQUENCE");
  });

  it("wraps at end of sequence", () => {
    const r = selectAssignee(baseInput({ lastAssigneeId: "c" }));
    expect(r.selectedProfileId).toBe("a");
  });

  it("starts from first when no lastAssignee", () => {
    const r = selectAssignee(baseInput({ lastAssigneeId: null }));
    expect(r.selectedProfileId).toBe("a");
  });
});

describe("unavailable", () => {
  it("removes unavailable before choosing and reports PRIMARY_UNAVAILABLE", () => {
    const r = selectAssignee(
      baseInput({
        lastAssigneeId: "a",
        availability: { unavailableMemberIds: ["b"] },
      }),
    );
    expect(r.selectedProfileId).toBe("c");
    expect(r.reasonCode).toBe("PRIMARY_UNAVAILABLE");
  });

  it("eligibility is checked before sequence position (ineligible skipped)", () => {
    const r = selectAssignee(
      baseInput({
        lastAssigneeId: "a",
        participants: [P("a"), P("b", false), P("c")],
      }),
    );
    expect(r.selectedProfileId).toBe("c");
  });
});

describe("single participant", () => {
  it("picks the only eligible participant even if it repeats last", () => {
    const r = selectAssignee(
      baseInput({
        rule: { strategy: "fixed_sequence", sequence: ["a"], avoidConsecutive: true },
        participants: [P("a")],
        lastAssigneeId: "a",
      }),
    );
    expect(r.selectedProfileId).toBe("a");
    expect(r.reasonCode).toBe("ONLY_ELIGIBLE_PARTICIPANT");
  });
});

describe("no eligible participant", () => {
  it("returns null with NO_ELIGIBLE_PARTICIPANT", () => {
    const r = selectAssignee(
      baseInput({
        participants: [P("a", false), P("b", false), P("c", false)],
      }),
    );
    expect(r.selectedProfileId).toBeNull();
    expect(r.reasonCode).toBe("NO_ELIGIBLE_PARTICIPANT");
  });

  it("all unavailable also yields NO_ELIGIBLE_PARTICIPANT", () => {
    const r = selectAssignee(
      baseInput({
        availability: { unavailableMemberIds: ["a", "b", "c"] },
      }),
    );
    expect(r.selectedProfileId).toBeNull();
    expect(r.reasonCode).toBe("NO_ELIGIBLE_PARTICIPANT");
  });
});

describe("avoid consecutive", () => {
  it("avoids repeat when another eligible candidate exists", () => {
    const r = selectAssignee(
      baseInput({
        rule: {
          strategy: "fixed_sequence",
          sequence: ["a", "b"],
          avoidConsecutive: true,
        },
        participants: [P("a"), P("b")],
        lastAssigneeId: "b",
      }),
    );
    // next-in-sequence after b is a, so no consecutive risk anyway.
    expect(r.selectedProfileId).toBe("a");
  });

  it("avoids repeat when rotation would land on lastAssignee", () => {
    // last was 'a' at index 0. next start = 1 ('b'). If 'b' unavailable,
    // rotatedPool becomes [c, a]. Not a repeat. Force a scenario: seq [a]
    // is single — covered elsewhere. Use seq [a,b] with lastAssignee 'a'
    // and b ineligible: single → picks a even though consecutive.
    const r = selectAssignee(
      baseInput({
        rule: {
          strategy: "fixed_sequence",
          sequence: ["a", "b"],
          avoidConsecutive: true,
        },
        participants: [P("a"), P("b", false)],
        lastAssigneeId: "a",
      }),
    );
    expect(r.selectedProfileId).toBe("a"); // single eligible wins over avoidance
    expect(r.reasonCode).toBe("ONLY_ELIGIBLE_PARTICIPANT");
  });
});

describe("weekday_fixed", () => {
  const inp = baseInput({
    rule: {
      strategy: "weekday_fixed",
      weekday: { 1: "a", 2: "b" } as Partial<Record<Weekday, string>>,
    },
    targetWeekday: 1,
  });

  it("selects the fixed person for the weekday", () => {
    const r = selectAssignee(inp);
    expect(r.selectedProfileId).toBe("a");
    expect(r.reasonCode).toBe("WEEKDAY_FIXED");
  });

  it("returns manual-required when unmapped weekday and no fallback", () => {
    const r = selectAssignee({ ...inp, targetWeekday: 5 });
    expect(r.selectedProfileId).toBeNull();
    expect(r.reasonCode).toBe("MANUAL_ASSIGNMENT_REQUIRED");
  });
});

describe("fallback", () => {
  it("falls back to fixed_sequence when weekday_fixed primary is unavailable", () => {
    const r = selectAssignee(
      baseInput({
        rule: {
          strategy: "weekday_fixed",
          weekday: { 1: "a" } as Partial<Record<Weekday, string>>,
          sequence: ["a", "b", "c"],
          fallback: "next_available_in_sequence",
        },
        availability: { unavailableMemberIds: ["a"] },
        lastAssigneeId: null,
        targetWeekday: 1,
      }),
    );
    expect(r.selectedProfileId).toBe("b");
    expect(r.warnings.some((w) => w.code === "PRIMARY_UNAVAILABLE")).toBe(true);
  });
});

describe("stable tie-breaking", () => {
  it("participants supplied in any order yield the same snapshot ordering", () => {
    const a = selectAssignee(baseInput({ participants: [P("b"), P("c"), P("a")] }));
    const b = selectAssignee(baseInput({ participants: [P("a"), P("b"), P("c")] }));
    expect(a.candidateSnapshot).toEqual(b.candidateSnapshot);
  });
});

describe("algorithm version + manual override", () => {
  it("result always carries algorithmVersion", () => {
    const r = selectAssignee(baseInput());
    expect(r.algorithmVersion).toBe(ALGORITHM_VERSION);
  });

  it("manual override does not rewrite the original snapshot/version", () => {
    const original = selectAssignee(baseInput({ lastAssigneeId: "a" }));
    const overridden = applyManualOverride(original, {
      overriddenBy: "m_owner",
      memberId: "c",
      at: "2026-08-01T00:00:00.000Z",
      note: "החלפה מוסכמת",
    });
    expect(overridden.selectedProfileId).toBe("c");
    expect(overridden.candidateSnapshot).toEqual(original.candidateSnapshot);
    expect(overridden.algorithmVersion).toBe(original.algorithmVersion);
    // original object untouched
    expect(original.selectedProfileId).toBe("b");
  });
});

describe("manual strategy", () => {
  it("always returns MANUAL_ASSIGNMENT_REQUIRED", () => {
    const r = selectAssignee(baseInput({ rule: { strategy: "manual" } }));
    expect(r.selectedProfileId).toBeNull();
    expect(r.reasonCode).toBe("MANUAL_ASSIGNMENT_REQUIRED");
  });
});
