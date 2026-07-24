// Pure shift-selection engine (prompt 6.4).
//
// Deterministic MVP engine supporting three strategies: fixed_sequence,
// weekday_fixed, manual. No React, no I/O, no random. Same input + same
// algorithm version MUST yield the same output.
//
// SECURITY: nothing here is a permission check. Callers enforce role/RLS.

export const ALGORITHM_VERSION = "shifts.v1";

export type ShiftStrategy = "fixed_sequence" | "weekday_fixed" | "manual";

export type FallbackStrategy = "unassigned" | "next_available_in_sequence";

/** ISO weekday matching JS getDay(): 0 = Sunday, 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ReasonCode =
  | "NEXT_IN_SEQUENCE"
  | "WEEKDAY_FIXED"
  | "PRIMARY_UNAVAILABLE"
  | "ONLY_ELIGIBLE_PARTICIPANT"
  | "NO_ELIGIBLE_PARTICIPANT"
  | "MANUAL_ASSIGNMENT_REQUIRED"
  | "CONSECUTIVE_AVOIDED";

export interface ShiftRule {
  strategy: ShiftStrategy;
  /** fixed_sequence order — memberIds in canonical rotation order. */
  sequence?: ReadonlyArray<string>;
  /** weekday_fixed mapping: weekday → memberId. */
  weekday?: Partial<Record<Weekday, string>>;
  fallback?: FallbackStrategy;
  /** If true and >1 eligible member exists, avoid selecting `lastAssigneeId`. */
  avoidConsecutive?: boolean;
}

export interface Participant {
  memberId: string;
  /** True if the member is generally eligible for this shift (role/age/etc). */
  eligible: boolean;
}

export interface Availability {
  /** MemberIds that are explicitly unavailable for the target occurrence. */
  unavailableMemberIds: ReadonlyArray<string>;
}

export interface EngineInput {
  rule: ShiftRule;
  participants: ReadonlyArray<Participant>;
  availability: Availability;
  /** MemberId of previous occurrence's assignee, or null if none. */
  lastAssigneeId: string | null;
  /** Weekday of the occurrence being assigned. */
  targetWeekday: Weekday;
}

export interface CandidateSnapshot {
  memberId: string;
  eligible: boolean;
  available: boolean;
  /** Position in the fixed_sequence rotation (if applicable). */
  sequenceIndex: number | null;
}

export interface Warning {
  code: string;
  message: string;
}

export interface EngineResult {
  selectedProfileId: string | null;
  reasonCode: ReasonCode;
  humanExplanation: string;
  candidateSnapshot: ReadonlyArray<CandidateSnapshot>;
  algorithmVersion: string;
  warnings: ReadonlyArray<Warning>;
}

// -------- Helpers --------

function stableSortByMemberId<T extends { memberId: string }>(xs: ReadonlyArray<T>): T[] {
  // ties are broken by memberId ascending — deterministic across runs.
  return [...xs].sort((a, b) => (a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0));
}

function buildSnapshot(input: EngineInput): CandidateSnapshot[] {
  const seq = input.rule.sequence ?? [];
  const seqIndex = new Map(seq.map((id, i) => [id, i] as const));
  const unavailable = new Set(input.availability.unavailableMemberIds);
  return stableSortByMemberId(input.participants).map((p) => ({
    memberId: p.memberId,
    eligible: p.eligible,
    available: !unavailable.has(p.memberId),
    sequenceIndex: seqIndex.has(p.memberId) ? (seqIndex.get(p.memberId) as number) : null,
  }));
}

function eligibleAvailable(snapshot: ReadonlyArray<CandidateSnapshot>): CandidateSnapshot[] {
  // Eligibility is evaluated BEFORE sequence, per the spec.
  return snapshot.filter((c) => c.eligible && c.available);
}

// -------- Strategies --------

function selectFixedSequence(input: EngineInput, snapshot: CandidateSnapshot[]): EngineResult {
  const seq = input.rule.sequence ?? [];
  const pool = eligibleAvailable(snapshot);
  const warnings: Warning[] = [];

  if (pool.length === 0) {
    return noneEligible(snapshot, warnings);
  }
  if (pool.length === 1) {
    return single(pool[0]!, snapshot, warnings, "NEXT_IN_SEQUENCE");
  }

  // Walk the sequence from the position AFTER lastAssigneeId.
  const startIdx =
    input.lastAssigneeId && seq.includes(input.lastAssigneeId)
      ? (seq.indexOf(input.lastAssigneeId) + 1) % seq.length
      : 0;

  const rotated: string[] = [];
  for (let i = 0; i < seq.length; i++) rotated.push(seq[(startIdx + i) % seq.length]!);

  const eligibleSet = new Set(pool.map((p) => p.memberId));
  const rotatedPool = rotated.filter((id) => eligibleSet.has(id));

  const primary = rotatedPool[0]!;
  const skippedPrimary = input.lastAssigneeId && seq.includes(input.lastAssigneeId)
    ? seq[startIdx]
    : null;
  if (skippedPrimary && !eligibleSet.has(skippedPrimary)) {
    warnings.push({
      code: "PRIMARY_UNAVAILABLE",
      message: `${skippedPrimary} was next in sequence but not eligible/available`,
    });
  }

  // Consecutive avoidance: only kicks in when another eligible member exists.
  if (
    input.rule.avoidConsecutive &&
    input.lastAssigneeId &&
    primary === input.lastAssigneeId &&
    rotatedPool.length > 1
  ) {
    const alt = rotatedPool.find((id) => id !== input.lastAssigneeId)!;
    return {
      selectedProfileId: alt,
      reasonCode: "CONSECUTIVE_AVOIDED",
      humanExplanation: `${alt} נבחר כדי להימנע מרצף עם ${input.lastAssigneeId}.`,
      candidateSnapshot: snapshot,
      algorithmVersion: ALGORITHM_VERSION,
      warnings,
    };
  }

  const reason: ReasonCode = warnings.some((w) => w.code === "PRIMARY_UNAVAILABLE")
    ? "PRIMARY_UNAVAILABLE"
    : "NEXT_IN_SEQUENCE";

  return {
    selectedProfileId: primary,
    reasonCode: reason,
    humanExplanation:
      reason === "PRIMARY_UNAVAILABLE"
        ? `המועמד הבא בתור לא היה זמין, ${primary} נבחר במקומו.`
        : `${primary} הבא בתור ברוטציה.`,
    candidateSnapshot: snapshot,
    algorithmVersion: ALGORITHM_VERSION,
    warnings,
  };
}

function selectWeekdayFixed(input: EngineInput, snapshot: CandidateSnapshot[]): EngineResult {
  const warnings: Warning[] = [];
  const mapped = input.rule.weekday?.[input.targetWeekday];
  const pool = eligibleAvailable(snapshot);

  if (mapped) {
    const cand = snapshot.find((c) => c.memberId === mapped);
    if (cand && cand.eligible && cand.available) {
      return {
        selectedProfileId: mapped,
        reasonCode: "WEEKDAY_FIXED",
        humanExplanation: `${mapped} משובץ קבוע ליום זה בשבוע.`,
        candidateSnapshot: snapshot,
        algorithmVersion: ALGORITHM_VERSION,
        warnings,
      };
    }
    warnings.push({
      code: "PRIMARY_UNAVAILABLE",
      message: `${mapped} is fixed for weekday ${input.targetWeekday} but not eligible/available`,
    });
  }

  // Fallback logic.
  if (pool.length === 0) return noneEligible(snapshot, warnings);
  if (pool.length === 1) return single(pool[0]!, snapshot, warnings, "ONLY_ELIGIBLE_PARTICIPANT");

  if (input.rule.fallback === "next_available_in_sequence" && input.rule.sequence?.length) {
    return selectFixedSequence(input, snapshot);
  }

  // Default fallback: unassigned (manual required).
  return {
    selectedProfileId: null,
    reasonCode: "MANUAL_ASSIGNMENT_REQUIRED",
    humanExplanation: "אין שיבוץ קבוע ליום זה או שהמשובץ אינו זמין — נדרש שיבוץ ידני.",
    candidateSnapshot: snapshot,
    algorithmVersion: ALGORITHM_VERSION,
    warnings,
  };
}

function selectManual(_input: EngineInput, snapshot: CandidateSnapshot[]): EngineResult {
  return {
    selectedProfileId: null,
    reasonCode: "MANUAL_ASSIGNMENT_REQUIRED",
    humanExplanation: "אסטרטגיה ידנית — יש לבחור אחראי בפעולה מפורשת.",
    candidateSnapshot: snapshot,
    algorithmVersion: ALGORITHM_VERSION,
    warnings: [],
  };
}

// -------- Common outcomes --------

function noneEligible(
  snapshot: ReadonlyArray<CandidateSnapshot>,
  warnings: Warning[],
): EngineResult {
  return {
    selectedProfileId: null,
    reasonCode: "NO_ELIGIBLE_PARTICIPANT",
    humanExplanation: "אין משתתף זכאי וזמין למופע הזה.",
    candidateSnapshot: snapshot,
    algorithmVersion: ALGORITHM_VERSION,
    warnings,
  };
}

function single(
  only: CandidateSnapshot,
  snapshot: ReadonlyArray<CandidateSnapshot>,
  warnings: Warning[],
  reason: ReasonCode,
): EngineResult {
  return {
    selectedProfileId: only.memberId,
    reasonCode: reason === "NEXT_IN_SEQUENCE" ? "ONLY_ELIGIBLE_PARTICIPANT" : reason,
    humanExplanation: `${only.memberId} הוא המועמד הזמין היחיד.`,
    candidateSnapshot: snapshot,
    algorithmVersion: ALGORITHM_VERSION,
    warnings,
  };
}

// -------- Public entry --------

export function selectAssignee(input: EngineInput): EngineResult {
  const snapshot = buildSnapshot(input);
  switch (input.rule.strategy) {
    case "fixed_sequence":
      return selectFixedSequence(input, snapshot);
    case "weekday_fixed":
      return selectWeekdayFixed(input, snapshot);
    case "manual":
      return selectManual(input, snapshot);
    default: {
      // Exhaustiveness — should never happen.
      const _n: never = input.rule.strategy;
      void _n;
      return noneEligible(snapshot, []);
    }
  }
}

/**
 * Records a manual override. Pure: returns a marker result without changing
 * any inputs. The engine never rewrites history — this is what callers
 * persist alongside the previous engine result.
 */
export interface ManualOverride {
  overriddenBy: string;
  memberId: string;
  at: string; // ISO
  note?: string;
}

export function applyManualOverride(previous: EngineResult, override: ManualOverride): EngineResult {
  return {
    ...previous, // snapshot + algorithmVersion + warnings preserved (history intact)
    selectedProfileId: override.memberId,
    reasonCode: "MANUAL_ASSIGNMENT_REQUIRED",
    humanExplanation: `שיבוץ ידני על ידי ${override.overriddenBy}${override.note ? ` — ${override.note}` : ""}.`,
  };
}
