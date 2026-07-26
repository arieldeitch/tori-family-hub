# Project Status

**Verified facts only.** When a canonical requirement differs from the code, the gap is recorded here and in [`todo.md`](./todo.md) — the requirement is not rewritten and the code is not changed outside a dedicated task. Business truth lives in [`01-product-requirements.md`](./01-product-requirements.md).

_Last updated: WP4 — Identity & Household RLS, grants and negative-access tests._

## Current snapshot (resume here)

Point-in-time state so work can resume without relying on chat history.

- **`main` contains WP0 + WP1 + WP2 + the post-WP2 consistency pass + WP3 + WP4.**
- **Done & merged to `main`:** WP0 (foundation fixes), WP1 (knowledge pack), WP2 (Supabase local workflow, PR #3 / `9e691c9`), post-WP2 consistency (PR #4 / `17647b4`), WP3 (Identity & Household schema, PR #5 / `924d621`), WP4 (RLS, grants, negative tests).
- **WP5A (pilot access and local bootstrap) is complete.** Environment-guarded idempotent bootstrap, one authenticated adult identity, four member profiles, local sign-in and a profile selector — **no migration and no RLS change were required** (ADR-035).
- **The pilot is now hosted** (ADR-037): Lovable hosts the frontend, the dedicated non-production Supabase project `tori-family-pilot` (eu-central-1, personal org) is the only backend. WP2/WP3/WP4 migrations are applied remotely and verified; the hosted pilot household is bootstrapped and idempotent. Docker is no longer required for family use.
- **Next step: WP5B — Task and recurrence foundation.** Approved chore schedules and staggered rotation defaults are recorded in ADR-036. No task or rotation table exists yet.
- **Still required, no longer immediately next:** WP4.5 (Identity RPCs) and WP4.6 (Auth account deletion — still blocking before production onboarding or account deletion, ADR-031).
- **Quality gates (local):** typecheck 0 · lint 0 errors / 6 shadcn warnings · **app tests 162/162 across 19 files** · build ✓ · `routes:check` ✓ · `check:client-secrets` ✓ · **structural pgTAP 181/181 across 9 files** · **behavioural RLS pgTAP 117/117 across 6 files** · **34/34 Auth-backed integration assertions** · `db:verify` ✓.
- **WP2 facts:** Supabase CLI `2.109.1` (locked dev dep), `@supabase/supabase-js` `2.110.8` (runtime), package manager **Bun 1.3.14**. Local `project_id = tori-family-hub`, app dev URL `http://localhost:8080`, Supabase local ports remapped to the **553xx** range (to avoid clashing with another local stack). Foundation migration: `supabase/migrations/20260724153731_wp2_foundation.sql` (empty). `supabase/seed.sql` has no business data. Generated types: `src/infrastructure/supabase/database.types.ts`. Client is scaffold only. Public env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. No service role in frontend, no remote link, no `db push`. CI has a separate `database` job; `db:verify` = reset + type freshness + smoke.
- **Local stack:** stopped at session closeout. To resume: start Docker, then `bun run supabase:start` (ports `553xx`), copy URL + publishable key from `bun run supabase:status` into `.env.local`.

## Where the project is

- Prototype was built in Lovable.
- GitHub is connected.
- Claude Code is active.
- The Repository Acceptance Audit is complete.
- **WP0 (Foundation Fixes), WP1 (Knowledge Pack), WP2 (Supabase Local Workflow) and WP3 (Identity & Household Schema) are complete and merged to `main`.**
- A local-first Supabase dev environment exists: `supabase/` (config, two migrations, business-empty seed, pgTAP tests) plus an infrastructure-only typed client. The Identity & Household tables now exist but are locked down and **not connected to any business module** — all modules still use the in-memory mock repositories.

## Verified state after WP0

- `typecheck` uses `tsc --noEmit`.
- `.gitattributes` enforces LF line endings.
- The rotation-engine timezone bug is fixed.
- Regression tests were added for several timezones.
- **158 of 158 tests pass.**
- `lint` passes with 0 errors and 6 known shadcn warnings.
- `build` passes.
- The PWA precache includes app-shell assets.
- CI is green.

## Verified state after WP2

- Supabase CLI is a **locked dev dependency** (`supabase`), `@supabase/supabase-js` a runtime dependency. Run via `bunx supabase`.
- `supabase/` is in Git: `config.toml` (ports remapped to the 553xx range to avoid clashing with other local stacks; `auth.site_url = http://localhost:8080`), one empty foundation migration, and a business-empty `seed.sql`.
- The local stack starts, `bun run db:reset` applies migrations + seed cleanly, `bun run db:types` regenerates `src/infrastructure/supabase/database.types.ts`, and `bun run db:smoke` passes a public-key-only REST health check.
- A typed infrastructure client (`src/infrastructure/supabase/`) exists with lazy, Zod-validated public env — **infrastructure scaffold only, not wired to any business module**.
- CI has a separate `database` job validating migrations, seed, type freshness, and the smoke test. No secrets, no remote project.
- **162 of 162 tests pass** across 19 test files (158 + 4 new public-env validation tests).
- `typecheck`, `lint` (0 errors, 6 known warnings), and `build` remain green.

## Verified state after the post-WP2 consistency pass

- **`src/routeTree.gen.ts` is committed generated runtime source and is now in sync with the generator.** Previously, `vite build` regenerated the file with a TanStack Start `Register` module augmentation that was missing from the committed version, so every build left an unexpected tracked diff. The regenerated file is committed, and generation is a verified fixed point (two consecutive builds produce an identical file).
- **CI now fails if the committed route tree is stale.** The `verify` job runs `bun run routes:check` immediately after `build`; the check asserts the build left `src/routeTree.gen.ts` untouched. See [`decisions.md`](./decisions.md) ADR-022.
- No dependency was added — the project's own build is the generator.
- Documentation counts were re-verified against the repository (tests, test files, route files, CI jobs).

## Verified state after WP3

- **The Identity & Household schema exists**: `supabase/migrations/20260725143927_wp3_identity_household.sql` creates the enums `household_role` and `household_membership_status` and the tables `households`, `member_profiles`, `household_members`, `household_invitations`.
- **The tables are deliberately unreachable by any client** (ADR-023): RLS enabled on all four, **zero policies**, and all privileges revoked from `PUBLIC`, `anon` and `authenticated`. WP4 adds the minimum `GRANT`s together with the policy set.
- **Household consistency is structural, not policy-dependent**: a composite foreign key `(profile_id, household_id) → member_profiles (id, household_id)` makes cross-household membership impossible, and a trigger makes `household_id` immutable on every household-owned row.
- **`auth.users` is referenced only** — foreign keys on `id`, never written by SQL, no trigger on it. `auth_user_id` is nullable for child/non-login profiles (ADR-013); live-membership uniqueness is scoped per household so one account can join many households but not twice the same one.
- **No PIN credential material exists** (ADR-025): `member_profiles` has no `pin_hash`; `pin_auth_enabled` is non-sensitive metadata defaulting to `false`.
- **102 pgTAP tests across 7 files** pass (`bun run db:test`), transactional and independent, wired into the CI `database` job. They assert structure, constraints and the locked-down state — **not** household isolation, which needs policies and belongs to WP4.
- `supabase/seed.sql` remains **business-empty**; fixtures are test-local and rolled back.
- Generated `database.types.ts` regenerated and CI-verified fresh. App gates unchanged and green.
- **Still no Auth flow, no RPC, and no module reads or writes these tables** — every business module still uses in-memory mock repositories.

## Verified state after WP4

- **RLS is enforced.** `supabase/migrations/20260725154640_wp4_identity_household_rls.sql` adds three authorization helpers in a non-exposed `private` schema, the minimum column-level grants, and six policies — grants and policies in one migration (ADR-023).
- **Reads are scoped; authority is unreachable.** Members read their own household; guests and service providers see only their own row; owners alone update household settings and list invitations. `household_members` and `household_invitations` have **no** client INSERT/UPDATE/DELETE at all, so self-assignment, role escalation, `auth_user_id` spoofing, membership removal and invitation forgery are impossible rather than merely disallowed (ADR-028).
- **Sensitive columns are ungranted:** `date_of_birth` (neither read nor write, and no accessor was created), `token_hash`, `auth_user_id`, and the `created_by`/`deleted_at`/`deleted_by` audit columns (ADR-029).
- **`anon` holds nothing** — no schema usage, no function execute, no column privilege, no policy.
- **Fails closed** on NULL `auth.uid()`, suspended, revoked, expired access (boundary-tested), soft-deleted household and deactivated caller profile.
- **117 behavioural RLS pgTAP tests + 34 publishable-key integration assertions** pass, alongside 181 structural tests. Every behavioural test asserts `current_user = 'authenticated'` first, because pgTAP connects as a `BYPASSRLS` owner.
- **`service_role` gained DML** for server-side administration and fixtures only; `check:client-secrets` proves no service-role material reaches `src/` or the build output (ADR-030).
- `seed.sql` is still **business-empty**; fixtures are created and cleaned up by the harness (ADR-032).
- **Still outstanding and blocking:** `household_members.auth_user_id` remains `ON DELETE CASCADE`. **WP4.6 must land before production onboarding or any real account-deletion path** (ADR-031).
- **No Auth UI, no app Auth wiring, no onboarding persistence, no RPC** — modules still use mocks.

## Not yet present

- Supabase **business-module schema** (tasks, calendar, transport, follow-ups, shopping, errands). The Identity & Household foundation now exists (WP3); nothing else does.
- Real Auth (the scaffold client has Auth intentionally inert).
- Invitation creation / revocation / acceptance RPC, role-change RPC, suspend/revoke RPC, owner-transfer RPC, household-creation RPC (all WP4.5).
- The controlled Auth account-deletion workflow and the `ON DELETE RESTRICT` change (WP4.6 — **blocks WP5 production onboarding**).
- Client access to `date_of_birth` (deferred to a sensitive-profile permission model).
- Persistence after refresh (modules still use mock repositories).
- A remote Supabase project (local-only).
- Full production deployment.
- Full E2E.
- Business backend.

Roles and PIN are **UX guards only** and are not security.

## Additional verified facts

- There are **41 route modules** (`.tsx`) under `src/routes/` — 42 tracked files in total, since `src/routes/README.md` is documentation, not a route. Not all 41 are standalone navigation screens: `__root.tsx` is the root layout, and several are layout wrappers paired with an `.index.tsx` child (e.g. `tasks.tsx` + `tasks.index.tsx`).
- `src/routeTree.gen.ts` is **generated** from `src/routes/` by TanStack Start during `vite build`. It is committed and CI-verified — never edit it by hand (ADR-022).
- `src/app/` is empty (`.gitkeep` only). `src/infrastructure/` now contains the Supabase scaffold under `src/infrastructure/supabase/` (WP2); the `.gitkeep` remains.
- The modular hooks currently live mostly under `src/lib/` (e.g. `useTasks`, `useToday`), not `src/hooks/` (which holds only `use-mobile.tsx`).
- A temporary alias exists in the people directory for transport IDs (`peopleDirectory` `ALIAS_TO_CANONICAL`, `m1..m4`).
- The PWA is app-shell-only.

## Gaps between requirements and implementation

These are documented, not fixed, in WP1 (no code changes). Each is tracked in [`todo.md`](./todo.md).

| Requirement (PRD)                                                                  | Current implementation                                                                                                                                                                                    | Gap type                                                                                        |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Supabase backend; PostgreSQL is the source of truth                                | Local Supabase workflow + scaffold client (WP2) and the Identity & Household schema (WP3) exist, but no business-module schema and no module reads/writes the database; modules still use in-memory mocks | In progress (WP2 scaffold, WP3 identity schema; connection in WP5)                              |
| Auth + child limited sessions                                                      | No auth; role/child selection is UX-only. The schema supports it: `auth_user_id` is nullable for children, `pin_auth_enabled` exists as metadata                                                          | Not yet implemented                                                                             |
| RLS on every family table                                                          | Enforced on the four identity tables with column-level grants and positive/negative tests (WP4). No business-module tables exist yet to protect                                                           | Done for Identity/Household                                                                     |
| Permissions enforced on server                                                     | Client-side guards only; bypassable via devtools                                                                                                                                                          | Technical debt / mock only                                                                      |
| Persistent tasks, transport, follow-ups, shopping, etc.                            | Mock repos, lost on refresh                                                                                                                                                                               | Mock only                                                                                       |
| Sensitive actions via RPC/server                                                   | Performed in-memory in the client                                                                                                                                                                         | Not yet implemented                                                                             |
| Notifications via worker (intent, dedupe, escalation)                              | Notification screen is UI-only; no delivery                                                                                                                                                               | Mock only                                                                                       |
| Full offline sync with `client_operation_id`                                       | App-shell-only PWA; no offline data or sync queue                                                                                                                                                         | Not yet implemented                                                                             |
| Architecture `src/app/`, `src/infrastructure/` populated; hooks under `src/hooks/` | Both dirs empty; hooks under `src/lib/`                                                                                                                                                                   | Technical debt (documented; no refactor in WP1)                                                 |
| `peopleDirectory` canonical IDs                                                    | Temporary transport-ID alias table still present                                                                                                                                                          | Technical debt                                                                                  |
| PWA `sw.js` in the deployed output dir                                             | Generated to `dist/`, not `.output/public` in local/CI builds                                                                                                                                             | Technical debt (deferred; see [`LOVABLE_KNOWN_LIMITATIONS.md`](./LOVABLE_KNOWN_LIMITATIONS.md)) |
