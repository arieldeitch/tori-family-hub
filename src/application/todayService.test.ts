// Integration tests: Today screen composes from canonical repos, and
// Today actions mutate them (never a private Today store).

import { beforeEach, describe, expect, it } from "vitest";
import * as tasksRepo from "@/data/tasksRepo";
import { transportRepo } from "@/data/transportRepo";
import { shoppingRepo } from "@/data/shoppingRepo";
import { addItem } from "@/application/shoppingService";
import {
  buildTodayDataset,
  claimTaskAction,
  completeTaskAction,
  assignTransportAction,
  todayViewerIds,
} from "@/application/todayService";
import {
  selectMyTasks,
  selectRisks,
  selectUnassignedTasks,
} from "@/domain/today";
import { DEMO_VIEWER_ID } from "@/data/peopleDirectory";

const nowIso = () => new Date().toISOString();

beforeEach(() => {
  tasksRepo.reset();
  transportRepo.setView("normal");
  shoppingRepo.reset();
});

describe("todayService — integration with canonical repos", () => {
  it("a new task created via tasksRepo shows up in the Today dataset", () => {
    tasksRepo.createManualTask({
      title: "לקנות מתנה לחגית",
      assigneeMemberId: DEMO_VIEWER_ID,
      dueAt: new Date(Date.now() + 60_000).toISOString(),
      createdByMemberId: DEMO_VIEWER_ID,
    });
    const ds = buildTodayDataset({ viewerId: DEMO_VIEWER_ID });
    expect(selectMyTasks(ds).some((t) => t.title === "לקנות מתנה לחגית")).toBe(true);
  });

  it("completing a task via the service updates Today (removed from myTasks)", () => {
    const t = tasksRepo.createManualTask({
      title: "לתלות כביסה",
      assigneeMemberId: DEMO_VIEWER_ID,
      dueAt: new Date(Date.now() + 60_000).toISOString(),
      createdByMemberId: DEMO_VIEWER_ID,
    });
    completeTaskAction(t.id, DEMO_VIEWER_ID);
    const ds = buildTodayDataset({ viewerId: DEMO_VIEWER_ID });
    expect(selectMyTasks(ds).some((x) => x.id === t.id)).toBe(false);
    // Canonical repo reflects it too (history).
    expect(tasksRepo.getById(t.id)?.status).toBe("done");
  });

  it("a task with no assignee surfaces in Today's 'unassigned' list", () => {
    tasksRepo.createManualTask({
      title: "להזמין תור למוסך",
      dueAt: new Date(Date.now() + 3600_000).toISOString(),
      createdByMemberId: DEMO_VIEWER_ID,
    });
    const ds = buildTodayDataset({ viewerId: DEMO_VIEWER_ID });
    expect(selectUnassignedTasks(ds).some((t) => t.title === "להזמין תור למוסך")).toBe(true);
  });

  it("claiming a task from Today assigns it in tasksRepo", () => {
    const t = tasksRepo.createManualTask({
      title: "לתאם פגישה",
      dueAt: new Date(Date.now() + 3600_000).toISOString(),
      createdByMemberId: DEMO_VIEWER_ID,
    });
    claimTaskAction(t.id, DEMO_VIEWER_ID);
    expect(tasksRepo.getById(t.id)?.assignment?.memberId).toBe(DEMO_VIEWER_ID);
  });

  it("an unassigned transport appears in Today's risks list", () => {
    const ds = buildTodayDataset({ viewerId: DEMO_VIEWER_ID, nowIso: nowIso() });
    const { unassignedTransports } = selectRisks(ds);
    // transportRepo seed includes r1 with status="unassigned".
    expect(unassignedTransports.length).toBeGreaterThan(0);
  });

  it("assigning a transport via the service moves it out of the unassigned bucket", () => {
    const ride = transportRepo
      .getSnapshot()
      .rides.find((r) => r.status === "unassigned");
    expect(ride).toBeDefined();
    assignTransportAction(ride!.id, "m1");
    const ds = buildTodayDataset({ viewerId: DEMO_VIEWER_ID });
    expect(selectRisks(ds).unassignedTransports.some((t) => t.id === ride!.id)).toBe(false);
    expect(transportRepo.getById(ride!.id)?.status).toBe("pending_acceptance");
  });

  it("adding a shopping item updates the Today shopping summary", () => {
    const before = buildTodayDataset().shopping;
    const beforeCount = before?.itemsCount ?? 0;
    addItem(
      {
        listId: "list_home",
        name: "טונה במים",
        quantity: 3,
        requestedByMemberId: DEMO_VIEWER_ID,
        urgency: "high",
      },
      "owner",
    );
    const after = buildTodayDataset().shopping;
    expect(after?.itemsCount).toBe(beforeCount + 1);
    expect((after?.urgentCount ?? 0)).toBeGreaterThan(0);
  });

  it("soft-deleting a task removes it from the Today dataset", () => {
    const t = tasksRepo.createManualTask({
      title: "לבטל מנוי",
      assigneeMemberId: DEMO_VIEWER_ID,
      dueAt: new Date(Date.now() + 60_000).toISOString(),
      createdByMemberId: DEMO_VIEWER_ID,
    });
    tasksRepo.softDeleteTask(t.id, DEMO_VIEWER_ID);
    const ds = buildTodayDataset({ viewerId: DEMO_VIEWER_ID });
    expect(ds.tasks.some((x) => x.id === t.id)).toBe(false);
    // Available for restore via getDeleted().
    expect(tasksRepo.getDeleted().some((x) => x.id === t.id)).toBe(true);
  });

  it("child mode filters adultsOnly tasks", () => {
    tasksRepo.createManualTask({
      title: "לתאם עם רואה החשבון",
      assigneeMemberId: todayViewerIds.child,
      dueAt: new Date(Date.now() + 60_000).toISOString(),
      adultsOnly: true,
      createdByMemberId: DEMO_VIEWER_ID,
    });
    const dsChild = buildTodayDataset({
      viewerId: todayViewerIds.child,
      viewerRole: "child",
    });
    expect(dsChild.tasks.filter((t) => t.adultsOnly && t.assigneeId === todayViewerIds.child).length)
      .toBeGreaterThan(0);
    expect(
      selectMyTasks(dsChild).some((t) => t.title === "לתאם עם רואה החשבון"),
    ).toBe(false);
  });

  it("failed mutation does not corrupt the canonical repo (input preserved)", () => {
    const beforeCount = tasksRepo.getAll().length;
    tasksRepo.setSimulateFailure(true);
    expect(() =>
      tasksRepo.createManualTask({
        title: "אמור להיכשל",
        createdByMemberId: DEMO_VIEWER_ID,
      }),
    ).toThrow();
    tasksRepo.setSimulateFailure(false);
    expect(tasksRepo.getAll().length).toBe(beforeCount);
  });
});
