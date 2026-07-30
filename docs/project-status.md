# Project Status

**Verified facts only.** When a canonical requirement differs from the code, the gap is recorded here and in [`todo.md`](./todo.md) — the requirement is not rewritten and the code is not changed outside a dedicated task. Business truth lives in [`01-product-requirements.md`](./01-product-requirements.md).

_Last updated: **2026-07-30** — repository audit (documentation only; no code, schema or dependency change)._

## Audit of 2026-07-30 — what was verified and what was corrected

A full state audit was run against the repository, not against chat history.

- **Audited commit:** `17f1ebd` (`docs: ADR-038 for the tracked browser-public configuration`, authored 2026-07-26).
- **Audited branch:** `wp5a-lovable-published-env`, in sync with its remote, working tree clean. The branch has since been merged and deleted.
- **PR #10 is merged.** It had been open, `MERGEABLE` and CI-green since 2026-07-26. Merged on **2026-07-30** as `b9c603b`, and the `wp5a-lovable-published-env` branch was deleted. `main` now carries the ADR-038 tracked root `.env` — verified after the merge to hold **exactly** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. A published Lovable build from `main` can now configure itself.
- **`main` was at `51c586e`** (merge of PR #9) when the audit began.
- **No commits between 2026-07-26 and the audit.** The gap was four days of no repository activity.
- **Re-run and green on this machine:** `bun install --frozen-lockfile`, `typecheck`, `lint`, `test`, `build`, `routes:check`, `check:client-secrets`, `check:pilot-privacy`, `pilot:test:hosted-guard`.
- **Not re-run during the audit itself:** every database gate. The Docker daemon was down at the time, and `db:verify` begins with `supabase db reset`, which the audit's terms forbade. They were not unverified even then: the CI `database` job — migrations, type freshness, smoke, both pgTAP suites, the Auth-backed integration suite and the pilot bootstrap tests — **passed on PR #10 at the audited commit**. Docker was started later the same day and the database gates were re-run in full as part of WP5B.

Counts corrected by this audit (documentation had drifted behind the last three commits):

| Fact            | Previously documented      | Verified 2026-07-30                                                                                                                            |
| --------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| App tests       | 162 across 19 files        | **210 across 24 files**                                                                                                                        |
| Lint warnings   | 6 (all shadcn)             | **7** — 6 shadcn `react-refresh` + 1 unused `eslint-disable` (`src/lib/pilot/runtimeConfig.ts:95`). Still **0 errors**.                        |
| Route modules   | 41 `.tsx`, 42 tracked      | **44 `.tsx`, 45 tracked** (`src/routes/README.md` is documentation, not a route)                                                               |
| Supabase client | "scaffold only, not wired" | **Wired** — the pilot slice (`usePilotSession`, `usePilotHousehold`) performs real Auth and real reads. Every _business_ module is still mock. |

## Current snapshot (resume here)

Point-in-time state so work can resume without relying on chat history.

- **`main` contains WP0 + WP1 + WP2 + the post-WP2 consistency pass + WP3 + WP4 + WP5A + ADR-038.**
- **Done & merged to `main`:** WP0 (foundation fixes), WP1 (knowledge pack), WP2 (Supabase local workflow, PR #3 / `9e691c9`), post-WP2 consistency (PR #4 / `17647b4`), WP3 (Identity & Household schema, PR #5 / `924d621`), WP4 (RLS, grants, negative tests).
- **WP5A (pilot access and local bootstrap) is complete.** Environment-guarded idempotent bootstrap, one authenticated adult identity, four member profiles, local sign-in and a profile selector — **no migration and no RLS change were required** (ADR-035).
- **The pilot is now hosted** (ADR-037): Lovable hosts the frontend, the dedicated non-production Supabase project `tori-family-pilot` (eu-central-1, personal org) is the only backend. WP2/WP3/WP4 migrations are applied remotely and verified; the hosted pilot household is bootstrapped and idempotent. Docker is no longer required for family use.
- **Published Lovable builds are now configurable** (ADR-038): the two browser-public Supabase values live in a tracked root `.env`, because published builds do not receive ignored files. An enforced allowlist plus a test keeps everything else out, and `.gitignore` still ignores every other `.env` variant.
- **Current step: WP5B — Task and recurrence foundation.** Approved chore schedules and staggered rotation defaults are recorded in ADR-036. No rotation table exists yet (that is WP5C).
- **Still required, no longer immediately next:** WP4.5 (Identity RPCs) and WP4.6 (Auth account deletion — still blocking before production onboarding or account deletion, ADR-031).
- **Quality gates, re-verified 2026-07-30:** `install --frozen-lockfile` ✓ · typecheck 0 · lint **0 errors / 7 warnings** · **app tests 210/210 across 24 files** · build ✓ · `routes:check` ✓ · `check:client-secrets` ✓ (564 files scanned) · `check:pilot-privacy` ✓ (368 tracked files) · `pilot:test:hosted-guard` ✓ (26/26).
- **Database gates:** see the WP5B section below for the numbers measured on 2026-07-30 after Docker was started. The pre-WP5B baseline carried forward from WP4 was 181 structural pgTAP across 9 files, 117 behavioural RLS pgTAP across 6 files and 34 Auth-backed integration assertions.
- **WP2 facts:** Supabase CLI `2.109.1` (locked dev dep), `@supabase/supabase-js` `2.110.8` (runtime), package manager **Bun 1.3.14** (Node `v24.15.0` present locally; CI uses `oven-sh/setup-bun@v2`). Local `project_id = tori-family-hub`, app dev URL `http://localhost:8080`, Supabase local ports remapped to the **553xx** range (to avoid clashing with another local stack). Foundation migration: `supabase/migrations/20260724153731_wp2_foundation.sql` (empty). `supabase/seed.sql` has no business data. Generated types: `src/infrastructure/supabase/database.types.ts`. Public env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. No service role in frontend, no `db push`. CI has a separate `database` job; `db:verify` = reset + type freshness + smoke + the full suite.
- **The client is no longer scaffold-only.** `src/infrastructure/supabase/` is consumed by `src/lib/pilot/usePilotSession.ts` (real `signInWithPassword` / `signOut` / session subscription) and `src/lib/pilot/usePilotHousehold.ts` (real household + profile reads under WP4 RLS). This is the pilot slice only; **no business module reads or writes the database**.
- **A remote project is linked locally.** `supabase/.temp/linked-project.json` and `supabase/.temp/project-ref` exist and are correctly git-ignored via `supabase/.gitignore`. This is the hosted non-production pilot project of ADR-037 — the repository holds no credential for it.
- **Local stack:** stopped at session closeout. To resume: start Docker, then `bun run supabase:start` (ports `553xx`), copy URL + publishable key from `bun run supabase:status` into `.env.local`.

## Where the project is

- Prototype was built in Lovable.
- GitHub is connected.
- Claude Code is active.
- The Repository Acceptance Audit is complete.
- **WP0, WP1, WP2, the post-WP2 consistency pass, WP3, WP4 and WP5A (including the hosted conversion and the ADR-038 tracked-`.env` work) are all complete and merged to `main`.**
- A Supabase environment exists in two forms: the local CLI stack for development and CI, and the hosted non-production pilot project that ADR-037 makes the exclusive backend. `supabase/` holds config, **three** migrations, a business-empty seed and 15 pgTAP files (9 structural + 6 behavioural RLS).
- The Identity & Household tables exist with RLS enforced, and are read by the pilot slice only. **No business module is connected to the database** — every business module still uses the in-memory mock repositories in `src/data/*Repo.ts`.

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

## Product capability state (verified 2026-07-30)

Classification rule: a capability is **Complete** only with persistence, a real data source, server-enforced permissions and a full flow. A screen alone is never Complete.

| Capability                      | Status                               | Evidence                                                                                                                                                                                                                                                         |
| ------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication                  | **Partial**                          | Real Supabase Auth password sign-in for the single pilot adult: `src/lib/pilot/usePilotSession.ts`, `src/features/pilot/PilotSignInScreen.tsx`, `src/routes/pilot.signin.tsx`. No signup, no recovery, no child login, no PIN, no route guard outside the pilot. |
| Household onboarding            | **Scaffold only**                    | `src/features/onboarding/OnboardingWizard.tsx` + `src/routes/onboarding.tsx` write to the in-memory `src/data/householdRepo.ts`. Nothing persists; no creation RPC exists (WP4.5).                                                                               |
| Members / adults / children     | **Partial**                          | Read-only from the database in the pilot (`src/lib/pilot/usePilotHousehold.ts`, `src/features/pilot/ProfileSelector.tsx`); the full `src/features/household/` screens are mock-backed. Profiles are created by the bootstrap script, never by the UI.            |
| Today screen                    | **Scaffold only**                    | `src/features/today/TodayScreen.tsx`, `src/application/todayService.ts`, `src/data/todayRepo.ts` — mock, lost on refresh.                                                                                                                                        |
| One-off tasks                   | **Scaffold only**                    | `src/features/tasks/*`, `src/data/tasksRepo.ts` (file header: "In-memory task repository. Prototype only — no persistence").                                                                                                                                     |
| Recurring templates & instances | **Scaffold only**                    | `src/features/templates/*`, `src/domain/recurrence.ts`, `src/data/templatesRepo.ts` — mock. No `task_templates` / `task_instances` table exists.                                                                                                                 |
| Rotation                        | **Partial (engine only)**            | `src/domain/shifts.ts` is a tested pure engine (`ALGORITHM_VERSION = "shifts.v1"`, reason codes) with plain-language rendering in `src/features/shifts/human.ts`. No `rotation_rules` table, no persisted assignment, no `algorithm_version` column.             |
| Calendar                        | **Scaffold only**                    | `src/features/calendar/*`, `src/data/calendarRepo.ts` — mock.                                                                                                                                                                                                    |
| Transport                       | **Scaffold only**                    | `src/features/transport/*`, `src/data/transportRepo.ts` — mock; still carries the temporary `peopleDirectory` alias table.                                                                                                                                       |
| Follow-up                       | **Scaffold only**                    | `src/features/follow-ups/*`, `src/data/followUpRepo.ts` — mock.                                                                                                                                                                                                  |
| Shopping                        | **Scaffold only**                    | `src/features/shopping/*`, `src/application/shoppingService.ts`, `src/data/shoppingRepo.ts` — mock.                                                                                                                                                              |
| Notifications                   | **Scaffold only**                    | `src/features/notifications/*` renders a list and preferences from `src/data/notificationsRepo.ts`. **No delivery of any kind** — no worker, no push, no email, no cron.                                                                                         |
| Child view                      | **Scaffold only**                    | `src/features/child-mode/ChildHome.tsx`, `src/features/today/ChildTodayScreen.tsx`, `src/routes/child.tsx` — mock data, and child mode is a UX guard, not a session.                                                                                             |
| Soft delete & restore           | **Scaffold only**                    | `src/domain/recurrence.ts` (`isSoftDeleted`) and `src/features/templates/TrashScreen.tsx` implement the 48h rule (ADR-007) in memory. The identity tables carry `deleted_at` / `deleted_by`, but those columns are ungranted to clients (ADR-029).               |
| Offline queue                   | **Not started**                      | No `client_operation_id` anywhere in `src/`, and no queue module. `PendingSyncBadge`, `SyncStatusIndicator`, `SyncConflictDialog` and `OfflineState` are design-system components with no sync engine behind them.                                               |
| PWA                             | **Partial**                          | `src/lib/pwa/register.ts` + `vite-plugin-pwa`; the build emits `dist/sw.js` with a 148-entry precache. App-shell only, and `sw.js` still lands in `dist/` rather than the deployed `.output/public`.                                                             |
| Hebrew / RTL / i18n             | **Complete**                         | `<html lang="he" dir="rtl">` in `src/routes/__root.tsx`, a typed dictionary in `src/locales/he.ts` and a path-typed accessor in `src/lib/i18n.ts`. Single locale by design.                                                                                      |
| Household isolation (RLS)       | **Complete for the identity tables** | `supabase/migrations/20260725154640_wp4_identity_household_rls.sql` plus 6 behavioural RLS pgTAP files and 9 structural files. **No business table exists to protect yet.**                                                                                      |

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

- There are **44 route modules** (`.tsx`) under `src/routes/` — **45 tracked files** in total, since `src/routes/README.md` is documentation, not a route (verified 2026-07-30). Not all 44 are standalone navigation screens: `__root.tsx` is the root layout, and several are layout wrappers paired with an `.index.tsx` child (e.g. `tasks.tsx` + `tasks.index.tsx`). The three added since WP4 are the pilot routes `pilot.tsx`, `pilot.index.tsx` and `pilot.signin.tsx`.
- **`/` no longer redirects to `/today`.** `src/routes/index.tsx` routes by pilot session state: signed out → `/pilot/signin`, signed in → `/pilot`, unconfigured → a visible configuration error screen. The hosted product surface is the pilot, not the mock-data app.
- `src/routeTree.gen.ts` is **generated** from `src/routes/` by TanStack Start during `vite build`. It is committed and CI-verified — never edit it by hand (ADR-022).
- `src/app/` is empty (`.gitkeep` only). `src/infrastructure/` now contains the Supabase scaffold under `src/infrastructure/supabase/` (WP2); the `.gitkeep` remains.
- The modular hooks currently live mostly under `src/lib/` (e.g. `useTasks`, `useToday`), not `src/hooks/` (which holds only `use-mobile.tsx`).
- A temporary alias exists in the people directory for transport IDs (`peopleDirectory` `ALIAS_TO_CANONICAL`, `m1..m4`).
- The PWA is app-shell-only.

## Gaps between requirements and implementation

These are documented, not fixed, in WP1 (no code changes). Each is tracked in [`todo.md`](./todo.md).

| Requirement (PRD)                                                                  | Current implementation                                                                                                                                                                                                                                                  | Gap type                                                                                        |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Supabase backend; PostgreSQL is the source of truth                                | Local + hosted Supabase, the Identity & Household schema (WP3) and RLS (WP4) exist, and the pilot slice reads the database. **No business-module schema exists and no business module reads or writes the database** — they use in-memory mocks                         | In progress (identity done; business schema starts at WP5B)                                     |
| Auth + child limited sessions                                                      | Real Supabase Auth exists for **one** adult pilot identity (password sign-in). No signup, recovery, child session or PIN. Role/child selection is still UX-only. The schema supports it: `auth_user_id` is nullable for children, `pin_auth_enabled` exists as metadata | Partial (adult sign-in only)                                                                    |
| RLS on every family table                                                          | Enforced on the four identity tables with column-level grants and positive/negative tests (WP4). No business-module tables exist yet to protect                                                                                                                         | Done for Identity/Household                                                                     |
| Permissions enforced on server                                                     | Client-side guards only; bypassable via devtools                                                                                                                                                                                                                        | Technical debt / mock only                                                                      |
| Persistent tasks, transport, follow-ups, shopping, etc.                            | Mock repos, lost on refresh                                                                                                                                                                                                                                             | Mock only                                                                                       |
| Sensitive actions via RPC/server                                                   | Performed in-memory in the client                                                                                                                                                                                                                                       | Not yet implemented                                                                             |
| Notifications via worker (intent, dedupe, escalation)                              | Notification screen is UI-only; no delivery                                                                                                                                                                                                                             | Mock only                                                                                       |
| Full offline sync with `client_operation_id`                                       | App-shell-only PWA; no offline data or sync queue                                                                                                                                                                                                                       | Not yet implemented                                                                             |
| Architecture `src/app/`, `src/infrastructure/` populated; hooks under `src/hooks/` | Both dirs empty; hooks under `src/lib/`                                                                                                                                                                                                                                 | Technical debt (documented; no refactor in WP1)                                                 |
| `peopleDirectory` canonical IDs                                                    | Temporary transport-ID alias table still present                                                                                                                                                                                                                        | Technical debt                                                                                  |
| PWA `sw.js` in the deployed output dir                                             | Generated to `dist/`, not `.output/public` in local/CI builds                                                                                                                                                                                                           | Technical debt (deferred; see [`LOVABLE_KNOWN_LIMITATIONS.md`](./LOVABLE_KNOWN_LIMITATIONS.md)) |

## Blockers and risks (2026-07-30)

Ordered by what they cost if left alone.

1. ~~ADR-038 is unmerged.~~ **Resolved 2026-07-30** — PR #10 merged as `b9c603b`.
2. **Signup is open on the hosted pilot project — and cannot be closed from this machine.** Recorded in [`todo.md`](./todo.md) on 2026-07-26. The repository is public and the hosted URL and publishable key are committed, so a stranger can create an Auth account. WP4 RLS gives such an account no data and the pilot ships no signup flow, so this is an unnecessary surface rather than a data leak.

   **Verified 2026-07-30:** the Supabase CLI on this machine is authenticated to a **different account** — `bunx supabase projects list` returns five unrelated projects and **not** `tori-family-pilot`, whose ref is recorded in the git-ignored `supabase/.temp/linked-project.json`. The pilot lives in a personal organisation the current token cannot reach, so the Management API cannot be used and no attempt was made to work around it. **This is the one remaining manual action:** _Supabase Dashboard → the `tori-family-pilot` project → Authentication → Providers → Email → disable new user signups._ Do not disable sign-in for the existing pilot adult, and change no other provider.

3. **WP4.6 still blocks production.** `household_members.auth_user_id` remains `ON DELETE CASCADE` (ADR-031): deleting an Auth account silently removes membership rows and can leave a household ownerless. It does not block the non-production pilot.
4. **The database gates were last observed in CI on 2026-07-26**, where they passed at the audited commit. They have not been run locally since; doing so needs Docker and a `supabase db reset`. The individual pgTAP and integration numbers in this document are carried forward, not re-counted.
5. **No business persistence exists anywhere.** Fourteen capability areas are mock-only and a refresh discards all of them. The domain and UI layers are real and tested; the storage layer beneath them is not.
6. **Documentation drifted within four days of the last commit** — test counts, route counts, lint counts, "client is scaffold only" and "Supabase is local-only" were all wrong. The end-of-task documentation rule in [`claude-context.md`](./claude-context.md) held for every merged work package and was missed on the final three commits, which are the ones still unmerged.

## Recommended next action

**WP5B — Task and recurrence foundation is now in progress.** The ADR-038 merge that blocked it is done.

WP5B is specified in [`PILOT_WEEKLY_CHORES.md`](./PILOT_WEEKLY_CHORES.md) §9 and §12, with approved schedules in ADR-036 and acceptance criteria in [`todo.md`](./todo.md).
