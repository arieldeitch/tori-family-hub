import { describe, it, expect } from "vitest";
import {
  isOverdue,
  selectFollowUpsDue,
  selectMyTasks,
  selectNext,
  selectRisks,
  selectUnassignedTasks,
  selectWaitingApproval,
  visibleToRole,
  type TodayDataset,
} from "./today";

const now = "2026-07-24T12:00:00.000Z";

const base: TodayDataset = {
  now,
  viewerId: "m_owner",
  viewerRole: "owner",
  members: [
    { id: "m_owner", name: "דנה", role: "owner", color: "#000", initials: "ד" },
    { id: "m_child", name: "נועה", role: "child", color: "#111", initials: "נ" },
  ],
  tasks: [
    {
      id: "a",
      kind: "task",
      title: "מיני",
      assigneeId: "m_owner",
      dueAt: "2026-07-24T15:00:00.000Z",
      status: "open",
      personal: true,
    },
    {
      id: "b",
      kind: "task",
      title: "פיגור",
      assigneeId: "m_owner",
      dueAt: "2026-07-23T08:00:00.000Z",
      status: "open",
    },
    { id: "c", kind: "task", title: "ללא אחראי", assigneeId: null, dueAt: null, status: "open" },
    {
      id: "d",
      kind: "task",
      title: "ממתין",
      assigneeId: "m_child",
      dueAt: null,
      status: "waiting_approval",
    },
    {
      id: "e",
      kind: "task",
      title: "מבוגרים בלבד",
      assigneeId: "m_owner",
      dueAt: null,
      status: "open",
      adultsOnly: true,
      personal: true,
    },
  ],
  transports: [
    {
      id: "t1",
      kind: "transport",
      childId: "m_child",
      direction: "pickup",
      place: "גן",
      timeAt: "2026-07-24T13:00:00.000Z",
      responsibleId: null,
      status: "unassigned",
    },
  ],
  events: [{ id: "ev", kind: "event", title: "אסיפה", timeAt: "2026-07-24T18:00:00.000Z" }],
  followUps: [
    {
      id: "f1",
      kind: "followup",
      title: "בנק",
      externalParty: "דיסקונט",
      responsibleId: "m_owner",
      dueAt: "2026-07-24T10:00:00.000Z",
    },
  ],
  shopping: { activeListName: "סופר", itemsCount: 3, urgentCount: 0 },
};

describe("today domain", () => {
  it("detects overdue tasks", () => {
    expect(isOverdue(base.tasks[1]!, now)).toBe(true);
    expect(isOverdue(base.tasks[0]!, now)).toBe(false);
  });

  it("selectRisks returns overdue + unassigned transports", () => {
    const r = selectRisks(base);
    expect(r.overdueTasks.map((t) => t.id)).toEqual(["b"]);
    expect(r.unassignedTransports.map((t) => t.id)).toEqual(["t1"]);
  });

  it("selectNext returns earliest upcoming transport/event", () => {
    const n = selectNext(base);
    expect(n?.id).toBe("t1");
  });

  it("selectMyTasks filters to viewer and excludes done", () => {
    const mine = selectMyTasks(base).map((t) => t.id);
    expect(mine).toContain("a");
    expect(mine).toContain("e");
    expect(mine).not.toContain("c");
  });

  it("selectWaitingApproval + selectUnassignedTasks + selectFollowUpsDue", () => {
    expect(selectWaitingApproval(base).map((i) => i.id)).toEqual(["d"]);
    expect(selectUnassignedTasks(base).map((t) => t.id)).toEqual(["c"]);
    expect(selectFollowUpsDue(base).map((f) => f.id)).toEqual(["f1"]);
  });

  it("child mode hides adultsOnly items", () => {
    expect(visibleToRole(base.tasks, "child").some((t) => t.id === "e")).toBe(false);
    expect(visibleToRole(base.tasks, "owner").some((t) => t.id === "e")).toBe(true);
  });
});
