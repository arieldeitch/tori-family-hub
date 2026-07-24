import { describe, expect, it } from "vitest";
import {
  assignTransport,
  canTransitionTransport,
  PRIMARY_ACTION_BY_STATUS,
  selectUnassigned,
  transitionTransport,
  TransportDomainError,
  type TransportRide,
} from "./transport";

const iso = "2026-03-01T09:00:00.000Z";

function make(over: Partial<TransportRide> = {}): TransportRide {
  return {
    id: "r1",
    childMemberId: "c1",
    direction: "pickup",
    timeAt: iso,
    origin: "בית",
    destination: "חוג",
    status: "unassigned",
    createdAt: iso,
    updatedAt: iso,
    ...over,
  };
}

describe("transport domain", () => {
  it("allows the canonical happy path", () => {
    let r = make();
    r = assignTransport(r, "m1", iso);
    expect(r.status).toBe("pending_acceptance");
    expect(r.assigneeMemberId).toBe("m1");

    r = transitionTransport(r, "accepted", { actorMemberId: "m1", now: iso });
    expect(r.status).toBe("accepted");

    r = transitionTransport(r, "en_route", { actorMemberId: "m1", now: iso });
    expect(r.status).toBe("en_route");

    r = transitionTransport(r, "completed", { actorMemberId: "m1", now: iso });
    expect(r.status).toBe("completed");
    expect(r.completedAt).toBe(iso);
  });

  it("rejects illegal transitions", () => {
    const r = make({ status: "unassigned" });
    expect(canTransitionTransport("unassigned", "accepted")).toBe(false);
    expect(() => transitionTransport(r, "accepted", { actorMemberId: "m1" })).toThrow(
      TransportDomainError,
    );
  });

  it("blocks completed without an assignee", () => {
    // Force an en_route ride with no assignee (defensive: shouldn't be
    // reachable via public API, but the guard must still fire).
    const r = make({ status: "en_route", assigneeMemberId: undefined });
    expect(() => transitionTransport(r, "completed", { actorMemberId: "m1" })).toThrow(
      /without an assignee/,
    );
  });

  it("only the assigned member may accept", () => {
    const r = make({ status: "pending_acceptance", assigneeMemberId: "m1" });
    expect(() => transitionTransport(r, "accepted", { actorMemberId: "m2" })).toThrow(
      /Only the assigned member/,
    );
    const ok = transitionTransport(r, "accepted", { actorMemberId: "m1" });
    expect(ok.status).toBe("accepted");
  });

  it("en_route requires accepted first (no shortcut from pending_acceptance)", () => {
    const r = make({ status: "pending_acceptance", assigneeMemberId: "m1" });
    expect(canTransitionTransport("pending_acceptance", "en_route")).toBe(false);
    expect(() => transitionTransport(r, "en_route", { actorMemberId: "m1" })).toThrow(
      TransportDomainError,
    );
  });

  it("transferred swaps assignee and remembers previous", () => {
    const r = make({ status: "accepted", assigneeMemberId: "m1" });
    const next = transitionTransport(r, "transferred", {
      actorMemberId: "m1",
      newAssigneeMemberId: "m2",
    });
    expect(next.status).toBe("transferred");
    expect(next.assigneeMemberId).toBe("m2");
    expect(next.previousAssigneeMemberId).toBe("m1");
  });

  it("cancellation records the reason", () => {
    const r = make({ status: "accepted", assigneeMemberId: "m1" });
    const c = transitionTransport(r, "cancelled", {
      actorMemberId: "m1",
      reason: "בוטל על ידי בית הספר",
    });
    expect(c.status).toBe("cancelled");
    expect(c.cancellationReason).toBe("בוטל על ידי בית הספר");
  });

  it("selectUnassigned filters correctly", () => {
    const rides = [
      make({ id: "a" }),
      make({ id: "b", status: "accepted", assigneeMemberId: "m1" }),
    ];
    expect(selectUnassigned(rides).map((r) => r.id)).toEqual(["a"]);
  });

  it("primary action mapping covers workable statuses", () => {
    expect(PRIMARY_ACTION_BY_STATUS.unassigned?.toStatus).toBe("pending_acceptance");
    expect(PRIMARY_ACTION_BY_STATUS.pending_acceptance?.toStatus).toBe("accepted");
    expect(PRIMARY_ACTION_BY_STATUS.accepted?.toStatus).toBe("en_route");
    expect(PRIMARY_ACTION_BY_STATUS.en_route?.toStatus).toBe("completed");
    expect(PRIMARY_ACTION_BY_STATUS.cancelled).toBeUndefined();
    expect(PRIMARY_ACTION_BY_STATUS.transferred).toBeUndefined();
  });

  it("does not mutate the input ride", () => {
    const r = make({ status: "pending_acceptance", assigneeMemberId: "m1" });
    transitionTransport(r, "accepted", { actorMemberId: "m1", now: iso });
    expect(r.status).toBe("pending_acceptance");
    expect(r.updatedAt).toBe(iso);
  });
});
