// Pure domain for the Today screen. No React, no I/O.
//
// SECURITY: adultsOnly / restricted filtering here is UX-only. Real
// permission enforcement must live server-side (RLS + edge functions).

export type Role = "owner" | "adult" | "child" | "guest";

export interface TodayMember {
  id: string;
  name: string;
  role: Role;
  color: string;
  initials: string;
}

export type TaskStatus = "open" | "in_progress" | "done" | "overdue" | "waiting_approval";

export interface TaskItem {
  id: string;
  kind: "task";
  title: string;
  assigneeId: string | null;
  dueAt: string | null; // ISO
  status: TaskStatus;
  adultsOnly?: boolean;
  requiresApproval?: boolean;
  personal?: boolean; // true = counts as "mine" for the current viewer
}

export type TransportStatus = "planned" | "unassigned" | "waiting_approval" | "confirmed";

export interface TransportItem {
  id: string;
  kind: "transport";
  childId: string;
  direction: "pickup" | "dropoff";
  place: string;
  timeAt: string; // ISO
  responsibleId: string | null;
  status: TransportStatus;
  recommendedLeaveAt?: string; // ISO
}

export interface EventItem {
  id: string;
  kind: "event";
  title: string;
  timeAt: string; // ISO
  location?: string;
  adultsOnly?: boolean;
}

export interface FollowUpDueItem {
  id: string;
  kind: "followup";
  title: string;
  externalParty: string;
  responsibleId: string;
  dueAt: string; // ISO
  adultsOnly?: boolean;
}

export interface ShoppingSummary {
  activeListName: string;
  itemsCount: number;
  urgentCount: number;
}

export interface TodayDataset {
  now: string; // ISO
  viewerId: string;
  viewerRole: Role;
  members: TodayMember[];
  tasks: TaskItem[];
  transports: TransportItem[];
  events: EventItem[];
  followUps: FollowUpDueItem[];
  shopping: ShoppingSummary | null;
}

// -------- Pure selectors --------

export function visibleToRole<T extends { adultsOnly?: boolean }>(
  items: ReadonlyArray<T>,
  role: Role,
): T[] {
  return items.filter((i) => !(i.adultsOnly && role === "child"));
}

export function isOverdue(t: TaskItem, nowIso: string): boolean {
  if (t.status === "done") return false;
  if (t.status === "overdue") return true;
  if (!t.dueAt) return false;
  return new Date(t.dueAt).getTime() < new Date(nowIso).getTime();
}

/** Operational risk: overdue tasks + transports without responsible. */
export function selectRisks(d: TodayDataset): {
  overdueTasks: TaskItem[];
  unassignedTransports: TransportItem[];
} {
  const overdueTasks = d.tasks.filter((t) => isOverdue(t, d.now));
  const unassignedTransports = d.transports.filter((t) => t.responsibleId === null);
  return { overdueTasks, unassignedTransports };
}

/** Next-in-time: earliest upcoming event or transport (future only). */
export function selectNext(d: TodayDataset): TransportItem | EventItem | null {
  const nowMs = new Date(d.now).getTime();
  const pool: Array<{ at: number; item: TransportItem | EventItem }> = [];
  for (const t of d.transports) {
    const at = new Date(t.timeAt).getTime();
    if (at >= nowMs) pool.push({ at, item: t });
  }
  for (const e of d.events) {
    const at = new Date(e.timeAt).getTime();
    if (at >= nowMs) pool.push({ at, item: e });
  }
  if (pool.length === 0) return null;
  pool.sort((a, b) => a.at - b.at);
  return pool[0]!.item;
}

export function selectTransportsToday(d: TodayDataset): TransportItem[] {
  return [...d.transports].sort(
    (a, b) => new Date(a.timeAt).getTime() - new Date(b.timeAt).getTime(),
  );
}

export function selectMyTasks(d: TodayDataset): TaskItem[] {
  return visibleToRole(
    d.tasks.filter((t) => t.assigneeId === d.viewerId && t.status !== "done"),
    d.viewerRole,
  );
}

export function selectWaitingApproval(d: TodayDataset): Array<TaskItem | TransportItem> {
  const tasks: TaskItem[] = visibleToRole(
    d.tasks.filter((t) => t.status === "waiting_approval"),
    d.viewerRole,
  );
  const transports = d.transports.filter((t) => t.status === "waiting_approval");
  return [...tasks, ...transports];
}

export function selectFollowUpsDue(d: TodayDataset): FollowUpDueItem[] {
  const nowMs = new Date(d.now).getTime();
  return visibleToRole(
    d.followUps.filter((f) => new Date(f.dueAt).getTime() <= nowMs),
    d.viewerRole,
  );
}

export function selectUnassignedTasks(d: TodayDataset): TaskItem[] {
  return visibleToRole(
    d.tasks.filter((t) => t.assigneeId === null && t.status !== "done"),
    d.viewerRole,
  );
}

export function memberById(d: TodayDataset, id: string | null): TodayMember | null {
  if (!id) return null;
  return d.members.find((m) => m.id === id) ?? null;
}
