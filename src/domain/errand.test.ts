import { describe, it, expect } from "vitest";
import { asTaskInstance, groupByArea, groupByAssignee, groupByDay, type Errand } from "./errand";
import { transitionTask } from "./task";

function e(partial: Partial<Errand> & { id: string }): Errand {
  return {
    id: partial.id,
    title: partial.title ?? "סידור",
    location: partial.location ?? "",
    areaLabel: partial.areaLabel ?? "",
    assignment: partial.assignment ?? null,
    dueAt: partial.dueAt ?? null,
    status: partial.status ?? "inbox",
    canDoWhenNearby: partial.canDoWhenNearby ?? false,
    linkedTaskInstanceId: partial.linkedTaskInstanceId,
    note: partial.note,
    createdAt: "2026-01-01T00:00:00.000Z",
    createdByMemberId: "m1",
    updatedAt: "2026-01-01T00:00:00.000Z",
    activity: [],
  };
}

describe("errand domain", () => {
  it("groups by area, folding empty area into a single 'no area' bucket at the end", () => {
    const groups = groupByArea([
      e({ id: "1", areaLabel: "מרכז" }),
      e({ id: "2", areaLabel: "" }),
      e({ id: "3", areaLabel: "צפון" }),
      e({ id: "4", areaLabel: "מרכז" }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["מרכז", "צפון", "__none__"]);
    expect(groups[0]!.items).toHaveLength(2);
    expect(groups[2]!.items).toHaveLength(1);
  });

  it("groups by assignee with unassigned bucket last", () => {
    const groups = groupByAssignee(
      [
        e({ id: "1", assignment: { memberId: "m1", assignedAt: "x", assignedByMemberId: "m1" } }),
        e({ id: "2" }),
        e({ id: "3", assignment: { memberId: "m2", assignedAt: "x", assignedByMemberId: "m1" } }),
      ],
      [
        { id: "m1", name: "אבא" },
        { id: "m2", name: "אמא" },
      ],
    );
    expect(groups.map((g) => g.label)).toEqual(["אבא", "אמא", "ללא אחראי"]);
  });

  it("groups by day and sorts chronologically, no-due last", () => {
    const groups = groupByDay([
      e({ id: "a", dueAt: "2026-03-05T10:00:00Z" }),
      e({ id: "b" }),
      e({ id: "c", dueAt: "2026-03-04T10:00:00Z" }),
      e({ id: "d", dueAt: "2026-03-05T18:00:00Z" }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["2026-03-04", "2026-03-05", "__nodue__"]);
    expect(groups[1]!.items).toHaveLength(2);
  });

  it("adapts to a TaskInstance shape that transitionTask accepts", () => {
    const err = e({
      id: "1",
      status: "assigned",
      dueAt: "2026-03-05T10:00:00Z",
      assignment: { memberId: "m1", assignedAt: "x", assignedByMemberId: "m1" },
    });
    const asTask = asTaskInstance(err);
    const next = transitionTask(asTask, {
      to: "accepted",
      at: "2026-03-05T09:00:00Z",
      actorMemberId: "m1",
    });
    expect(next.status).toBe("accepted");
  });
});
