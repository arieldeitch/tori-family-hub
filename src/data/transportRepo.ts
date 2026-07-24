// In-memory typed repository for transport rides. UI must go through this
// repo (or an application service) rather than reading fixtures directly.
// State is process-memory only.

import {
  assignTransport,
  transitionTransport,
  type TransitionContext,
  type TransportRide,
  type TransportStatus,
} from "@/domain/transport";

export type TransportViewState =
  | "normal"
  | "empty"
  | "loading"
  | "error"
  | "permission_denied";

export interface TransportMemberRef {
  id: string;
  name: string;
  initials: string;
  color: string;
}

// Deterministic demo members (kept local; matches calendarRepo palette).
export const transportMembers: Record<string, TransportMemberRef> = {
  m1: { id: "m1", name: "דנה", initials: "דל", color: "#7BA7C7" },
  m2: { id: "m2", name: "יואב", initials: "יל", color: "#C79A7B" },
  m3: { id: "m3", name: "נועה", initials: "נל", color: "#8CB48C" },
  m4: { id: "m4", name: "איתי", initials: "אל", color: "#C77B9E" },
};

/** The "viewer" in the demo — used for actor-scoped rules. */
export const DEMO_VIEWER_ID = "m1";

interface State {
  view: TransportViewState;
  rides: TransportRide[];
}

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

function isoIn(hours: number, minutes = 0): string {
  const d = new Date();
  d.setHours(d.getHours() + hours, minutes, 0, 0);
  return d.toISOString();
}

function uid(): string {
  return `r_${Math.random().toString(36).slice(2, 9)}`;
}

function seed(): TransportRide[] {
  const nowIso = new Date().toISOString();
  return [
    {
      id: "r1",
      childMemberId: "m3",
      direction: "pickup",
      timeAt: isoIn(2),
      recommendedDepartureAt: isoIn(1, 40),
      acceptanceDeadlineAt: isoIn(1),
      origin: "מתנ״ס שכונתי",
      destination: "בית",
      status: "unassigned",
      equipment: "בוסטר",
      notes: "מחכה בכניסה הראשית.",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: "r2",
      childMemberId: "m4",
      direction: "dropoff",
      timeAt: isoIn(4),
      recommendedDepartureAt: isoIn(3, 30),
      acceptanceDeadlineAt: isoIn(3),
      origin: "בית",
      destination: "אימון כדורגל",
      assigneeMemberId: "m1",
      backupPlaceholder: "יואב (טרם מוגדר גיבוי אמיתי)",
      equipment: "בקבוק מים, נעלי כדורגל",
      status: "pending_acceptance",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: "r3",
      childMemberId: "m3",
      direction: "pickup",
      timeAt: isoIn(6),
      recommendedDepartureAt: isoIn(5, 30),
      origin: "בית ספר",
      destination: "בית",
      assigneeMemberId: "m2",
      status: "accepted",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: "r4",
      childMemberId: "m4",
      direction: "dropoff",
      timeAt: isoIn(-1),
      origin: "בית",
      destination: "חוג רובוטיקה",
      assigneeMemberId: "m1",
      status: "en_route",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: "r5",
      childMemberId: "m3",
      direction: "pickup",
      timeAt: isoIn(-4),
      origin: "בלט",
      destination: "בית",
      assigneeMemberId: "m2",
      previousAssigneeMemberId: "m1",
      status: "transferred",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];
}

let state: State = { view: "normal", rides: seed() };

function ridesFor(view: TransportViewState): TransportRide[] {
  switch (view) {
    case "empty":
    case "loading":
    case "error":
    case "permission_denied":
      return [];
    case "normal":
    default:
      return seed();
  }
}

function update(rideId: string, mapper: (r: TransportRide) => TransportRide): void {
  state = {
    ...state,
    rides: state.rides.map((r) => (r.id === rideId ? mapper(r) : r)),
  };
  emit();
}

export const transportRepo = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): State {
    return state;
  },
  setView(view: TransportViewState): void {
    state = { view, rides: ridesFor(view) };
    emit();
  },
  getById(id: string): TransportRide | undefined {
    return state.rides.find((r) => r.id === id);
  },
  create(
    input: Omit<TransportRide, "id" | "status" | "createdAt" | "updatedAt">,
  ): TransportRide {
    const now = new Date().toISOString();
    const ride: TransportRide = {
      ...input,
      id: uid(),
      status: input.assigneeMemberId ? "pending_acceptance" : "unassigned",
      createdAt: now,
      updatedAt: now,
    };
    state = { ...state, rides: [ride, ...state.rides] };
    emit();
    return ride;
  },
  edit(id: string, patch: Partial<Omit<TransportRide, "id" | "status" | "createdAt">>): void {
    update(id, (r) => ({ ...r, ...patch, updatedAt: new Date().toISOString() }));
  },
  assign(id: string, assigneeMemberId: string): void {
    update(id, (r) => assignTransport(r, assigneeMemberId));
  },
  transition(id: string, to: TransportStatus, ctx: TransitionContext): void {
    update(id, (r) => transitionTransport(r, to, ctx));
  },
};
