// Tests for prompt 6.3: templates, instances, occurrence dedupe, snapshot
// immutability, soft delete + restore, role-gated restore UI.

import { describe, it, expect, beforeEach } from "vitest";
import * as templatesRepo from "@/data/templatesRepo";
import * as tasksRepo from "@/data/tasksRepo";
import {
  canRestore,
  describeRule,
  generateOccurrences,
  isSoftDeleted,
  occurrenceKey,
  withinRestoreWindow,
  type RecurrenceRule,
} from "@/domain/recurrence";

const ACTOR = "m_owner";
const rule: RecurrenceRule = { frequency: "daily", interval: 1, timeOfDay: "08:00" };

beforeEach(() => {
  templatesRepo.clear();
  tasksRepo.clear();
});

describe("template + instance separation", () => {
  it("template and materialised instance are distinct objects", () => {
    const tpl = templatesRepo.createTemplate({ title: "ארוחת בוקר", recurrence: rule });
    const inst = tasksRepo.materializeOccurrence(tpl, "2026-08-01T08:00:00.000Z", ACTOR);
    expect(inst.id).not.toBe(tpl.id);
    expect(inst.templateId).toBe(tpl.id);
    expect(inst.templateSnapshot?.revision).toBe(1);
  });

  it("instance keeps snapshot after template edit — no rewrite of history", () => {
    const tpl = templatesRepo.createTemplate({ title: "ארוחת בוקר", recurrence: rule });
    const inst = tasksRepo.materializeOccurrence(tpl, "2026-08-01T08:00:00.000Z", ACTOR);
    templatesRepo.updateTemplate(tpl.id, { title: "בוקר מזרחי" });
    const still = tasksRepo.getById(inst.id)!;
    expect(still.title).toBe("ארוחת בוקר");
    expect(still.templateSnapshot?.title).toBe("ארוחת בוקר");
    expect(still.templateSnapshot?.revision).toBe(1);
    expect(templatesRepo.getById(tpl.id)!.revision).toBe(2);
  });
});

describe("occurrence uniqueness", () => {
  it("occurrenceKey is stable per template+time", () => {
    expect(occurrenceKey("t1", "2026-08-01T08:00:00.000Z")).toBe(
      occurrenceKey("t1", "2026-08-01T08:00:00.000Z"),
    );
  });

  it("materialising the same (template, scheduledAt) twice returns one instance", () => {
    const tpl = templatesRepo.createTemplate({ title: "x", recurrence: rule });
    const a = tasksRepo.materializeOccurrence(tpl, "2026-08-01T08:00:00.000Z", ACTOR);
    const b = tasksRepo.materializeOccurrence(tpl, "2026-08-01T08:00:00.000Z", ACTOR);
    expect(a.id).toBe(b.id);
    expect(tasksRepo.getInstancesForTemplate(tpl.id).length).toBe(1);
  });
});

describe("soft delete + restore", () => {
  it("soft-deleted template is hidden from getAll but visible in getDeleted", () => {
    const tpl = templatesRepo.createTemplate({ title: "x" });
    templatesRepo.softDeleteTemplate(tpl.id, ACTOR);
    expect(templatesRepo.getAll().find((t) => t.id === tpl.id)).toBeUndefined();
    expect(templatesRepo.getDeleted().find((t) => t.id === tpl.id)).toBeDefined();
    const cur = templatesRepo.getById(tpl.id)!;
    expect(isSoftDeleted(cur)).toBe(true);
    expect(cur.deletedByMemberId).toBe(ACTOR);
  });

  it("restore removes deletedAt and returns the row to normal listing", () => {
    const tpl = templatesRepo.createTemplate({ title: "x" });
    templatesRepo.softDeleteTemplate(tpl.id, ACTOR);
    templatesRepo.restoreTemplate(tpl.id);
    expect(templatesRepo.getAll().find((t) => t.id === tpl.id)).toBeDefined();
    expect(templatesRepo.getById(tpl.id)!.deletedAt).toBeUndefined();
  });

  it("soft delete on task is idempotent and never purges", () => {
    const t = tasksRepo.createManualTask({ title: "y", createdByMemberId: ACTOR });
    tasksRepo.softDeleteTask(t.id, ACTOR);
    tasksRepo.softDeleteTask(t.id, ACTOR); // no throw
    expect(tasksRepo.getAllIncludingDeleted().length).toBe(1);
    expect(tasksRepo.getAll().length).toBe(0);
  });

  it("restore window covers at least 48h", () => {
    const t = tasksRepo.createManualTask({ title: "y", createdByMemberId: ACTOR });
    const deleted = tasksRepo.softDeleteTask(t.id, ACTOR);
    const now = new Date(Date.parse(deleted.deletedAt!) + 47 * 3600 * 1000).toISOString();
    expect(withinRestoreWindow(deleted, now)).toBe(true);
    const later = new Date(Date.parse(deleted.deletedAt!) + 49 * 3600 * 1000).toISOString();
    expect(withinRestoreWindow(deleted, later)).toBe(false);
  });
});

describe("role-gated restore (UI protection only)", () => {
  it("child and guest may not see restore action", () => {
    expect(canRestore("child")).toBe(false);
    expect(canRestore("guest")).toBe(false);
  });
  it("owner and adult may restore", () => {
    expect(canRestore("owner")).toBe(true);
    expect(canRestore("adult")).toBe(true);
  });
});

describe("recurrence generation + describe", () => {
  it("generates daily occurrences within horizon", () => {
    const occ = generateOccurrences(
      { id: "t", recurrence: { frequency: "daily", interval: 1, timeOfDay: "08:00" } },
      "2026-08-01T00:00:00.000Z",
      "2026-08-05T00:00:00.000Z",
    );
    expect(occ.length).toBe(4);
  });
  it("describes weekly rule in Hebrew", () => {
    expect(
      describeRule({ frequency: "weekly", interval: 1, byWeekday: [0, 2], timeOfDay: "07:00" }),
    ).toContain("שבוע");
  });
});
