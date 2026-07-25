# Todo — Prioritized Roadmap

Prioritized future work. **Do not open several business modules in parallel before Identity, Household, and RLS are stable.**

## Status

- ✅ **WP0 — Foundation Fixes — complete, merged to `main`.**
- ✅ **WP1 — Knowledge Pack — complete, merged to `main`.**
- ✅ **WP2 — Supabase Local Workflow — complete, merged to `main`** (PR #3, merge commit `9e691c9`).
- ✅ **Post-WP2 consistency pass — complete.** Committed generated route tree brought in sync with the generator, CI freshness check added (ADR-022), stale documentation counts corrected. No business schema, Auth or RLS.
- ✅ **WP3 — Identity & Household Schema — complete.** Two enums + four tables with structural household consistency, RLS enabled with **zero policies and no client grants** (ADR-023), 102 pgTAP tests in CI. No Auth, no policies, no RPC, no module wiring.
- ▶️ **WP4 — RLS & Negative Tests — NEXT.** Not blocked.

## Next work packages (in order)

1. **WP4 — RLS & Negative Tests (NEXT).** The opening step for the locked-down WP3 tables:
   - Add the **minimum** required `GRANT`s to `anon`/`authenticated` **together with** the complete RLS policy set, in one migration (ADR-023).
   - Membership predicate: `EXISTS (SELECT 1 FROM household_members WHERE household_id = x AND auth_user_id = auth.uid() AND status = 'active')`.
   - `has_household_role` SECURITY DEFINER helper over `household_members` (ADR-024), with a fixed safe `search_path`. **No `user_roles` table.**
   - Positive **and** negative tests: a user outside the household gets zero rows / fails; INSERT with a different household fails; UPDATE of `household_id` fails; a cross-household relation fails.
   - Real Auth users created through the **Auth admin API, never SQL**, enabling the Household A/B base dataset from [`09-testing-strategy.md`](./09-testing-strategy.md).
   - Future role-change/suspend/revoke RPCs must prevent removal of the final active owner unless ownership transfers atomically (ADR-026).
2. **WP5 — Connect Onboarding to real data.** Replace `householdRepo` + `peopleDirectory` while keeping the `subscribe()` surface; onboarding writes to the DB. Other modules stay mock.
3. **Only then** extend the backend to further business modules, one module at a time.

## Documented gaps to resolve (from [`project-status.md`](./project-status.md))

Not to be fixed in a documentation task; scheduled into the packages above or a dedicated task:

- Persistence for all business entities (currently mock, lost on refresh) → WP5 and later module swaps.
- Sensitive actions must move to RPC/server endpoints → with WP4.
- Notification delivery worker (intent, dedupe, escalation) → after Identity/Household/RLS.
- Full offline sync queue (`client_operation_id`, idempotency, conflict UI) → post-MVP, not an MVP condition (ADR-017).
- `src/app/` is empty and modular hooks live under `src/lib/` rather than `src/hooks/` — **documented only**; no refactor yet. Consider a dedicated structure-alignment task later.
- Remove the temporary `peopleDirectory` transport-ID alias table after transport seed regeneration.
- Wire the PWA `sw.js` into the deployed output dir (`.output/public`) when hosting is configured.

## Constraints

- Every schema change requires a migration.
- Every RLS change requires positive **and** negative tests.
- Update [`project-status.md`](./project-status.md), [`todo.md`](./todo.md), [`claude-context.md`](./claude-context.md), and [`gpt-handover.md`](./gpt-handover.md) at the end of every task.
