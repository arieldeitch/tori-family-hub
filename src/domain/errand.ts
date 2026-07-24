// Pure domain: errands.
//
// An errand is a task-shaped item tied to a physical location or an "on the
// way" opportunity ("קניתי לך חלב כי הייתי ליד"). It intentionally reuses
// the canonical task state machine (see ./task.ts) — this module does NOT
// duplicate transitions. Instead an Errand carries the same status/assignment
// shape as a TaskInstance, and repo mutations route through `transitionTask`.
//
// This module has NO knowledge of maps, coordinates, tracking, or presence
// detection. `location` is a free-text human hint. `areaLabel` is a
// free-text group tag. `canDoWhenNearby` is a display-only flag surfaced as
// information; the system never claims to know who is where.

import type { TaskActivity, TaskAssignment, TaskInstance, TaskStatus } from "./task";

// -------- Entity --------

export interface Errand {
  id: string;
  title: string;
  /** Free-text location hint. No coordinates, no geocoding. */
  location: string;
  /** Free-text area/group label (e.g. "מרכז", "רמת גן"). Used for grouping. */
  areaLabel: string;
  /** Assignment mirrors TaskInstance.assignment. */
  assignment: TaskAssignment | null;
  /** ISO datetime. May be null when not yet scheduled. */
  dueAt: string | null;
  status: TaskStatus;
  /** Display-only hint: "אפשר לבצע כשמישהו נמצא באזור". */
  canDoWhenNearby: boolean;
  /** Optional link to a related task instance. Display/navigation only. */
  linkedTaskInstanceId?: string;
  /** Free-text note. */
  note?: string;
  createdAt: string;
  createdByMemberId: string;
  updatedAt: string;
  activity: ReadonlyArray<TaskActivity>;
}

// -------- Task-shape adapter --------

/**
 * Projects an Errand onto a TaskInstance-shaped object so it can be handed
 * to `transitionTask` without duplicating the state machine. Only the
 * fields that `transitionTask` reads are populated; the rest are stubs.
 */
export function asTaskInstance(e: Errand): TaskInstance {
  return {
    id: e.id,
    status: e.status,
    title: e.title,
    priority: "normal",
    source: "manual",
    assignment: e.assignment,
    dueAt: e.dueAt,
    createdAt: e.createdAt,
    createdByMemberId: e.createdByMemberId,
    updatedAt: e.updatedAt,
    activity: e.activity,
  };
}

// -------- Grouping helpers (pure) --------

export interface Group<T> {
  key: string;
  label: string;
  items: ReadonlyArray<T>;
}

const NO_AREA_KEY = "__none__";
const NO_AREA_LABEL = "ללא אזור";
const NO_ASSIGNEE_KEY = "__unassigned__";
const NO_ASSIGNEE_LABEL = "ללא אחראי";
const NO_DUE_KEY = "__nodue__";
const NO_DUE_LABEL = "ללא תאריך";

export function groupByArea(items: ReadonlyArray<Errand>): ReadonlyArray<Group<Errand>> {
  const map = new Map<string, { label: string; items: Errand[] }>();
  for (const e of items) {
    const trimmed = e.areaLabel.trim();
    const key = trimmed || NO_AREA_KEY;
    const label = trimmed || NO_AREA_LABEL;
    const bucket = map.get(key) ?? { label, items: [] };
    bucket.items.push(e);
    map.set(key, bucket);
  }
  return toGroups(map);
}

export function groupByAssignee(
  items: ReadonlyArray<Errand>,
  members: ReadonlyArray<{ id: string; name: string }>,
): ReadonlyArray<Group<Errand>> {
  const map = new Map<string, { label: string; items: Errand[] }>();
  for (const e of items) {
    const memberId = e.assignment?.memberId;
    const key = memberId ?? NO_ASSIGNEE_KEY;
    const label = memberId
      ? (members.find((m) => m.id === memberId)?.name ?? "חבר לא ידוע")
      : NO_ASSIGNEE_LABEL;
    const bucket = map.get(key) ?? { label, items: [] };
    bucket.items.push(e);
    map.set(key, bucket);
  }
  return toGroups(map);
}

/**
 * Groups by local calendar day derived from `dueAt`. Errands with no
 * dueAt collapse into a single "ללא תאריך" bucket sorted last.
 */
export function groupByDay(items: ReadonlyArray<Errand>): ReadonlyArray<Group<Errand>> {
  const map = new Map<string, { label: string; items: Errand[]; sortKey: string }>();
  for (const e of items) {
    if (!e.dueAt) {
      const b = map.get(NO_DUE_KEY) ?? { label: NO_DUE_LABEL, items: [], sortKey: "~" };
      b.items.push(e);
      map.set(NO_DUE_KEY, b);
      continue;
    }
    const d = new Date(e.dueAt);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("he-IL", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    });
    const bucket = map.get(key) ?? { label, items: [], sortKey: key };
    bucket.items.push(e);
    map.set(key, bucket);
  }
  const arr = Array.from(map.entries()).map(([key, v]) => ({
    key,
    label: v.label,
    items: v.items,
    sortKey: v.sortKey,
  }));
  arr.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0));
  return arr.map(({ key, label, items }) => ({ key, label, items }));
}

function toGroups(
  map: Map<string, { label: string; items: Errand[] }>,
): ReadonlyArray<Group<Errand>> {
  const arr = Array.from(map.entries()).map(([key, v]) => ({
    key,
    label: v.label,
    items: v.items,
  }));
  arr.sort((a, b) => {
    // Push "no X" buckets to the end.
    const aFallback = a.key.startsWith("__");
    const bFallback = b.key.startsWith("__");
    if (aFallback && !bFallback) return 1;
    if (!aFallback && bFallback) return -1;
    return a.label.localeCompare(b.label, "he");
  });
  return arr;
}
