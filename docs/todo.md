# Todo — Prioritized Roadmap

Prioritized future work. **Do not open several business modules in parallel before Identity, Household, and RLS are stable.**

## Status

- ✅ **WP0 — Foundation Fixes — complete, merged to `main`.**
- ✅ **WP1 — Knowledge Pack — complete, merged to `main`.**
- ✅ **WP2 — Supabase Local Workflow — complete, merged to `main`** (PR #3, merge commit `9e691c9`).
- ✅ **Post-WP2 consistency pass — complete.** Committed generated route tree brought in sync with the generator, CI freshness check added (ADR-022), stale documentation counts corrected. No business schema, Auth or RLS.
- ✅ **WP3 — Identity & Household Schema — complete.** Two enums + four tables with structural household consistency, RLS enabled with **zero policies and no client grants** (ADR-023), 102 pgTAP tests in CI. No Auth, no policies, no RPC, no module wiring.
- ✅ **WP4 — RLS & Negative Tests — complete.** Three `private` authorization helpers, minimum column-level grants, six policies, 181 structural + 117 behavioural pgTAP tests and 34 Auth-backed integration assertions (ADR-027…ADR-032). No RPC, no Auth UI, no app wiring.
- ✅ **WP5A — Pilot access and local bootstrap — complete.** Environment-guarded idempotent bootstrap, one authenticated adult identity, four profiles, local sign-in and a profile selector. No migration and no RLS change were needed (ADR-035).
- ✅ **WP5A hosted conversion — complete.** Lovable hosts the frontend; the dedicated non-production Supabase project is the only backend (ADR-037). Migrations applied and verified remotely, hosted bootstrap converged and idempotent, hosted Auth verified.
- ✅ **Lovable published-environment fix — complete.** Tracked root `.env` with the two browser-public values, allowlist-enforced (ADR-038).
- ⚠️ **Recommended follow-up:** disable signup on the hosted Supabase project. It is currently enabled, and the repository is public, so a stranger can create an Auth account. RLS gives such an account no data, but the pilot ships no signup flow, so the surface is unnecessary.
- ✅ **WP5B — Task and recurrence foundation — complete** on `feat/wp5b-task-recurrence-foundation`, **not yet merged to `main` and not yet applied to the hosted pilot project.** Four tables, eight enums, deterministic `occurrence_key`, append-only activity log, full RLS with positive and negative tests (ADR-039, ADR-040). 302 structural + 211 behavioural pgTAP. No RPC, no UI, no module wiring.
- ▶️ **WP5C — Child rotation foundation — NEXT.** See [`PILOT_WEEKLY_CHORES.md`](./PILOT_WEEKLY_CHORES.md); approved schedules and staggered cursors in ADR-036.
- ⏸️ **WP4.5 — Identity RPCs — still required, no longer immediately next.**
- ⏸️ **WP4.6 — Auth account deletion — still required and still BLOCKING before production onboarding or account deletion** (ADR-031). It does not block the non-production pilot, which ships no account management and no account deletion.

## Next work packages (in order)

1. **Family Pilot — Weekly Child Chores (NEXT).** Five mergeable packages; full definitions in [`PILOT_WEEKLY_CHORES.md`](./PILOT_WEEKLY_CHORES.md) §12 and the Architecture Approval Brief:
   - ✅ **WP5A** — pilot access and local bootstrap: **done** (ADR-034, ADR-035).
   - ✅ **WP5B** — task and recurrence foundation: **done** (ADR-039, ADR-040). `task_templates`, `task_instances`, `task_assignments`, `task_activity_log`, deterministic occurrence keys, RLS with positive **and** negative tests.
   - **WP5C (NEXT)** — child rotation foundation: `rotation_rules`, `rotation_members`, `rotation_assignment_log`, deterministic assignment reusing `shifts.v1`, persisted `algorithm_version` + `reason_code`, concurrency/idempotency tests. Add the deferred foreign key from `task_assignments.assigned_by_rule_id` to `rotation_rules` in the same migration, and remove the WP5C `hasnt_table` guards from `supabase/tests/database/010_schema_objects.sql`.
   - **WP5D** — weekly chores UI and completion: Sunday→Saturday family and per-child views, completion with confirmed persistence and visible rollback, accessibility and RTL. **Also resolve the ADR-040 open question**: task reads currently use the role-agnostic `is_active_household_member`, so a guest or service provider would read the whole chore list, unlike WP4's narrowed `member_profiles` reads.
   - **WP5E** — quick add ("הוספת מטלה") and family UAT with the real household.
2. **WP4.5 — Identity RPCs.** Every membership and invitation mutation, as authorized, audited, atomic `SECURITY DEFINER` RPCs with a fixed safe `search_path` (ADR-028):
   - Household creation (household + first owner in one transaction).
   - Invitation **creation** (server-side token generation, ≥256-bit, raw token returned exactly once), **revocation**, and **acceptance** — acceptance derives household and role from the token record, never from client input, and consumes a use with a conditional update so concurrent redemptions cannot over-consume.
   - Role change, suspend, revoke, owner transfer — each must prevent removal of the final active owner unless ownership transfers atomically in the same transaction (ADR-026), using `FOR UPDATE` to serialize concurrent demotions.
   - Profile creation and soft delete / restore (48h window, ADR-007).
   - Positive and negative tests for each.
3. **WP4.6 — Auth account deletion and membership retention. Blocks production onboarding and account deletion.**
   - Change `household_members.auth_user_id` to **`ON DELETE RESTRICT`** (ADR-031).
   - A controlled server-side deletion workflow: revoke memberships and transfer ownership _before_ deleting the identity, with audit retention and final-active-owner protection.
   - **Must complete before WP5 introduces real account deletion or production onboarding.** Until then, deleting an Auth account silently deletes membership rows and can leave a household ownerless.
4. **WP5 — Connect Onboarding to real data.** Replace `householdRepo` + `peopleDirectory` while keeping the `subscribe()` surface; onboarding writes to the DB. Other modules stay mock.
5. **Only then** extend the backend to further business modules, one module at a time.

## Documented gaps to resolve (from [`project-status.md`](./project-status.md))

Not to be fixed in a documentation task; scheduled into the packages above or a dedicated task:

- Persistence for all business entities (currently mock, lost on refresh) → WP5 and later module swaps.
- Sensitive actions must move to RPC/server endpoints → WP4.5.
- Notification delivery worker (intent, dedupe, escalation) → after Identity/Household/RLS.
- Client access to `member_profiles.date_of_birth` → a sensitive-profile RPC or permission model (ADR-029). No accessor or view exists today.
- Full offline sync queue (`client_operation_id`, idempotency, conflict UI) → post-MVP, not an MVP condition (ADR-017).
- `src/app/` is empty and modular hooks live under `src/lib/` rather than `src/hooks/` — **documented only**; no refactor yet. Consider a dedicated structure-alignment task later.
- Remove the temporary `peopleDirectory` transport-ID alias table after transport seed regeneration.
- Wire the PWA `sw.js` into the deployed output dir (`.output/public`) when hosting is configured.

## Constraints

- Every schema change requires a migration.
- Every RLS change requires positive **and** negative tests.
- Update [`project-status.md`](./project-status.md), [`todo.md`](./todo.md), [`claude-context.md`](./claude-context.md), and [`gpt-handover.md`](./gpt-handover.md) at the end of every task.
