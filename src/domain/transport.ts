// Pure domain: transport rides (pickup / dropoff). No React, no I/O.
//
// UI MUST call transitionTransport() rather than mutating status directly.
// SECURITY: role/actor checks here are UX-only. Real permission enforcement
// belongs on the server (RLS + edge functions). This module models state and
// state transitions only.

export type TransportStatus =
  | "unassigned"
  | "pending_acceptance"
  | "accepted"
  | "en_route"
  | "completed"
  | "transferred"
  | "cancelled";

export type TransportDirection = "pickup" | "dropoff";

export const TERMINAL_TRANSPORT_STATUSES: ReadonlySet<TransportStatus> = new Set([
  "completed",
  "transferred",
  "cancelled",
]);

export interface TransportRide {
  id: string;
  childMemberId: string;
  direction: TransportDirection;
  timeAt: string; // ISO — pickup/dropoff time
  recommendedDepartureAt?: string; // ISO
  acceptanceDeadlineAt?: string; // ISO — by which pending_acceptance must be answered
  origin: string;
  destination: string;
  assigneeMemberId?: string;
  previousAssigneeMemberId?: string; // populated when transferred
  backupPlaceholder?: string; // free text — no real backup engine yet
  equipment?: string; // e.g. כיסא בטיחות, קסדה
  notes?: string;
  status: TransportStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  completedAt?: string;
  cancellationReason?: string;
}

// ---------- Transition table ----------

type TransitionMap = Record<TransportStatus, ReadonlyArray<TransportStatus>>;

const TRANSITIONS: TransitionMap = {
  unassigned: ["pending_acceptance", "cancelled"],
  pending_acceptance: ["accepted", "unassigned", "cancelled"],
  accepted: ["en_route", "transferred", "cancelled"],
  en_route: ["completed", "transferred", "cancelled"],
  // terminal
  completed: [],
  transferred: [],
  cancelled: [],
};

export class TransportDomainError extends Error {
  constructor(
    message: string,
    public code: "INVALID_TRANSITION" | "MISSING_ASSIGNEE" | "WRONG_ACTOR" | "TERMINAL_STATE",
  ) {
    super(message);
    this.name = "TransportDomainError";
  }
}

export function canTransitionTransport(from: TransportStatus, to: TransportStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export interface TransitionContext {
  /** The member performing the transition — required for actor-scoped rules. */
  actorMemberId: string;
  now?: string;
  /** For transferred/cancelled */
  reason?: string;
  /** For transferred → new assignee */
  newAssigneeMemberId?: string;
}

/**
 * Applies a status transition, enforcing:
 *   - the transition itself is legal (per TRANSITIONS)
 *   - `completed` requires an assignee
 *   - `accepted` may only be performed by the currently assigned member
 *   - `en_route` is only reachable from `accepted`
 *   - `transferred` swaps the assignee and remembers the previous one
 * Returns a new TransportRide; never mutates the input.
 */
export function transitionTransport(
  ride: TransportRide,
  to: TransportStatus,
  ctx: TransitionContext,
): TransportRide {
  if (TERMINAL_TRANSPORT_STATUSES.has(ride.status)) {
    throw new TransportDomainError(
      `Ride ${ride.id} is in terminal state ${ride.status}`,
      "TERMINAL_STATE",
    );
  }
  if (!canTransitionTransport(ride.status, to)) {
    throw new TransportDomainError(
      `Illegal transition ${ride.status} → ${to}`,
      "INVALID_TRANSITION",
    );
  }

  const now = ctx.now ?? new Date().toISOString();
  const next: TransportRide = { ...ride, status: to, updatedAt: now };

  if (to === "accepted") {
    if (!ride.assigneeMemberId) {
      throw new TransportDomainError("Cannot accept unassigned ride", "MISSING_ASSIGNEE");
    }
    if (ride.assigneeMemberId !== ctx.actorMemberId) {
      throw new TransportDomainError(
        "Only the assigned member may accept this ride",
        "WRONG_ACTOR",
      );
    }
  }

  if (to === "en_route") {
    // Guard: en_route only from accepted. This is already covered by the
    // TRANSITIONS table but we keep the invariant explicit.
    if (ride.status !== "accepted") {
      throw new TransportDomainError(
        "en_route requires the ride to be accepted first",
        "INVALID_TRANSITION",
      );
    }
  }

  if (to === "completed") {
    if (!ride.assigneeMemberId) {
      throw new TransportDomainError(
        "Cannot complete ride without an assignee",
        "MISSING_ASSIGNEE",
      );
    }
    next.completedAt = now;
  }

  if (to === "transferred") {
    if (!ctx.newAssigneeMemberId) {
      throw new TransportDomainError("Transfer requires a new assignee", "MISSING_ASSIGNEE");
    }
    next.previousAssigneeMemberId = ride.assigneeMemberId;
    next.assigneeMemberId = ctx.newAssigneeMemberId;
  }

  if (to === "cancelled" && ctx.reason) {
    next.cancellationReason = ctx.reason;
  }

  return next;
}

/**
 * Assigns a member to an unassigned ride and moves it to pending_acceptance.
 * Returns a new ride; never mutates.
 */
export function assignTransport(
  ride: TransportRide,
  assigneeMemberId: string,
  now = new Date().toISOString(),
): TransportRide {
  if (ride.status !== "unassigned") {
    throw new TransportDomainError(
      `assignTransport requires status=unassigned, got ${ride.status}`,
      "INVALID_TRANSITION",
    );
  }
  return {
    ...ride,
    assigneeMemberId,
    status: "pending_acceptance",
    updatedAt: now,
  };
}

/** Convenience selectors — pure. */
export function selectUnassigned(rides: ReadonlyArray<TransportRide>): TransportRide[] {
  return rides.filter((r) => r.status === "unassigned");
}
export function selectPendingAcceptance(rides: ReadonlyArray<TransportRide>): TransportRide[] {
  return rides.filter((r) => r.status === "pending_acceptance");
}

/** Primary action label per status (pure, UI reads this). */
export const PRIMARY_ACTION_BY_STATUS: Partial<
  Record<TransportStatus, { toStatus: TransportStatus; labelHe: string }>
> = {
  unassigned: { toStatus: "pending_acceptance", labelHe: "הקצה" },
  pending_acceptance: { toStatus: "accepted", labelHe: "אשר אחריות" },
  accepted: { toStatus: "en_route", labelHe: "בדרך" },
  en_route: { toStatus: "completed", labelHe: "הושלם" },
  // transferred / cancelled / completed intentionally omitted.
};
