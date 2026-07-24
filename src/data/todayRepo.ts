// In-memory Today repo. UI must NOT import fixtures directly — always via this repo.
// State is process-memory only. No localStorage, no server, no persistence.

import type {
  EventItem,
  FollowUpDueItem,
  Role,
  ShoppingSummary,
  TaskItem,
  TodayDataset,
  TodayMember,
  TransportItem,
} from "@/domain/today";

export type TodayViewState =
  | "normal"
  | "busy"
  | "nearly_empty"
  | "loading"
  | "error"
  | "offline"
  | "permission_denied"
  | "child";

const M = {
  owner: {
    id: "m_owner",
    name: "דנה לוי",
    role: "owner" as Role,
    color: "#7BA7C7",
    initials: "דל",
  },
  adult: {
    id: "m_adult",
    name: "יואב לוי",
    role: "adult" as Role,
    color: "#C79A7B",
    initials: "יל",
  },
  child1: { id: "m_child1", name: "נועה", role: "child" as Role, color: "#8CB48C", initials: "נו" },
  child2: { id: "m_child2", name: "איתי", role: "child" as Role, color: "#C77B9E", initials: "אי" },
  guest: {
    id: "m_guest",
    name: "מירי (מטפלת)",
    role: "guest" as Role,
    color: "#B49B7B",
    initials: "מי",
  },
} satisfies Record<string, TodayMember>;

function todayAt(h: number, min = 0): string {
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d.toISOString();
}
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

function baseMembers(): TodayMember[] {
  return [M.owner, M.adult, M.child1, M.child2, M.guest];
}

function normalFixtures(): Omit<TodayDataset, "viewerId" | "viewerRole" | "now"> {
  const tasks: TaskItem[] = [
    {
      id: "t_normal",
      kind: "task",
      title: "לתאם פגישת שיניים לנועה",
      assigneeId: M.owner.id,
      dueAt: todayAt(18, 0),
      status: "open",
      personal: true,
    },
    {
      id: "t_overdue",
      kind: "task",
      title: "לחדש את דרכון של איתי",
      assigneeId: M.adult.id,
      dueAt: hoursAgo(30),
      status: "overdue",
    },
    {
      id: "t_adults",
      kind: "task",
      title: "סקירת הוראות קבע",
      assigneeId: M.owner.id,
      dueAt: todayAt(21, 30),
      status: "open",
      adultsOnly: true,
      personal: true,
    },
    {
      id: "t_unassigned",
      kind: "task",
      title: "להזמין תור למוסך",
      assigneeId: null,
      dueAt: todayAt(20, 0),
      status: "open",
    },
    {
      id: "t_approval",
      kind: "task",
      title: "רשימת ציוד לטיול של נועה",
      assigneeId: M.child1.id,
      dueAt: todayAt(19, 0),
      status: "waiting_approval",
    },
  ];

  const transports: TransportItem[] = [
    {
      id: "tr_unassigned",
      kind: "transport",
      childId: M.child2.id,
      direction: "pickup",
      place: "גן שקד",
      timeAt: todayAt(16, 15),
      responsibleId: null,
      status: "unassigned",
      recommendedLeaveAt: todayAt(15, 50),
    },
    {
      id: "tr_approval",
      kind: "transport",
      childId: M.child1.id,
      direction: "pickup",
      place: "חוג ציור",
      timeAt: todayAt(17, 30),
      responsibleId: M.guest.id,
      status: "waiting_approval",
      recommendedLeaveAt: todayAt(17, 10),
    },
    {
      id: "tr_ok",
      kind: "transport",
      childId: M.child1.id,
      direction: "dropoff",
      place: "בית ספר",
      timeAt: todayAt(7, 45),
      responsibleId: M.adult.id,
      status: "confirmed",
    },
  ];

  const events: EventItem[] = [
    {
      id: "e_meeting",
      kind: "event",
      title: "אסיפת הורים כיתה ג'",
      timeAt: todayAt(20, 0),
      location: "בית ספר רמון",
    },
  ];

  const followUps: FollowUpDueItem[] = [
    {
      id: "f_bank",
      kind: "followup",
      title: "החזר עמלה מהבנק",
      externalParty: "בנק דיסקונט",
      responsibleId: M.owner.id,
      dueAt: hoursAgo(2),
    },
  ];

  const shopping: ShoppingSummary = {
    activeListName: "סופר השבועי",
    itemsCount: 12,
    urgentCount: 2,
  };

  return { members: baseMembers(), tasks, transports, events, followUps, shopping };
}

function busyFixtures(): Omit<TodayDataset, "viewerId" | "viewerRole" | "now"> {
  const base = normalFixtures();
  const extraTasks: TaskItem[] = Array.from({ length: 5 }).map((_, i) => ({
    id: `t_busy_${i}`,
    kind: "task",
    title: `משימה נוספת ${i + 1}`,
    assigneeId: i % 2 === 0 ? M.owner.id : M.adult.id,
    dueAt: todayAt(19 + (i % 3), (i * 7) % 60),
    status: "open",
    personal: i % 2 === 0,
  }));
  const extraTransport: TransportItem = {
    id: "tr_busy",
    kind: "transport",
    childId: M.child2.id,
    direction: "pickup",
    place: "חוג כדורגל",
    timeAt: todayAt(18, 45),
    responsibleId: M.owner.id,
    status: "confirmed",
  };
  return {
    ...base,
    tasks: [...base.tasks, ...extraTasks],
    transports: [...base.transports, extraTransport],
  };
}

function nearlyEmptyFixtures(): Omit<TodayDataset, "viewerId" | "viewerRole" | "now"> {
  return {
    members: baseMembers(),
    tasks: [
      {
        id: "t_one",
        kind: "task",
        title: "לקנות חלב",
        assigneeId: M.owner.id,
        dueAt: todayAt(19, 0),
        status: "open",
        personal: true,
      },
    ],
    transports: [],
    events: [],
    followUps: [],
    shopping: null,
  };
}

// -------- Store --------

interface State {
  view: TodayViewState;
  dataset: TodayDataset;
}

function buildDataset(view: TodayViewState): TodayDataset {
  const viewerRole: Role = view === "child" ? "child" : "owner";
  const viewerId = view === "child" ? M.child1.id : M.owner.id;
  const base =
    view === "busy"
      ? busyFixtures()
      : view === "nearly_empty"
        ? nearlyEmptyFixtures()
        : normalFixtures();
  return { now: new Date().toISOString(), viewerId, viewerRole, ...base };
}

let state: State = { view: "normal", dataset: buildDataset("normal") };
const listeners = new Set<() => void>();

function emit() {
  state = { ...state, dataset: { ...state.dataset } };
  listeners.forEach((l) => l());
}

export const todayRepo = {
  subscribe(l: () => void): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot(): State {
    return state;
  },
  setView(view: TodayViewState): void {
    state = { view, dataset: buildDataset(view) };
    emit();
  },
  /** Demo action — mutates in-memory state only. */
  assignTransport(transportId: string, memberId: string): void {
    const transports = state.dataset.transports.map((t) =>
      t.id === transportId ? { ...t, responsibleId: memberId, status: "confirmed" as const } : t,
    );
    state = { ...state, dataset: { ...state.dataset, transports } };
    emit();
  },
  approveItem(id: string): void {
    const tasks = state.dataset.tasks.map((t) =>
      t.id === id && t.status === "waiting_approval" ? { ...t, status: "open" as const } : t,
    );
    const transports = state.dataset.transports.map((t) =>
      t.id === id && t.status === "waiting_approval" ? { ...t, status: "confirmed" as const } : t,
    );
    state = { ...state, dataset: { ...state.dataset, tasks, transports } };
    emit();
  },
  completeTask(id: string): void {
    const tasks = state.dataset.tasks.map((t) =>
      t.id === id ? { ...t, status: "done" as const } : t,
    );
    state = { ...state, dataset: { ...state.dataset, tasks } };
    emit();
  },
  claimTask(id: string, memberId: string): void {
    const tasks = state.dataset.tasks.map((t) =>
      t.id === id ? { ...t, assigneeId: memberId } : t,
    );
    state = { ...state, dataset: { ...state.dataset, tasks } };
    emit();
  },
};
