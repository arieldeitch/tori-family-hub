# Todo — Prioritized Roadmap

Prioritized future work. **Do not open several business modules in parallel before Identity, Household, and RLS are stable.**

## Next work packages (in order)

1. **WP2 — Supabase Local Workflow.** Provision local Supabase (CLI, `supabase/` init), integration client, `.env` with `VITE_SUPABASE_URL` + publishable key only. No service role in the frontend.
2. **WP3 — Identity & Household Schema.** Migrations for `households`, `household_members` (role enum), `member_profiles`, `user_roles`, `has_role` SECURITY DEFINER — one migration with `GRANT` + `ENABLE ROW LEVEL SECURITY`.
3. **WP4 — RLS & Negative Tests.** Policies on the Identity/Household tables (membership predicate), positive and negative tests (a user outside the household gets zero rows / fails).
4. **WP5 — Connect Onboarding to real data.** Replace `householdRepo` + `peopleDirectory` while keeping the `subscribe()` surface; onboarding writes to the DB. Other modules stay mock.
5. **Only then** extend the backend to further business modules, one module at a time.

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
