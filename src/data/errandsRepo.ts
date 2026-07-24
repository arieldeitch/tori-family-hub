// In-memory errands repository. Prototype only — no persistence.
// State transitions delegate to the task domain (`transitionTask`) so this
// module does NOT duplicate the task state machine.

import {
  transitionTask,
  type TaskAssignment,
  type TaskStatus,
  type TransitionInput,
} from "@/domain/task";
import { asTaskInstance, type Errand } from "@/domain/errand";

type Listener = () => void;

interface RepoState {
  errands: Errand[];
}

let state: RepoState = { errands: seed() };
const listeners = new Set<Listener>();

function emit() {
  state = { ...state, errands: [...state.errands] };
  for (const l of listeners) l();
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export interface CreateErrandInput {
  title: string;
  location?: string;
  areaLabel?: string;
  assigneeMemberId?: string | null;
  dueAt?: string | null;
  canDoWhenNearby?: boolean;
  linkedTaskInstanceId?: string;
  note?: string;
  createdByMemberId: string;
}

export function createErrand(input: CreateErrandInput): Errand {
  const title = input.title.trim();
  if (!title) throw new Error("כותרת חובה");
  const at = nowIso();
  const assignment: TaskAssignment | null = input.assigneeMemberId
    ? {
        memberId: input.assigneeMemberId,
        assignedAt: at,
        assignedByMemberId: input.createdByMemberId,
      }
    : null;

  let status: TaskStatus;
  if (assignment && input.dueAt) status = "assigned";
  else if (!assignment && input.dueAt) status = "planned";
  else status = "inbox";

  const errand: Errand = {
    id: uid("er"),
    title,
    location: input.location?.trim() ?? "",
    areaLabel: input.areaLabel?.trim() ?? "",
    assignment,
    dueAt: input.dueAt ?? null,
    status,
    canDoWhenNearby: input.canDoWhenNearby ?? false,
    linkedTaskInstanceId: input.linkedTaskInstanceId,
    note: input.note?.trim() || undefined,
    createdAt: at,
    createdByMemberId: input.createdByMemberId,
    updatedAt: at,
    activity: [
      {
        id: uid("act"),
        kind: "created",
        at,
        byMemberId: input.createdByMemberId,
        to: status,
      },
    ],
  };
  state = { ...state, errands: [errand, ...state.errands] };
  emit();
  return errand;
}

export interface UpdateErrandPatch {
  title?: string;
  location?: string;
  areaLabel?: string;
  assigneeMemberId?: string | null;
  actorMemberId?: string;
  dueAt?: string | null;
  canDoWhenNearby?: boolean;
  linkedTaskInstanceId?: string | null;
  note?: string;
}

export function updateErrand(id: string, patch: UpdateErrandPatch): Errand {
  const idx = state.errands.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error("סידור לא נמצא");
  const current = state.errands[idx]!;
  const at = nowIso();

  let assignment = current.assignment;
  if (patch.assigneeMemberId !== undefined) {
    assignment = patch.assigneeMemberId
      ? {
          memberId: patch.assigneeMemberId,
          assignedAt: at,
          assignedByMemberId: patch.actorMemberId ?? current.createdByMemberId,
        }
      : null;
  }

  const merged: Errand = {
    ...current,
    title: patch.title !== undefined ? patch.title.trim() || current.title : current.title,
    location: patch.location !== undefined ? patch.location.trim() : current.location,
    areaLabel: patch.areaLabel !== undefined ? patch.areaLabel.trim() : current.areaLabel,
    assignment,
    dueAt: patch.dueAt !== undefined ? patch.dueAt : current.dueAt,
    canDoWhenNearby: patch.canDoWhenNearby ?? current.canDoWhenNearby,
    linkedTaskInstanceId:
      patch.linkedTaskInstanceId === null
        ? undefined
        : (patch.linkedTaskInstanceId ?? current.linkedTaskInstanceId),
    note: patch.note !== undefined ? patch.note.trim() || undefined : current.note,
    updatedAt: at,
  };

  // Normalise status via domain when assignment/dueAt change.
  let final = merged;
  const canBeAssigned = assignment !== null && !!merged.dueAt;
  const actor = patch.actorMemberId ?? current.createdByMemberId;
  if (canBeAssigned && (final.status === "inbox" || final.status === "planned")) {
    const next = transitionTask(asTaskInstance(final), {
      to: "assigned",
      at,
      actorMemberId: actor,
    });
    final = { ...final, status: next.status, activity: next.activity };
  } else if (!assignment && final.status === "assigned") {
    const next = transitionTask(asTaskInstance(final), {
      to: "inbox",
      at,
      actorMemberId: actor,
    });
    final = { ...final, status: next.status, activity: next.activity };
  }

  state = {
    ...state,
    errands: [...state.errands.slice(0, idx), final, ...state.errands.slice(idx + 1)],
  };
  emit();
  return final;
}

/** Status transition — routed through the task domain (single source of truth). */
export function transition(id: string, input: TransitionInput): Errand {
  const idx = state.errands.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error("סידור לא נמצא");
  const current = state.errands[idx]!;
  const next = transitionTask(asTaskInstance(current), input);
  const merged: Errand = {
    ...current,
    status: next.status,
    activity: next.activity,
    updatedAt: input.at,
  };
  state = {
    ...state,
    errands: [...state.errands.slice(0, idx), merged, ...state.errands.slice(idx + 1)],
  };
  emit();
  return merged;
}

export function removeErrand(id: string): void {
  state = { ...state, errands: state.errands.filter((e) => e.id !== id) };
  emit();
}

// -------- Query helpers --------

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getAll(): ReadonlyArray<Errand> {
  return state.errands;
}

export function getById(id: string): Errand | undefined {
  return state.errands.find((e) => e.id === id);
}

// -------- Seed (demo) --------

function seed(): Errand[] {
  const t0 = new Date();
  const iso = (d: Date) => d.toISOString();
  const day = (offset: number, hour = 12) => {
    const d = new Date(t0);
    d.setDate(d.getDate() + offset);
    d.setHours(hour, 0, 0, 0);
    return iso(d);
  };
  const created = iso(t0);
  const make = (overrides: Partial<Errand> & { id: string; title: string }): Errand => ({
    location: "",
    areaLabel: "",
    assignment: null,
    dueAt: null,
    status: "inbox",
    canDoWhenNearby: false,
    createdAt: created,
    updatedAt: created,
    createdByMemberId: "m_owner",
    activity: [
      {
        id: `act_${overrides.id}`,
        kind: "created",
        at: created,
        byMemberId: "m_owner",
        to: overrides.status ?? "inbox",
      },
    ],
    ...overrides,
  });

  return [
    make({
      id: "er_seed_1",
      title: "איסוף חבילה מהדואר",
      location: "סניף דואר, רחוב הרצל 12",
      areaLabel: "מרכז",
      dueAt: day(0, 16),
      status: "planned",
      canDoWhenNearby: true,
      note: "פתוח עד 18:00",
    }),
    make({
      id: "er_seed_2",
      title: "החזרת ספרים לספרייה",
      location: "ספריית העירייה",
      areaLabel: "מרכז",
      status: "inbox",
      canDoWhenNearby: true,
    }),
    make({
      id: "er_seed_3",
      title: "לקחת מרשם מהמרפאה",
      location: "מרפאת קופת חולים",
      areaLabel: "צפון",
      dueAt: day(1, 10),
      status: "assigned",
      assignment: { memberId: "m_owner", assignedAt: created, assignedByMemberId: "m_owner" },
    }),
    make({
      id: "er_seed_4",
      title: "העברה בבנק",
      location: "",
      areaLabel: "",
      status: "inbox",
      note: "אין מיקום פיזי — אפשר אונליין",
    }),
  ];
}
