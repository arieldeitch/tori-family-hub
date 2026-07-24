import { describe, it, expect } from "vitest";
import {
  allowedNextStatuses,
  canTransitionTask,
  createTaskInstanceSnapshot,
  isTaskOverdue,
  isTerminal,
  requiresAssignment,
  TaskDomainError,
  transitionTask,
  validateTaskForCompletion,
  type TaskInstance,
  type TaskStatus,
  type TaskTemplate,
} from "./task";

const NOW = "2026-07-24T10:00:00.000Z";
const LATER = "2026-07-24T11:00:00.000Z";

const template: TaskTemplate = {
  id: "tpl_1",
  title: "לצחצח שיניים",
  defaultPriority: "normal",
  createdAt: NOW,
  updatedAt: NOW,
  revision: 1,
};

function instance(overrides: Partial<TaskInstance> = {}): TaskInstance {
  const base = createTaskInstanceSnapshot(template, {
    id: "ti_1",
    createdAt: NOW,
    createdByMemberId: "m_owner",
    assignment: {
      memberId: "m_child",
      assignedAt: NOW,
      assignedByMemberId: "m_owner",
    },
    dueAt: LATER,
  });
  return { ...base, ...overrides };
}

describe("task domain — transition table", () => {
  it("allows every canonical legal transition", () => {
    const legal: Array<[TaskStatus, TaskStatus]> = [
      ["inbox", "planned"],
      ["inbox", "assigned"],
      ["inbox", "cancelled"],
      ["planned", "assigned"],
      ["planned", "inbox"],
      ["planned", "cancelled"],
      ["planned", "skipped"],
      ["assigned", "accepted"],
      ["assigned", "in_progress"],
      ["assigned", "planned"],
      ["assigned", "inbox"],
      ["assigned", "cancelled"],
      ["assigned", "skipped"],
      ["accepted", "in_progress"],
      ["accepted", "waiting"],
      ["accepted", "blocked"],
      ["accepted", "assigned"],
      ["accepted", "done"],
      ["accepted", "cancelled"],
      ["accepted", "skipped"],
      ["in_progress", "waiting"],
      ["in_progress", "blocked"],
      ["in_progress", "done"],
      ["in_progress", "accepted"],
      ["in_progress", "cancelled"],
      ["in_progress", "skipped"],
      ["waiting", "in_progress"],
      ["waiting", "blocked"],
      ["waiting", "done"],
      ["waiting", "cancelled"],
      ["waiting", "skipped"],
      ["blocked", "in_progress"],
      ["blocked", "waiting"],
      ["blocked", "done"],
      ["blocked", "cancelled"],
      ["blocked", "skipped"],
    ];
    for (const [from, to] of legal) {
      expect(canTransitionTask(from, to), `${from} → ${to}`).toBe(true);
    }
  });

  it("rejects illegal transitions and same-status moves", () => {
    expect(canTransitionTask("planned", "done")).toBe(false);
    expect(canTransitionTask("assigned", "done")).toBe(false);
    expect(canTransitionTask("inbox", "done")).toBe(false);
    expect(canTransitionTask("inbox", "in_progress")).toBe(false);
    expect(canTransitionTask("done", "in_progress")).toBe(false);
    expect(canTransitionTask("cancelled", "in_progress")).toBe(false);
    expect(canTransitionTask("skipped", "in_progress")).toBe(false);
    expect(canTransitionTask("in_progress", "in_progress")).toBe(false);
  });

  it("terminal statuses have no outgoing transitions", () => {
    for (const s of ["done", "skipped", "cancelled"] as const) {
      expect(isTerminal(s)).toBe(true);
      expect(allowedNextStatuses(s)).toEqual([]);
    }
  });
});

describe("task domain — transitionTask", () => {
  it("throws invalid_transition for planned → done", () => {
    const t = instance({ status: "planned" });
    expect(() =>
      transitionTask(t, {
        to: "done",
        at: LATER,
        actorMemberId: "m_owner",
        completedAt: LATER,
        completedByMemberId: "m_owner",
      }),
    ).toThrow(TaskDomainError);
  });

  it("throws missing_completed_at when done is called without completedAt", () => {
    const t = instance({ status: "in_progress" });
    let caught: unknown;
    try {
      transitionTask(t, { to: "done", at: LATER, actorMemberId: "m_owner" });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(TaskDomainError);
    expect((caught as TaskDomainError).code).toBe("missing_completed_at");
  });

  it("requires completedByMemberId when the actor is known", () => {
    const err = validateTaskForCompletion({
      status: "in_progress",
      completedAt: LATER,
      actorMemberId: "m_owner",
    });
    expect(err?.code).toBe("missing_assignee");
  });

  it("permits done from in_progress with completedAt + completedBy", () => {
    const t = instance({ status: "in_progress" });
    const next = transitionTask(t, {
      to: "done",
      at: LATER,
      actorMemberId: "m_owner",
      completedAt: LATER,
      completedByMemberId: "m_owner",
    });
    expect(next.status).toBe("done");
    expect(next.completedAt).toBe(LATER);
    expect(next.completedByMemberId).toBe("m_owner");
    expect(next.activity.at(-1)?.kind).toBe("completed");
  });

  it("rejects transitions from terminal states", () => {
    const done = instance({ status: "done", completedAt: LATER, completedByMemberId: "m_owner" });
    let code: string | undefined;
    try {
      transitionTask(done, { to: "in_progress", at: LATER, actorMemberId: "m_owner" });
    } catch (e) {
      code = (e as TaskDomainError).code;
    }
    expect(code).toBe("terminal_state");
  });

  it("cancelled and skipped require a cancelReason", () => {
    for (const to of ["cancelled", "skipped"] as const) {
      const t = instance({ status: to === "skipped" ? "planned" : "assigned" });
      let code: string | undefined;
      try {
        transitionTask(t, { to, at: LATER, actorMemberId: "m_owner" });
      } catch (e) {
        code = (e as TaskDomainError).code;
      }
      expect(code).toBe("missing_cancel_reason");
    }
  });

  it("cancelled with reason succeeds and stamps cancelledAt", () => {
    const t = instance({ status: "assigned" });
    const next = transitionTask(t, {
      to: "cancelled",
      at: LATER,
      actorMemberId: "m_owner",
      cancelReason: "no longer relevant",
    });
    expect(next.status).toBe("cancelled");
    expect(next.cancelledAt).toBe(LATER);
    expect(next.cancelReason).toBe("no longer relevant");
    expect(isTerminal(next.status)).toBe(true);
  });

  it("does not mutate the input instance (activity history immutable)", () => {
    const t = instance({ status: "assigned" });
    const originalActivityLength = t.activity.length;
    const originalStatus = t.status;
    const next = transitionTask(t, {
      to: "accepted",
      at: LATER,
      actorMemberId: "m_child",
    });
    // input unchanged
    expect(t.status).toBe(originalStatus);
    expect(t.activity.length).toBe(originalActivityLength);
    // next is a new object with appended activity
    expect(next).not.toBe(t);
    expect(next.activity.length).toBe(originalActivityLength + 1);
    expect(next.activity).not.toBe(t.activity);
  });
});

describe("task domain — createTaskInstanceSnapshot", () => {
  it("no assignment or dueAt → status inbox", () => {
    const inst = createTaskInstanceSnapshot(template, {
      id: "ti_x",
      createdAt: NOW,
      createdByMemberId: "m_owner",
    });
    expect(inst.status).toBe("inbox");
    expect(requiresAssignment(inst)).toBe(true);
  });

  it("assignment + dueAt → status assigned", () => {
    const inst = instance();
    expect(inst.status).toBe("assigned");
    expect(requiresAssignment(inst)).toBe(false);
  });

  it("template edits do not affect an existing instance snapshot", () => {
    const inst = instance();
    // Simulate template edit AFTER instance creation.
    const edited: TaskTemplate = {
      ...template,
      title: "משהו אחר לגמרי",
      defaultPriority: "urgent",
      revision: template.revision + 1,
      updatedAt: LATER,
    };
    // Instance snapshot must still reflect original values.
    expect(inst.title).toBe(template.title);
    expect(inst.priority).toBe("normal");
    expect(inst.templateSnapshot?.revision).toBe(1);
    // sanity — the edited template is a different object
    expect(edited.title).not.toBe(inst.title);
  });
});

describe("task domain — misc helpers", () => {
  it("isTaskOverdue: true only for past-due non-terminal", () => {
    expect(isTaskOverdue({ status: "assigned", dueAt: "2026-07-23T00:00:00.000Z" }, NOW)).toBe(true);
    expect(isTaskOverdue({ status: "assigned", dueAt: "2026-07-25T00:00:00.000Z" }, NOW)).toBe(false);
    expect(isTaskOverdue({ status: "done", dueAt: "2000-01-01T00:00:00.000Z" }, NOW)).toBe(false);
    expect(isTaskOverdue({ status: "assigned", dueAt: null }, NOW)).toBe(false);
  });

  it("requiresAssignment: any missing assignee or dueAt", () => {
    expect(requiresAssignment({ status: "inbox", assignment: null, dueAt: null })).toBe(true);
    expect(requiresAssignment({ status: "planned", assignment: null, dueAt: LATER })).toBe(true);
    expect(
      requiresAssignment({
        status: "in_progress",
        assignment: { memberId: "m", assignedAt: NOW, assignedByMemberId: "m2" },
        dueAt: LATER,
      }),
    ).toBe(false);
  });
});
