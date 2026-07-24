// Pure domain: tasks. No React, no I/O, no side effects.
//
// This module defines the canonical task lifecycle for Tori. UI code MUST NOT
// decide whether a transition is legal — it calls `canTransitionTask` /
// `transitionTask` and reacts to the result.
//
// SECURITY: nothing in this file is a permission check. Role-based gating
// belongs to the server (RLS + edge functions). This module models state and
// state transitions only.

// -------- Enums / literal unions --------

export type TaskStatus =
  | "inbox"
  | "planned"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "waiting"
  | "blocked"
  | "done"
  | "skipped"
  | "cancelled";

export type TaskPriority = "low" | "normal" | "high" | "urgent";

export type TaskSource = "manual" | "template" | "recurring" | "delegated" | "system" | "import";

// A task is "terminal" once it enters one of these states; further
// transitions are disallowed.
export const TERMINAL_STATUSES: ReadonlySet<TaskStatus> = new Set(["done", "skipped", "cancelled"]);

// States in which nobody is actively working the task yet — these are the
// only states in which a task may sit without an assignee/dueAt.
export const UNASSIGNED_ALLOWED_STATUSES: ReadonlySet<TaskStatus> = new Set(["inbox", "planned"]);

// -------- Core entities --------

/**
 * A reusable definition. Editing a template MUST NOT mutate historical
 * instances that were created from it — see `createTaskInstanceSnapshot`.
 */
export interface TaskTemplate {
  id: string;
  title: string;
  description?: string;
  defaultPriority: TaskPriority;
  defaultDurationMinutes?: number;
  adultsOnly?: boolean;
  requiresApproval?: boolean;
  tags?: ReadonlyArray<string>;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  /** Monotonic revision — bumped whenever the template is edited. */
  revision: number;
  // -- Recurrence / participants / miss-policy (prompt 6.3). All optional so
  // pre-existing one-off templates keep working unchanged.
  recurrence?: import("./recurrence").RecurrenceRule;
  participantMemberIds?: ReadonlyArray<string>;
  missedAction?: import("./recurrence").MissedAction;
  /** Human-readable sentence describing the rule, shown before save. */
  humanRule?: string;
  // -- Soft delete markers (prototype only, no purge).
  deletedAt?: string;
  deletedByMemberId?: string;
}

/**
 * A concrete occurrence of work. Snapshots the template fields at creation
 * time (see `templateSnapshot`) so future template edits don't rewrite
 * history.
 */
export interface TaskInstance {
  id: string;
  status: TaskStatus;
  title: string;
  description?: string;
  priority: TaskPriority;
  source: TaskSource;
  /** Origin template — undefined for purely manual tasks. */
  templateId?: string;
  templateSnapshot?: TemplateSnapshot;
  assignment: TaskAssignment | null;
  dueAt: string | null; // ISO
  startedAt?: string; // ISO
  completedAt?: string; // ISO — required when status === "done"
  completedByMemberId?: string; // required when completedAt set AND actor is known
  cancelledAt?: string; // ISO — set when cancelled/skipped
  cancelReason?: string;
  adultsOnly?: boolean;
  requiresApproval?: boolean;
  createdAt: string; // ISO
  createdByMemberId: string;
  updatedAt: string; // ISO
  /** Append-only history — see `appendActivity`. Never mutate in place. */
  activity: ReadonlyArray<TaskActivity>;
  /** For template-generated instances: canonical scheduled instant. */
  scheduledAt?: string;
  // -- Soft delete markers.
  deletedAt?: string;
  deletedByMemberId?: string;
}

/** Immutable copy of the template fields at instance creation time. */
export interface TemplateSnapshot {
  templateId: string;
  revision: number;
  title: string;
  description?: string;
  priority: TaskPriority;
  adultsOnly?: boolean;
  requiresApproval?: boolean;
  capturedAt: string; // ISO
}

export interface TaskAssignment {
  memberId: string;
  assignedAt: string; // ISO
  assignedByMemberId: string;
  /** Optional acceptance timestamp; presence != accepted status. */
  acceptedAt?: string;
}

export type TaskActivityKind =
  | "created"
  | "status_changed"
  | "assigned"
  | "unassigned"
  | "due_changed"
  | "priority_changed"
  | "completed"
  | "cancelled"
  | "skipped"
  | "reopened"
  | "note";

export interface TaskActivity {
  id: string;
  kind: TaskActivityKind;
  at: string; // ISO
  byMemberId: string;
  from?: TaskStatus;
  to?: TaskStatus;
  note?: string;
}

// -------- Errors --------

export type TaskDomainErrorCode =
  | "invalid_transition"
  | "missing_completed_at"
  | "missing_assignee"
  | "missing_due_date"
  | "missing_cancel_reason"
  | "terminal_state"
  | "already_in_status"
  | "unknown_status";

export class TaskDomainError extends Error {
  readonly code: TaskDomainErrorCode;
  readonly details?: Record<string, unknown>;
  constructor(code: TaskDomainErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "TaskDomainError";
    this.code = code;
    this.details = details;
  }
}

// -------- Transition table --------

// Canonical allowed transitions. Directly encodes the required rule that
// `done` is only reachable from active/passive work states (accepted,
// in_progress, waiting, blocked) — never from `planned` or `assigned`.
const ALLOWED: Readonly<Record<TaskStatus, ReadonlyArray<TaskStatus>>> = {
  inbox: ["planned", "assigned", "cancelled"],
  planned: ["assigned", "inbox", "cancelled", "skipped"],
  assigned: ["accepted", "in_progress", "planned", "inbox", "cancelled", "skipped"],
  accepted: ["in_progress", "waiting", "blocked", "assigned", "done", "cancelled", "skipped"],
  in_progress: ["waiting", "blocked", "done", "accepted", "cancelled", "skipped"],
  waiting: ["in_progress", "blocked", "done", "cancelled", "skipped"],
  blocked: ["in_progress", "waiting", "done", "cancelled", "skipped"],
  // Terminal states — no outgoing transitions.
  done: [],
  skipped: [],
  cancelled: [],
};

export function allowedNextStatuses(from: TaskStatus): ReadonlyArray<TaskStatus> {
  return ALLOWED[from] ?? [];
}

// -------- Pure query helpers --------

export function isTerminal(status: TaskStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function requiresAssignment(
  t: Pick<TaskInstance, "status" | "assignment" | "dueAt">,
): boolean {
  // A task needs an assignee+dueAt to leave the "unassigned-ok" zone. If it
  // is in a working state without either, it needs assignment.
  if (UNASSIGNED_ALLOWED_STATUSES.has(t.status)) return t.assignment === null || t.dueAt === null;
  return t.assignment === null || t.dueAt === null;
}

/** True iff task has a due date in the past AND is not terminal. */
export function isTaskOverdue(t: Pick<TaskInstance, "status" | "dueAt">, nowIso: string): boolean {
  if (isTerminal(t.status)) return false;
  if (!t.dueAt) return false;
  return new Date(t.dueAt).getTime() < new Date(nowIso).getTime();
}

/**
 * Validates that a task is in a shape that permits completion. Returns a
 * TaskDomainError when invalid; returns null when OK.
 */
export function validateTaskForCompletion(input: {
  status: TaskStatus;
  completedAt?: string;
  completedByMemberId?: string;
  actorMemberId?: string;
}): TaskDomainError | null {
  // Completion is only legal from an active/passive work state.
  const legalFrom: ReadonlySet<TaskStatus> = new Set([
    "accepted",
    "in_progress",
    "waiting",
    "blocked",
  ]);
  if (!legalFrom.has(input.status)) {
    return new TaskDomainError(
      "invalid_transition",
      `cannot complete from status "${input.status}"`,
      { from: input.status },
    );
  }
  if (!input.completedAt) {
    return new TaskDomainError("missing_completed_at", "done requires completedAt");
  }
  // completedBy required when the actor is known — i.e. an actorMemberId
  // was provided by the caller. The caller signals "actor unknown" by
  // omitting actorMemberId.
  if (input.actorMemberId && !input.completedByMemberId) {
    return new TaskDomainError(
      "missing_assignee",
      "completedByMemberId is required when the actor is known",
    );
  }
  return null;
}

// -------- Transition core --------

export interface TransitionInput {
  to: TaskStatus;
  at: string; // ISO — event timestamp
  actorMemberId: string; // who performed the transition
  completedAt?: string; // required when to === "done"
  completedByMemberId?: string;
  cancelReason?: string;
  note?: string;
}

export interface TransitionResult {
  ok: true;
  instance: TaskInstance;
}

/**
 * True iff `to` is a legal next status from `from` per the canonical table.
 * NOTE: also enforces that same-status "transitions" are not allowed.
 */
export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return false;
  return allowedNextStatuses(from).includes(to);
}

/**
 * Applies a transition to a task instance. Returns a NEW instance (never
 * mutates input). Throws `TaskDomainError` for any invalid transition or
 * missing required field. UI callers should surface `error.code` /
 * `error.message` without re-interpreting.
 */
export function transitionTask(instance: TaskInstance, input: TransitionInput): TaskInstance {
  const { to, at, actorMemberId } = input;

  if (isTerminal(instance.status)) {
    throw new TaskDomainError(
      "terminal_state",
      `task ${instance.id} is already in terminal state "${instance.status}"`,
      { status: instance.status },
    );
  }

  if (instance.status === to) {
    throw new TaskDomainError(
      "already_in_status",
      `task ${instance.id} is already in status "${to}"`,
      { status: to },
    );
  }

  if (!canTransitionTask(instance.status, to)) {
    throw new TaskDomainError(
      "invalid_transition",
      `illegal transition ${instance.status} → ${to}`,
      { from: instance.status, to },
    );
  }

  // Per-target additional requirements.
  if (to === "done") {
    const err = validateTaskForCompletion({
      status: instance.status,
      completedAt: input.completedAt,
      completedByMemberId: input.completedByMemberId,
      actorMemberId,
    });
    if (err) throw err;
  }

  if ((to === "cancelled" || to === "skipped") && !input.cancelReason) {
    throw new TaskDomainError("missing_cancel_reason", `${to} requires a cancelReason`, { to });
  }

  if (to === "assigned" && instance.assignment === null) {
    throw new TaskDomainError(
      "missing_assignee",
      "cannot set status assigned without an assignment",
    );
  }

  const activity: TaskActivity = {
    id: `act_${Math.random().toString(36).slice(2, 10)}`,
    kind:
      to === "done"
        ? "completed"
        : to === "cancelled"
          ? "cancelled"
          : to === "skipped"
            ? "skipped"
            : "status_changed",
    at,
    byMemberId: actorMemberId,
    from: instance.status,
    to,
    note: input.note,
  };

  const next: TaskInstance = {
    ...instance,
    status: to,
    updatedAt: at,
    completedAt: to === "done" ? input.completedAt : instance.completedAt,
    completedByMemberId:
      to === "done"
        ? (input.completedByMemberId ?? instance.completedByMemberId)
        : instance.completedByMemberId,
    cancelledAt: to === "cancelled" || to === "skipped" ? at : instance.cancelledAt,
    cancelReason:
      to === "cancelled" || to === "skipped" ? input.cancelReason : instance.cancelReason,
    startedAt: to === "in_progress" && !instance.startedAt ? at : instance.startedAt,
    activity: [...instance.activity, activity],
  };

  return next;
}

// -------- Template ↔ instance boundary --------

export function templateSnapshot(template: TaskTemplate, capturedAt: string): TemplateSnapshot {
  return {
    templateId: template.id,
    revision: template.revision,
    title: template.title,
    description: template.description,
    priority: template.defaultPriority,
    adultsOnly: template.adultsOnly,
    requiresApproval: template.requiresApproval,
    capturedAt,
  };
}

export interface CreateInstanceInput {
  id: string;
  createdAt: string; // ISO
  createdByMemberId: string;
  assignment?: TaskAssignment | null;
  dueAt?: string | null;
  source?: TaskSource;
  priorityOverride?: TaskPriority;
  titleOverride?: string;
}

/**
 * Instantiates a task from a template while freezing the template state at
 * creation time. Later template edits do not touch the returned instance.
 *
 * Rule: a task without both an assignee AND a dueAt stays in `inbox`.
 * With an assignee AND dueAt but no explicit start, it becomes `assigned`.
 */
export function createTaskInstanceSnapshot(
  template: TaskTemplate,
  input: CreateInstanceInput,
): TaskInstance {
  const snapshot = templateSnapshot(template, input.createdAt);
  const assignment = input.assignment ?? null;
  const dueAt = input.dueAt ?? null;
  const hasBoth = assignment !== null && dueAt !== null;
  const status: TaskStatus = hasBoth ? "assigned" : "inbox";

  return {
    id: input.id,
    status,
    title: input.titleOverride ?? snapshot.title,
    description: snapshot.description,
    priority: input.priorityOverride ?? snapshot.priority,
    source: input.source ?? "template",
    templateId: template.id,
    templateSnapshot: snapshot,
    assignment,
    dueAt,
    adultsOnly: snapshot.adultsOnly,
    requiresApproval: snapshot.requiresApproval,
    createdAt: input.createdAt,
    createdByMemberId: input.createdByMemberId,
    updatedAt: input.createdAt,
    activity: [
      {
        id: `act_${Math.random().toString(36).slice(2, 10)}`,
        kind: "created",
        at: input.createdAt,
        byMemberId: input.createdByMemberId,
        to: status,
      },
    ],
  };
}
