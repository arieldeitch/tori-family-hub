# Rotation Engine

Source of truth for the rotation (shifts) engine.

The engine must be:

- **deterministic**
- **explainable**
- **versioned**
- **idempotent**
- with **no undocumented randomness**

## Implementation note (Family Pilot)

A pure engine already exists at `src/domain/shifts.ts` with `ALGORITHM_VERSION = "shifts.v1"`, supporting `fixed_sequence`, `weekday_fixed` and `manual`, emitting a `reason_code`, and offering `avoidConsecutive`. `src/features/shifts/human.ts` renders the plain-language explanation. The Family Pilot reuses this engine rather than introducing a second one.

For the pilot, the child rotation is a **`fixed_sequence` over the two child profiles**: strictly alternating, never random, and no hidden AI decision. The concrete profile order is local pilot data (ADR-034), not a value in this document. Whether the sequence advances **per occurrence or per week** is an open decision (see [`PILOT_WEEKLY_CHORES.md`](./PILOT_WEEKLY_CHORES.md) §10) and must be configurable, not hard-coded.

Missing a turn must not push a child to the back of the queue or double their load — see the no-punishment rule below.

When assignments are generated server-side, the persisted instance must carry the `algorithm_version` and the `reason_code` that produced it, so a past assignment stays explainable even after the engine changes. Manual override is a later addition and must record that it overrode a computed value.

## Input

rule · participants · sequence · weekday · availability · eligibility · last assignee · history · algorithm version · fallback.

## Output

- `selected_profile_id` or `unassigned`
- `reason_code`
- human explanation
- candidate snapshot
- algorithm version
- warnings

## Filter order

1. Active membership.
2. Participation in the rule.
3. Age, role, and capability.
4. Availability.
5. Restrictions.
6. Consecutive avoidance.
7. Sequence or scoring.
8. Tie-breaker.

## MVP strategies

- `fixed_sequence`
- `weekday_fixed`
- `manual`

## Future strategies

- `least_recently_done`
- `lowest_load`
- `volunteer`

## Rules

- Unavailable is removed before selection.
- Returning from vacation does not create debt.
- If there is a single eligible candidate, it may be selected even in a run.
- An override does not change history.
- Every assignment stores a reason code and the algorithm version.
- **Date-only logic must not depend on the runtime environment's timezone.**

## Implementation note (post-WP0)

The prototype engine lives in `src/domain/shifts.ts` (pure) with the preview helper in `src/features/shifts/preview.ts`. In WP0 a timezone bug was fixed: occurrence date keys were derived from local midnight then read as a UTC ISO slice, so availability lookups shifted by a day outside UTC. The fix advances occurrence dates on the UTC calendar; regression tests cover UTC, Asia/Jerusalem, a negative offset, and an extreme +14 zone. See [`decisions.md` ADR-006](./decisions.md) and [`project-status.md`](./project-status.md).
