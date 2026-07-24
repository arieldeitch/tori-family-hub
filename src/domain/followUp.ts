// Pure domain: follow-up cases with external parties.
// No React, no I/O. All security-sensitive filtering here is UX-only —
// real enforcement must live in the server (RLS + edge functions) later.

export type FollowUpStatus =
  | "action_required"
  | "waiting_external"
  | "response_received"
  | "more_info_required"
  | "completed"
  | "closed_no_action"
  | "blocked";

export type BallHolder = "us" | "external" | "shared";

export type Sensitivity = "household" | "adults_only" | "restricted";

export type FollowUpActionKind =
  | "created"
  | "called"
  | "emailed"
  | "message_sent"
  | "response_received"
  | "meeting"
  | "note"
  | "status_changed"
  | "reminder_set"
  | "reminder_disabled"
  | "completed";

export interface FollowUpAction {
  id: string;
  kind: FollowUpActionKind;
  description: string;
  at: string; // ISO
  byMemberId: string;
  nextFollowUpAt?: string; // ISO — if set at that action
}

export interface FollowUpCase {
  id: string;
  title: string;
  responsibleMemberId: string;
  externalParty: string; // e.g. "בנק דיסקונט"
  ballHolder: BallHolder;
  status: FollowUpStatus;
  openedAt: string; // ISO
  lastActionAt?: string; // ISO
  nextFollowUpAt?: string; // ISO
  followUpDisabledReason?: string;
  targetDate?: string; // ISO
  possibleAmount?: number; // currency-agnostic in prototype
  sensitivity: Sensitivity;
  restrictedToMemberIds?: string[];
  actions: FollowUpAction[];
  // Restricted to specific member ids when sensitivity === "restricted"
}

// -------- Business rules --------

export interface FollowUpValidationError {
  field:
    | "title"
    | "responsibleMemberId"
    | "externalParty"
    | "status"
    | "nextFollowUpAt"
    | "followUpDisabledReason";
  message: string;
}

/**
 * Critical business rule: when status is "waiting_external", the case MUST
 * carry either a next follow-up date OR an explicit follow_up_disabled_reason.
 * Enforced as a pure function so both the form and any future server logic
 * can share it.
 */
export function validateFollowUp(
  input: Pick<
    FollowUpCase,
    | "title"
    | "responsibleMemberId"
    | "externalParty"
    | "status"
    | "nextFollowUpAt"
    | "followUpDisabledReason"
  >,
): FollowUpValidationError[] {
  const errors: FollowUpValidationError[] = [];
  if (!input.title.trim()) {
    errors.push({ field: "title", message: "חובה למלא כותרת" });
  }
  if (!input.responsibleMemberId) {
    errors.push({ field: "responsibleMemberId", message: "יש לבחור אחראי" });
  }
  if (!input.externalParty.trim()) {
    errors.push({ field: "externalParty", message: "יש להזין גורם חיצוני" });
  }
  if (input.status === "waiting_external") {
    const hasDate = !!input.nextFollowUpAt?.trim();
    const hasReason = !!input.followUpDisabledReason?.trim();
    if (!hasDate && !hasReason) {
      errors.push({
        field: "nextFollowUpAt",
        message:
          'במצב "ממתין לגורם חיצוני" חובה למלא תאריך מעקב הבא או סיבה לביטול תזכורת',
      });
    }
  }
  return errors;
}

export function isTerminalStatus(status: FollowUpStatus): boolean {
  return (
    status === "completed" ||
    status === "closed_no_action"
  );
}

/**
 * When a case is marked completed/closed, any pending demo reminders in the
 * future must be cleared. Pure function returning a new case object.
 */
export function clearFutureRemindersIfTerminal(
  followUp: FollowUpCase,
  nowIso: string,
): FollowUpCase {
  if (!isTerminalStatus(followUp.status)) return followUp;
  const nextIsFuture =
    followUp.nextFollowUpAt !== undefined &&
    followUp.nextFollowUpAt > nowIso;
  if (!nextIsFuture && !followUp.followUpDisabledReason) return followUp;
  return {
    ...followUp,
    nextFollowUpAt: undefined,
    followUpDisabledReason: undefined,
  };
}

export function isDueForFollowUp(
  followUp: FollowUpCase,
  nowIso: string,
): boolean {
  if (isTerminalStatus(followUp.status)) return false;
  if (!followUp.nextFollowUpAt) return false;
  return followUp.nextFollowUpAt <= nowIso;
}

export function isWaitingExternal(followUp: FollowUpCase): boolean {
  return followUp.status === "waiting_external";
}

// UX-only: hide restricted/adults-only cases for child role.
export function canRoleSeeFollowUp(
  role: "owner" | "adult" | "child" | "guest",
  followUp: FollowUpCase,
  viewerMemberId?: string,
): boolean {
  if (followUp.sensitivity === "adults_only" && role === "child") return false;
  if (followUp.sensitivity === "restricted") {
    if (role === "child" || role === "guest") return false;
    if (!viewerMemberId) return false;
    if (!followUp.restrictedToMemberIds?.includes(viewerMemberId)) return false;
  }
  return true;
}

// -------- Labels (moved to i18n via t()); statuses list for filters --------

export const ALL_STATUSES: FollowUpStatus[] = [
  "action_required",
  "waiting_external",
  "response_received",
  "more_info_required",
  "completed",
  "closed_no_action",
  "blocked",
];

export const ALL_BALL_HOLDERS: BallHolder[] = ["us", "external", "shared"];
