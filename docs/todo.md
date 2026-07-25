# Todo — Prioritized Roadmap

Prioritized future work. **Do not open several business modules in parallel before Identity, Household, and RLS are stable.**

## Status

- ✅ **WP0 — Foundation Fixes — complete, merged to `main`.**
- ✅ **WP1 — Knowledge Pack — complete, merged to `main`.**
- 🟡 **WP2 — Supabase Local Workflow — implementation complete; PR #3 merge PENDING** (`wp2-supabase-local-workflow` → `main`, checks green). Not yet on `main`.
- ▶️ **WP3 — Identity & Household Schema — NEXT** (start only after PR #3 merges).

## Next work packages (in order)

1. **WP3 — Identity & Household Schema (NEXT, after PR #3 merges).** Foundation only:
   - Tables: `households`, `member_profiles`, `household_members`, `household_invitations`.
   - Enums, constraints, indexes.
   - One migration in `supabase/migrations/`, regenerate `src/infrastructure/supabase/database.types.ts`.
   - Schema tests.
   - **WP3 does NOT include:** UI changes, onboarding wiring, child PIN authentication, invitation acceptance flow, full RLS policies, or any other business module.
2. **WP4 — RLS & Negative Tests.** Enable RLS + policies on the Identity/Household tables (membership predicate; `user_roles` + `has_role` SECURITY DEFINER as needed), with positive **and** negative tests (a user outside the household gets zero rows / fails). Every `CREATE TABLE public.*` ships `GRANT` + `ENABLE ROW LEVEL SECURITY` in the same migration.
3. **WP5 — Connect Onboarding to real data.** Replace `householdRepo` + `peopleDirectory` while keeping the `subscribe()` surface; onboarding writes to the DB. Other modules stay mock.
4. **Only then** extend the backend to further business modules, one module at a time.

## Documented gaps to resolve (from [`project-status.md`](./project-status.md))

Not to be fixed in a documentation task; scheduled into the packages above or a dedicated task:

- Persistence for all business entities (currently mock, lost on refresh) → WP2–WP5 and later module swaps.
- Sensitive actions must move to RPC/server endpoints → with WP3/WP4.
- Notification delivery worker (intent, dedupe, escalation) → after Identity/Household/RLS.
- Full offline sync queue (`client_operation_id`, idempotency, conflict UI) → post-MVP, not an MVP condition (ADR-017).
- `src/app/` and `src/infrastructure/` are empty and modular hooks live under `src/lib/` — **documented only**; no refactor in WP1. Consider a dedicated structure-alignment task later.
- Remove the temporary `peopleDirectory` transport-ID alias table after transport seed regeneration.
- Wire the PWA `sw.js` into the deployed output dir (`.output/public`) when hosting is configured.

## Constraints

- Every schema change requires a migration.
- Every RLS change requires positive **and** negative tests.
- Update [`project-status.md`](./project-status.md), [`todo.md`](./todo.md), [`claude-context.md`](./claude-context.md), and [`gpt-handover.md`](./gpt-handover.md) at the end of every task.
