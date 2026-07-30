# GPT Handover

Continuity for GPT conversations about Tori. Read alongside [`claude-context.md`](./claude-context.md) and [`project-status.md`](./project-status.md).

## State as of 2026-07-30 (repository audit)

Verified against the repository, not against chat history.

- **Audited:** commit `17f1ebd` on branch `wp5a-lovable-published-env`, in sync with its remote, working tree clean.
- **Nothing has changed since 2026-07-26.** No commits in the last four days; the last work was the ADR-038 tracked-`.env` change.
- **What changed since 24 July** — the date of the previously assumed state: the project went from "documentation library only" to a working hosted pilot. WP3 (identity schema), WP4 (RLS, grants, negative tests), WP5A (pilot access and bootstrap), the hosted conversion (ADR-037) and the published-build environment fix (ADR-038) all landed between 25 and 26 July. Anyone still working from a 24 July picture is a full milestone behind.
- **One thing needs the product owner and cannot be done in code:** signup is still enabled on the hosted Supabase pilot project, and the repository is public. RLS gives such an account no data and the pilot ships no signup flow, so it is an unnecessary surface rather than a leak — but it is a dashboard toggle only the owner can flip.
- **One merge is outstanding:** `wp5a-lovable-published-env` → `main`. Until it merges, a published Lovable build from `main` has no Supabase configuration and shows an error screen instead of the pilot.
- **Recommended next task:** merge that branch, disable hosted signup, then start WP5B — task and recurrence foundation.
- **Corrected counts:** 210 app tests across 24 files (documentation said 162 across 19); 44 route modules (said 41); lint 0 errors / 7 warnings (said 6). The database suites were **not** re-run — Docker was down and re-running them requires a `db reset`, which the audit did not permit.

## Current continuity state

- **Lovable is complete** — the prototype was built there.
- **GitHub is connected.**
- **Claude Code is active.**
- The **Repository Acceptance Audit is complete.**
- **WP0 (Foundation Fixes) and WP1 (Knowledge Pack) are complete and merged to `main`.**
- **WP2 (Supabase Local Workflow) is complete and merged to `main`** via PR #3 (merge commit `9e691c9`), with both checks (`verify`, `database`) green.
- A **post-WP2 consistency pass** followed (PR #4): the committed generated route tree was brought in sync with the generator, CI now verifies its freshness (`routes:check`, ADR-022), and stale documentation counts were corrected.
- **WP3 (Identity & Household Schema) is complete and merged to `main`**: enums `household_role` + `household_membership_status` and tables `households`, `member_profiles`, `household_members`, `household_invitations`, with household consistency enforced by composite foreign keys and `household_id` immutability. **102 pgTAP tests** (`bun run db:test`) run in the CI `database` job.
- **The WP3 tables are deliberately locked down (ADR-023):** RLS enabled, **zero policies**, all privileges revoked from `PUBLIC`/`anon`/`authenticated`. No Auth, no RPC, no PIN credentials (ADR-025), and no module reads or writes them.
- **Supabase toolchain (WP2, as delivered):** locked CLI dev dependency (`2.109.1`) + `@supabase/supabase-js` (`2.110.8`), `supabase/` (config + migrations + business-empty seed), a typed infrastructure client, `db:*` scripts, and a CI `database` job. Local `project_id = tori-family-hub`, app URL `http://localhost:8080`, ports remapped to `553xx`. **At the time of WP2** there was no remote project, no business schema, no Auth and no RLS — all four statements have since been overtaken by WP3, WP4, WP5A and ADR-037, and only "no business schema" is still true. **210/210 app tests pass across 24 files**; app gates green.
- **WP4 (RLS, grants and negative tests) is complete and merged to `main`**: three `private` authorization helpers, minimum column-level grants, six policies, 181 structural + 117 behavioural pgTAP tests, 34 Auth-backed integration assertions. No RPC, no Auth UI, no app wiring.
- **WP5A (pilot access and local bootstrap) is complete and merged.** Environment-guarded idempotent bootstrap, one authenticated adult identity, four profiles, local sign-in and profile selector — no migration and no RLS change (ADR-035). Approved chore schedules and staggered rotation are recorded in ADR-036.
- **The pilot is hosted** (ADR-037): Lovable hosts the frontend only; the dedicated non-production Supabase project is the exclusive backend; no Lovable Cloud database; Docker is not required for family use.
- **Published Lovable builds read a tracked root `.env`** holding only the two browser-public Supabase values (ADR-038), because published builds do not receive ignored files. The allowlist is enforced by `check:client-secrets` and by test.
- **The next action is to merge `wp5a-lovable-published-env` into `main`, then WP5B — Task and recurrence foundation.**
- **WP4.5** (Identity RPCs) and **WP4.6** (Auth account deletion) remain required, just not next. ⚠️ WP4.6 still **blocks production onboarding and any account-deletion capability** — `auth_user_id` is still `ON DELETE CASCADE` (ADR-031). It does not block the non-production pilot.
- **Pilot household data is local and uncommitted** (ADR-034): real names and ages live only in a git-ignored `pilot-household.local.json`.

## Resume checklist

1. `git checkout main && git pull --ff-only`.
2. To run Supabase locally: start Docker, `bun run supabase:start`, then copy the URL + publishable key from `bun run supabase:status` into `.env.local` (git-ignored).
3. Sanity gates: `bun install --frozen-lockfile` → `typecheck` → `lint` → `test` (**210 across 24 files**) → `build` → `routes:check` → `check:client-secrets` → `check:pilot-privacy` → `pilot:test:hosted-guard`; database side: `bun run db:verify` (reset → type freshness → smoke → 181 structural pgTAP → Auth fixtures → 117 behavioural pgTAP → 34 integration assertions → cleanup).
4. Then begin the **Family Pilot** per [`PILOT_WEEKLY_CHORES.md`](./PILOT_WEEKLY_CHORES.md), once its Architecture Approval Brief is approved.

## Ground rules for any GPT-authored task

- The PRD ([`01-product-requirements.md`](./01-product-requirements.md)) is the single business source of truth.
- Do not start a business module before Identity, Household, and RLS are stable.
- Every schema change requires a migration; every RLS change requires positive and negative tests.
- Never hand-edit a generated file (`src/routeTree.gen.ts`, `src/infrastructure/supabase/database.types.ts`) — regenerate it (ADR-022).
- Never write to `auth.users` with SQL. Test users are created through the Auth admin API.
- Never grant a client write on `household_members` or `household_invitations` — those mutations are RPC-only (ADR-028).
- Never add an authorization helper to `public`, and never give one a user-id parameter (ADR-027).
- No PIN credential material on `member_profiles` (ADR-025); the role lives on `household_members` and there is no `user_roles` table (ADR-024).
- No service role in the browser; `localStorage` is not a source of truth.
- Update the state docs at the end of every task.

See [`todo.md`](./todo.md) for the WP2 → WP5 order.
