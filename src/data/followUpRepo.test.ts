import { describe, it, expect, beforeEach } from "vitest";
import * as repo from "./followUpRepo";
import { FollowUpValidationFailedError } from "./followUpRepo";

const base = {
  title: "בדיקת אחריות",
  responsibleMemberId: "m1",
  externalParty: "יבואן",
  ballHolder: "external" as const,
  sensitivity: "household" as const,
};

beforeEach(() => repo.resetToSeed());

describe("followUpRepo application-layer enforcement", () => {
  it("throws when creating a waiting_external case with no next follow-up and no opt-out reason", () => {
    const before = repo.getAll().length;
    expect(() =>
      repo.create({ ...base, status: "waiting_external" }),
    ).toThrow(FollowUpValidationFailedError);
    // Failed save must not mutate state — the user's input is preserved
    // in the caller (form) because no state changed here.
    expect(repo.getAll().length).toBe(before);
  });

  it("accepts a waiting_external case with an explicit opt-out reason", () => {
    const created = repo.create({
      ...base,
      status: "waiting_external",
      followUpDisabledReason: "ממתין להחלטה משפחתית",
    });
    expect(created.id).toBeDefined();
    expect(repo.getById(created.id)?.followUpDisabledReason).toBe("ממתין להחלטה משפחתית");
  });

  it("update throws when a patch would leave case in invalid waiting_external state", () => {
    const c = repo.create({
      ...base,
      status: "action_required",
    });
    expect(() =>
      repo.update(c.id, { status: "waiting_external" }),
    ).toThrow(FollowUpValidationFailedError);
    // Original state is preserved on failed save.
    expect(repo.getById(c.id)?.status).toBe("action_required");
  });

  it("clears future reminder when case is marked completed", () => {
    const c = repo.create({
      ...base,
      status: "waiting_external",
      nextFollowUpAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    });
    const done = repo.update(c.id, { status: "completed" });
    expect(done?.status).toBe("completed");
    expect(done?.nextFollowUpAt).toBeUndefined();
  });
});
