// Application service for the Today screen.
//
// Responsibilities:
//   1. Adapt canonical entities (TaskInstance, TransportRide, FollowUpCase,
//      ShoppingList/Item) into the Today view model (TaskItem, TransportItem,
//      FollowUpDueItem, ShoppingSummary).
//   2. Route Today actions (complete task, claim task, assign transport,
//      approve pending transport) through the canonical repos so every
//      screen sees the same state.
//
// UI must NOT import fixtures directly, and must NOT talk to the canonical
// repos to mutate — go through this service (or the repo action delegates,
// which forward here). Success = the canonical repo was updated. On error
// the caller keeps its input intact.

import * as tasksRepo from "@/data/tasksRepo";
import { transportRepo } from "@/data/transportRepo";
import * as followUpRepo from "@/data/followUpRepo";
import { shoppingRepo } from "@/data/shoppingRepo";
import { isSoftDeleted } from "@/domain/recurrence";
import type { TaskInstance } from "@/domain/task";
import type { TransportRide } from "@/domain/transport";
import type { FollowUpCase } from "@/domain/followUp";
import type { ShoppingItem, ShoppingList } from "@/domain/shopping";
import type {
  EventItem,
  FollowUpDueItem,
  Role,
  ShoppingSummary,
  TaskItem,
  TaskStatus as ViewTaskStatus,
  TodayDataset,
  TodayMember,
  TransportItem,
  TransportStatus as ViewTransportStatus,
} from "@/domain/today";
import {
  CANONICAL_MEMBERS,
  DEMO_CHILD_VIEWER_ID,
  DEMO_VIEWER_ID,
  canonicalMemberId,
  roleOf,
} from "@/data/peopleDirectory";

// -------- Adapters --------

export function toTaskItem(task: TaskInstance, viewerId: string, nowIso: string): TaskItem {
  const assignee = canonicalMemberId(task.assignment?.memberId ?? null);
  let status: ViewTaskStatus;
  switch (task.status) {
    case "done":
      status = "done";
      break;
    case "in_progress":
      status = "in_progress";
      break;
    default:
      status = "open";
  }
  const isOverdue =
    status !== "done" && !!task.dueAt && new Date(task.dueAt).getTime() < new Date(nowIso).getTime();
  if (isOverdue) status = "overdue";
  return {
    id: task.id,
    kind: "task",
    title: task.title,
    assigneeId: assignee,
    dueAt: task.dueAt ?? null,
    status,
    adultsOnly: task.adultsOnly || undefined,
    personal: assignee !== null && assignee === viewerId,
  };
}

export function toTransportItem(ride: TransportRide): TransportItem {
  const responsibleId = canonicalMemberId(ride.assigneeMemberId ?? null);
  const childId = canonicalMemberId(ride.childMemberId) ?? ride.childMemberId;
  let status: ViewTransportStatus;
  switch (ride.status) {
    case "unassigned":
      status = "unassigned";
      break;
    case "pending_acceptance":
      status = "waiting_approval";
      break;
    case "accepted":
    case "en_route":
    case "transferred":
    case "completed":
      status = "confirmed";
      break;
    case "cancelled":
      status = "planned";
      break;
  }
  return {
    id: ride.id,
    kind: "transport",
    childId,
    direction: ride.direction,
    place: ride.direction === "pickup" ? ride.origin : ride.destination,
    timeAt: ride.timeAt,
    responsibleId,
    status,
    recommendedLeaveAt: ride.recommendedDepartureAt,
  };
}

export function toFollowUpItem(c: FollowUpCase): FollowUpDueItem | null {
  if (!c.nextFollowUpAt) return null;
  return {
    id: c.id,
    kind: "followup",
    title: c.title,
    externalParty: c.externalParty,
    responsibleId: canonicalMemberId(c.responsibleMemberId) ?? c.responsibleMemberId,
    dueAt: c.nextFollowUpAt,
    adultsOnly: c.sensitivity !== "household" || undefined,
  };
}

export function toShoppingSummary(
  lists: ReadonlyArray<ShoppingList>,
  items: ReadonlyArray<ShoppingItem>,
): ShoppingSummary | null {
  const active = lists.find((l) => !l.archivedAt) ?? lists[0];
  if (!active) return null;
  const open = items.filter((i) => i.listId === active.id && i.status !== "purchased");
  if (open.length === 0 && lists.length === 0) return null;
  return {
    activeListName: active.name,
    itemsCount: open.length,
    urgentCount: open.filter((i) => i.urgency === "high").length,
  };
}

// -------- Dataset composition --------

export interface BuildOptions {
  viewerId?: string;
  viewerRole?: Role;
  events?: EventItem[];
  nowIso?: string;
}

export function buildTodayDataset(opts: BuildOptions = {}): TodayDataset {
  const nowIso = opts.nowIso ?? new Date().toISOString();
  const viewerId = opts.viewerId ?? DEMO_VIEWER_ID;
  const viewerRole: Role = opts.viewerRole ?? roleOf(viewerId);

  const tasks = tasksRepo
    .getAll()
    .filter((t) => !isSoftDeleted(t))
    .map((t) => toTaskItem(t, viewerId, nowIso));

  const rides = transportRepo.getSnapshot().rides;
  const transports = rides.map(toTransportItem);

  const followUps = followUpRepo
    .getAll()
    .map(toFollowUpItem)
    .filter((f): f is FollowUpDueItem => f !== null);

  const { lists, items } = shoppingRepo.getSnapshot();
  const shopping = toShoppingSummary(lists, items);

  return {
    now: nowIso,
    viewerId,
    viewerRole,
    members: [...CANONICAL_MEMBERS],
    tasks,
    transports,
    events: opts.events ?? [],
    followUps,
    shopping,
  };
}

// -------- Actions (delegate to canonical repos) --------

export function completeTaskAction(taskId: string, actorMemberId: string): void {
  const at = new Date().toISOString();
  const cur = tasksRepo.getById(taskId);
  // Task domain routes completion through accepted/in_progress. Bridge the
  // common Today statuses so a single "mark done" click Just Works.
  if (cur && (cur.status === "assigned" || cur.status === "planned")) {
    tasksRepo.transition(taskId, { to: "accepted", actorMemberId, at });
  }
  tasksRepo.transition(taskId, {
    to: "done",
    actorMemberId,
    at,
    completedAt: at,
    completedByMemberId: actorMemberId,
  });

}



export function claimTaskAction(taskId: string, memberId: string): void {
  tasksRepo.assignTask(taskId, { memberId, actorMemberId: memberId });
}

export function assignTransportAction(rideId: string, memberId: string): void {
  transportRepo.assign(rideId, memberId);
}

/**
 * Approve a transport pending acceptance. Delegates to transport domain
 * so the state machine remains the single authority.
 */
export function approveTransportAction(rideId: string, actorMemberId: string): void {
  transportRepo.transition(rideId, "accepted", {
    actorMemberId,
    now: new Date().toISOString(),
  });
}

export const todayViewerIds = {
  adult: DEMO_VIEWER_ID,
  child: DEMO_CHILD_VIEWER_ID,
};
