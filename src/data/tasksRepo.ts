// In-memory task repository. Prototype only — no persistence across refresh,
// no server, no RLS. All state changes go through here so UI never mutates
// domain objects directly.

import {
  createTaskInstanceSnapshot,
  transitionTask,
  type TaskInstance,
  type TaskAssignment,
  type TaskPriority,
  type TaskStatus,
  type TaskTemplate,
  type TransitionInput,
} from "@/domain/task";
import { isSoftDeleted, occurrenceKey } from "@/domain/recurrence";

type Listener = () => void;

interface RepoState {
  tasks: TaskInstance[];
  /** When true, mutating operations throw — used by UI failure tests / demos. */
  simulateFailure: boolean;
}

let state: RepoState = {
  tasks: seed(),
  simulateFailure: false,
};

const listeners = new Set<Listener>();

function emit() {
  state = { ...state, tasks: [...state.tasks] };
  for (const l of listeners) l();
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export interface CreateManualTaskInput {
  title: string;
  priority?: TaskPriority;
  assigneeMemberId?: string | null;
  assignedByMemberId?: string;
  dueAt?: string | null;
  note?: string;
  adultsOnly?: boolean;
  createdByMemberId: string;
}

/**
 * Creates a one-off (non-template) task. Status is derived per the domain
 * rules stated in prompt 6.2:
 *   - no assignee AND no dueAt   → inbox
 *   - dueAt only (no assignee)   → planned  (surfaces in "requires assignment")
 *   - assignee AND dueAt         → assigned
 *   - assignee only              → inbox    (requires dueAt to leave inbox)
 */
export function createManualTask(input: CreateManualTaskInput): TaskInstance {
  if (state.simulateFailure) {
    throw new Error("שמירה נכשלה (מצב סימולציה)");
  }
  const trimmed = input.title.trim();
  if (!trimmed) {
    throw new Error("כותרת חובה");
  }
  const created = nowIso();
  const hasAssignee = !!input.assigneeMemberId;
  const hasDue = !!input.dueAt;

  let status: TaskStatus;
  if (hasAssignee && hasDue) status = "assigned";
  else if (!hasAssignee && hasDue) status = "planned";
  else status = "inbox";

  const assignment: TaskAssignment | null = hasAssignee
    ? {
        memberId: input.assigneeMemberId!,
        assignedAt: created,
        assignedByMemberId: input.assignedByMemberId ?? input.createdByMemberId,
      }
    : null;

  const task: TaskInstance = {
    id: uid("ti"),
    status,
    title: trimmed,
    description: input.note?.trim() || undefined,
    priority: input.priority ?? "normal",
    source: "manual",
    templateId: undefined,
    templateSnapshot: undefined,
    assignment,
    dueAt: input.dueAt ?? null,
    adultsOnly: input.adultsOnly,
    createdAt: created,
    createdByMemberId: input.createdByMemberId,
    updatedAt: created,
    activity: [
      {
        id: uid("act"),
        kind: "created",
        at: created,
        byMemberId: input.createdByMemberId,
        to: status,
      },
    ],
  };
  state = { ...state, tasks: [task, ...state.tasks] };
  emit();
  return task;
}

export interface UpdateManualPatch {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  dueAt?: string | null;
  adultsOnly?: boolean;
  note?: string;
}

/**
 * Field-level edit for manual tasks. Status transitions MUST go through
 * `transition()` — this function refuses to touch `status`.
 */
export function updateManualTask(id: string, patch: UpdateManualPatch): TaskInstance {
  if (state.simulateFailure) {
    throw new Error("שמירה נכשלה (מצב סימולציה)");
  }
  const idx = state.tasks.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("משימה לא נמצאה");
  const current = state.tasks[idx]!;
  const at = nowIso();
  const merged: TaskInstance = {
    ...current,
    title: patch.title !== undefined ? patch.title.trim() || current.title : current.title,
    description: patch.description ?? current.description,
    priority: patch.priority ?? current.priority,
    dueAt: patch.dueAt !== undefined ? patch.dueAt : current.dueAt,
    adultsOnly: patch.adultsOnly ?? current.adultsOnly,
    updatedAt: at,
  };
  state = {
    ...state,
    tasks: [...state.tasks.slice(0, idx), merged, ...state.tasks.slice(idx + 1)],
  };
  emit();
  return merged;
}

/**
 * Assigns or unassigns a task. Also normalises status through the domain:
 *   - inbox → assigned when both assignee AND dueAt are present
 *   - planned → assigned when both are present
 *   - assigned → inbox on unassign (rolls back to unassigned-allowed zone)
 * All status changes are performed via `transitionTask` (domain).
 */
export function assignTask(
  id: string,
  input: { memberId: string | null; actorMemberId: string; dueAt?: string | null },
): TaskInstance {
  if (state.simulateFailure) throw new Error("שמירה נכשלה (מצב סימולציה)");
  const idx = state.tasks.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("משימה לא נמצאה");
  const current = state.tasks[idx]!;
  const at = nowIso();

  const dueAt = input.dueAt !== undefined ? input.dueAt : current.dueAt;
  const nextAssignment: TaskAssignment | null = input.memberId
    ? {
        memberId: input.memberId,
        assignedAt: at,
        assignedByMemberId: input.actorMemberId,
      }
    : null;

  const withAssignment: TaskInstance = {
    ...current,
    assignment: nextAssignment,
    dueAt: dueAt ?? null,
    updatedAt: at,
    activity: [
      ...current.activity,
      {
        id: uid("act"),
        kind: nextAssignment ? "assigned" : "unassigned",
        at,
        byMemberId: input.actorMemberId,
      },
    ],
  };

  // Auto status normalisation via domain transitions.
  let final = withAssignment;
  const canBeAssigned = nextAssignment !== null && !!dueAt;
  if (canBeAssigned && (final.status === "inbox" || final.status === "planned")) {
    final = transitionTask(final, { to: "assigned", at, actorMemberId: input.actorMemberId });
  } else if (!nextAssignment && final.status === "assigned") {
    final = transitionTask(final, { to: "inbox", at, actorMemberId: input.actorMemberId });
  } else if (!nextAssignment && final.status === "planned" && !dueAt) {
    final = transitionTask(final, { to: "inbox", at, actorMemberId: input.actorMemberId });
  } else if (!nextAssignment && !dueAt && final.status !== "inbox") {
    // fall-through
  }

  state = {
    ...state,
    tasks: [...state.tasks.slice(0, idx), final, ...state.tasks.slice(idx + 1)],
  };
  emit();
  return final;
}

/**
 * Performs a status transition through the domain. Any illegal transition
 * throws `TaskDomainError` and state is unchanged. UI surfaces the error;
 * it does not decide legality.
 */
export function transition(id: string, input: TransitionInput): TaskInstance {
  if (state.simulateFailure) throw new Error("שמירה נכשלה (מצב סימולציה)");
  const idx = state.tasks.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("משימה לא נמצאה");
  const current = state.tasks[idx]!;
  const next = transitionTask(current, input); // may throw TaskDomainError
  state = {
    ...state,
    tasks: [...state.tasks.slice(0, idx), next, ...state.tasks.slice(idx + 1)],
  };
  emit();
  return next;
}

// -------- Query helpers --------

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAll(): ReadonlyArray<TaskInstance> {
  return state.tasks;
}

export function getById(id: string): TaskInstance | undefined {
  return state.tasks.find((t) => t.id === id);
}

export function getSimulateFailure(): boolean {
  return state.simulateFailure;
}

export function setSimulateFailure(v: boolean): void {
  state = { ...state, simulateFailure: v };
  emit();
}

export function reset(): void {
  state = { tasks: seed(), simulateFailure: false };
  emit();
}

export function clear(): void {
  state = { tasks: [], simulateFailure: false };
  emit();
}

// -------- Seed data (demo) --------

function seed(): TaskInstance[] {
  const t0 = new Date();
  const tomorrow = new Date(t0.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const yesterday = new Date(t0.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const now = t0.toISOString();

  return [
    {
      id: "ti_demo_1",
      status: "assigned",
      title: "לאסוף חבילה מהדואר",
      priority: "high",
      source: "manual",
      assignment: {
        memberId: "m_owner",
        assignedAt: now,
        assignedByMemberId: "m_owner",
      },
      dueAt: tomorrow,
      createdAt: now,
      createdByMemberId: "m_owner",
      updatedAt: now,
      activity: [{ id: "act_s1", kind: "created", at: now, byMemberId: "m_owner", to: "assigned" }],
    },
    {
      id: "ti_demo_2",
      status: "planned",
      title: "לקנות מתנת יום הולדת לגיל",
      priority: "normal",
      source: "manual",
      assignment: null,
      dueAt: tomorrow,
      createdAt: now,
      createdByMemberId: "m_owner",
      updatedAt: now,
      activity: [{ id: "act_s2", kind: "created", at: now, byMemberId: "m_owner", to: "planned" }],
    },
    {
      id: "ti_demo_3",
      status: "inbox",
      title: "לקבוע פגישה עם המחנכת",
      priority: "normal",
      source: "manual",
      assignment: null,
      dueAt: null,
      createdAt: now,
      createdByMemberId: "m_owner",
      updatedAt: now,
      activity: [{ id: "act_s3", kind: "created", at: now, byMemberId: "m_owner", to: "inbox" }],
    },
    {
      id: "ti_demo_4",
      status: "in_progress",
      title: "לסדר את חדר הכביסה",
      priority: "low",
      source: "manual",
      assignment: {
        memberId: "m_adult",
        assignedAt: yesterday,
        assignedByMemberId: "m_owner",
      },
      dueAt: yesterday,
      startedAt: yesterday,
      createdAt: yesterday,
      createdByMemberId: "m_owner",
      updatedAt: yesterday,
      activity: [
        { id: "act_s4a", kind: "created", at: yesterday, byMemberId: "m_owner", to: "assigned" },
        {
          id: "act_s4b",
          kind: "status_changed",
          at: yesterday,
          byMemberId: "m_adult",
          from: "assigned",
          to: "in_progress",
        },
      ],
    },
    {
      id: "ti_demo_5_adults",
      status: "assigned",
      title: "לתאם שיחה עם עורך הדין",
      priority: "urgent",
      source: "manual",
      assignment: {
        memberId: "m_owner",
        assignedAt: now,
        assignedByMemberId: "m_owner",
      },
      dueAt: tomorrow,
      adultsOnly: true,
      createdAt: now,
      createdByMemberId: "m_owner",
      updatedAt: now,
      activity: [{ id: "act_s5", kind: "created", at: now, byMemberId: "m_owner", to: "assigned" }],
    },
  ];
}
