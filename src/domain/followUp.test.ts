import { describe, it, expect } from "vitest";
import {
  validateFollowUp,
  clearFutureRemindersIfTerminal,
  canRoleSeeFollowUp,
  isDueForFollowUp,
  type FollowUpCase,
} from "./followUp";

const base: FollowUpCase = {
  id: "c1",
  title: "החזר מהבנק",
  responsibleMemberId: "m1",
  externalParty: "בנק דיסקונט",
  ballHolder: "external",
  status: "waiting_external",
  openedAt: "2026-07-01T09:00:00.000Z",
  sensitivity: "household",
  actions: [],
};

describe("validateFollowUp", () => {
  it("requires next follow-up OR disabled reason when waiting_external", () => {
    const errs = validateFollowUp({ ...base });
    expect(errs.some((e) => e.field === "nextFollowUpAt")).toBe(true);
  });

  it("accepts waiting_external with a next follow-up date", () => {
    const errs = validateFollowUp({
      ...base,
      nextFollowUpAt: "2026-08-01T09:00:00.000Z",
    });
    expect(errs).toEqual([]);
  });

  it("accepts waiting_external with a follow-up disabled reason", () => {
    const errs = validateFollowUp({
      ...base,
      followUpDisabledReason: "ממתין לתשובת עורך דין",
    });
    expect(errs).toEqual([]);
  });

  it("still enforces required fields regardless of status", () => {
    const errs = validateFollowUp({
      ...base,
      status: "action_required",
      title: "",
      responsibleMemberId: "",
      externalParty: "",
    });
    const fields = errs.map((e) => e.field);
    expect(fields).toContain("title");
    expect(fields).toContain("responsibleMemberId");
    expect(fields).toContain("externalParty");
  });
});

describe("clearFutureRemindersIfTerminal", () => {
  it("clears future next follow-up when status becomes completed", () => {
    const completed = clearFutureRemindersIfTerminal(
      {
        ...base,
        status: "completed",
        nextFollowUpAt: "2027-01-01T09:00:00.000Z",
      },
      "2026-07-24T00:00:00.000Z",
    );
    expect(completed.nextFollowUpAt).toBeUndefined();
    expect(completed.followUpDisabledReason).toBeUndefined();
  });

  it("does nothing for non-terminal statuses", () => {
    const stillOpen = clearFutureRemindersIfTerminal(
      { ...base, nextFollowUpAt: "2027-01-01T09:00:00.000Z" },
      "2026-07-24T00:00:00.000Z",
    );
    expect(stillOpen.nextFollowUpAt).toBe("2027-01-01T09:00:00.000Z");
  });
});

describe("canRoleSeeFollowUp", () => {
  it("hides adults_only from child role", () => {
    expect(
      canRoleSeeFollowUp("child", { ...base, sensitivity: "adults_only" }),
    ).toBe(false);
    expect(
      canRoleSeeFollowUp("adult", { ...base, sensitivity: "adults_only" }),
    ).toBe(true);
  });

  it("restricted requires viewer to be on the allow-list", () => {
    const c: FollowUpCase = {
      ...base,
      sensitivity: "restricted",
      restrictedToMemberIds: ["m1"],
    };
    expect(canRoleSeeFollowUp("adult", c, "m1")).toBe(true);
    expect(canRoleSeeFollowUp("adult", c, "m2")).toBe(false);
    expect(canRoleSeeFollowUp("child", c, "m1")).toBe(false);
  });
});

describe("isDueForFollowUp", () => {
  it("is true when next follow-up passed and status is open", () => {
    expect(
      isDueForFollowUp(
        { ...base, nextFollowUpAt: "2026-07-01T00:00:00.000Z" },
        "2026-07-24T00:00:00.000Z",
      ),
    ).toBe(true);
  });

  it("is false when case is completed", () => {
    expect(
      isDueForFollowUp(
        {
          ...base,
          status: "completed",
          nextFollowUpAt: "2026-07-01T00:00:00.000Z",
        },
        "2026-07-24T00:00:00.000Z",
      ),
    ).toBe(false);
  });
});
