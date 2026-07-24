// Tests for tasks application layer (repo + creation rules + role filter).
// Domain-level tests live in src/domain/task.test.ts.

import { describe, it, expect, beforeEach } from "vitest";
import * as tasksRepo from "@/data/tasksRepo";
import { requiresAssignment, TaskDomainError } from "@/domain/task";

const ACTOR = "m_owner";

beforeEach(() => {
  tasksRepo.clear();
  tasksRepo.setSimulateFailure(false);
});

describe("tasksRepo.createManualTask — creation rules", () => {
  it("creates a task with title only → status inbox", () => {
    const t = tasksRepo.createManualTask({ title: "לרשום לחוג", createdByMemberId: ACTOR });
    expect(t.status).toBe("inbox");
    expect(t.assignment).toBeNull();
    expect(t.dueAt).toBeNull();
    expect(requiresAssignment(t)).toBe(true);
  });

  it("creates with assignee + dueAt → status assigned", () => {
    const t = tasksRepo.createManualTask({
      title: "לאסוף מהגן",
      assigneeMemberId: "m_adult",
      dueAt: "2026-08-01T09:00:00.000Z",
      createdByMemberId: ACTOR,
    });
    expect(t.status).toBe("assigned");
    expect(t.assignment?.memberId).toBe("m_adult");
    expect(requiresAssignment(t)).toBe(false);
  });

  it("creates with dueAt but no assignee → status planned, surfaces in 'requires assignment'", () => {
    const t = tasksRepo.createManualTask({
      title: "לקנות מתנה",
      dueAt: "2026-08-01T09:00:00.000Z",
      createdByMemberId: ACTOR,
    });
    expect(t.status).toBe("planned");
    expect(t.assignment).toBeNull();
    expect(requiresAssignment(t)).toBe(true);
  });

  it("rejects empty title", () => {
    expect(() => tasksRepo.createManualTask({ title: "   ", createdByMemberId: ACTOR })).toThrow(
      /כותרת/,
    );
  });
});

describe("tasksRepo.transition — legal / illegal via domain", () => {
  it("legal transition (planned → assigned via assign, then in_progress)", () => {
    const t = tasksRepo.createManualTask({
      title: "x",
      dueAt: "2026-08-01T09:00:00.000Z",
      createdByMemberId: ACTOR,
    });
    expect(t.status).toBe("planned");
    const assigned = tasksRepo.assignTask(t.id, { memberId: "m_adult", actorMemberId: ACTOR });
    expect(assigned.status).toBe("assigned");
    const started = tasksRepo.transition(t.id, {
      to: "in_progress",
      at: new Date().toISOString(),
      actorMemberId: "m_adult",
    });
    expect(started.status).toBe("in_progress");
  });

  it("illegal transition throws TaskDomainError (planned → done)", () => {
    const t = tasksRepo.createManualTask({
      title: "x",
      dueAt: "2026-08-01T09:00:00.000Z",
      createdByMemberId: ACTOR,
    });
    expect(() =>
      tasksRepo.transition(t.id, {
        to: "done",
        at: new Date().toISOString(),
        actorMemberId: ACTOR,
        completedAt: new Date().toISOString(),
        completedByMemberId: ACTOR,
      }),
    ).toThrow(TaskDomainError);
    // state unchanged
    expect(tasksRepo.getById(t.id)?.status).toBe("planned");
  });
});

describe("tasksRepo — save failure preserves input", () => {
  it("createManualTask throws when simulateFailure is on; caller keeps its input", () => {
    tasksRepo.setSimulateFailure(true);
    const draft = { title: "לרשום לחוג ציור", createdByMemberId: ACTOR };
    let caught: Error | undefined;
    try {
      tasksRepo.createManualTask(draft);
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).toBeInstanceOf(Error);
    // Draft (caller's local input) is untouched — nothing in the repo either.
    expect(draft.title).toBe("לרשום לחוג ציור");
    expect(tasksRepo.getAll()).toHaveLength(0);
  });
});

describe("role-based UX filter — child does not see adults-only", () => {
  it("child viewer filters out adultsOnly tasks (UX filter only, not enforcement)", () => {
    tasksRepo.createManualTask({ title: "רגילה", createdByMemberId: ACTOR });
    tasksRepo.createManualTask({
      title: "סודית",
      adultsOnly: true,
      createdByMemberId: ACTOR,
    });
    const all = tasksRepo.getAll();
    expect(all).toHaveLength(2);
    const childVisible = all.filter((t) => !t.adultsOnly);
    expect(childVisible).toHaveLength(1);
    expect(childVisible[0]!.title).toBe("רגילה");
  });
});
