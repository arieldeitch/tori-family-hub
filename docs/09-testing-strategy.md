# Testing Strategy

Source of truth for testing.

## Unit

- state transitions
- rotation
- recurrence
- notification policies
- validation
- permission predicates
- conflict resolution

## Integration

- repositories
- Supabase RPC
- migrations
- RLS
- transactions
- storage policies
- idempotency
- sync

## Component

- forms
- loading
- empty
- error
- RTL
- accessibility
- permissions
- destructive confirmation

## End-to-end

- onboarding
- household
- adult and child
- one-off task
- template and instance
- rotation
- transport
- follow-up
- shopping
- soft delete
- unauthorized access

## Family Pilot test requirements

The pilot milestone must add, at minimum:

**Rotation and generation** — deterministic child rotation; the same input and `algorithm_version` always produce the same assignment; no duplicate occurrence is ever generated for the same (template, date); adding a chore creates future instances.

**Completion** — completion persists after refresh; a failed write does **not** render as success and rolls back visibly; completion writes an activity-log entry; template edits never rewrite historical instances.

**Accessibility and layout** — completed vs not-completed is distinguishable **without colour** (icon + "בוצע" text + accessible state); the task card works at **360px and 390px**; full RTL; keyboard operable with a visible focus ring.

**Views** — each child sees their own weekly schedule; the family view shows both children; Sunday→Saturday grouping is correct; the rotation explanation is visible.

**Security** — household isolation with positive **and** negative RLS tests on every new task table; no service-role key in the client bundle (`check:client-secrets`); the pilot bootstrap is **idempotent**; the shared `seed.sql` remains **business-empty** after any bootstrap or test run.

## Base dataset

- Household A with owner, adult, two children, and a guest.
- Household B with a different owner.
- Regular, adults-only, overdue, and deleted data.
- A rotation with availability.
- A transport with no owner.
- A follow-up waiting external.
- A shopping list.

## RLS negative tests

For every table:

- SELECT from another household returns zero or fails.
- INSERT with a different household fails.
- UPDATE of `household_id` fails.
- A cross-household relation fails.

## CI gates

- reproducible install
- TypeScript
- lint
- unit/integration tests
- build
- migration validation
- RLS tests
- secret scanning

## Current status (post-WP4)

Three suites, deliberately separated (ADR-032):

- **Application:** **162 passing tests across 19 files** (Vitest + Testing Library + jsdom). Hermetic — no Docker, no database. `bun run test`.
- **Structural database:** **181 passing pgTAP tests across 9 files** in `supabase/tests/database/`. `bun run db:test:structure`. Runs **before any fixture exists**, because it asserts `seed.sql` is business-empty. Covers WP3 structure and constraints plus the WP4 policy catalog, GRANT matrix and helper-function properties.
- **Behavioural RLS + integration:** **117 pgTAP tests across 6 files** in `supabase/tests/rls/` plus **34 publishable-key integration assertions**. `bun run db:test:auth-suite` orchestrates fixture setup → RLS pgTAP → integration → cleanup in a `finally` block.

No PostgreSQL JavaScript driver is installed; pgTAP runs through the locked Supabase CLI. Every pgTAP file is wrapped in `begin … rollback`, so tests are transactional, independent and leave no residue.

### What the RLS tests prove

Cross-household denial in both directions; unauthenticated and `anon` denial; suspended, revoked, expired and deactivated-profile denial; the **exact expiry boundary** (`access_expires_at = now()` is already expired, `now() + 1µs` is not); soft-deleted households invisible even to their own owner; owner-versus-adult update rights; guest and service-provider scoping to their own row; `date_of_birth`, `token_hash` and `auth_user_id` unreadable; membership insert/update/delete and invitation writes all rejected; helpers denying other households and failing closed on a NULL `auth.uid()`; helpers unreachable as Data API RPCs; one Auth identity safely spanning two households; and no policy recursion.

**Critical technique:** pgTAP connects as `postgres`, which has `BYPASSRLS` and owns the tables, so every behavioural test switches with `set local role authenticated` and **asserts `current_user = 'authenticated'`** before evaluating results. Without that assertion the suite would pass no matter what the policies say.

### Fixtures

Auth identities come from the **Auth admin API, never SQL** against `auth.users`; domain rows come from `service_role` through PostgREST. Household A holds an owner, adult, child _without_ an Auth identity, active guest, service provider, suspended adult, revoked member, expired guest and a deactivated profile; Household B holds a separate owner and adult; one identity spans both; one is unrelated; one household is soft-deleted. Addresses use the non-routable `@tori.invalid` domain and passwords are generated per run, never logged, never committed.

CI ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) runs **two jobs** on every pull request and on pushes to `main`:

- **`verify` — application verification.** `bun install --frozen-lockfile` → `typecheck` → `lint` → `test` → `build` → **generated-route-tree freshness check** (`routes:check`, see [`decisions.md`](./decisions.md) ADR-022).
- **`database` — local Supabase/database validation**, in this exact order: `supabase db reset` → `db:types:check` → `db:smoke` → **structural/catalog pgTAP** (while the business tables are empty) → **Auth-backed suite** (fixtures → behavioural RLS pgTAP → publishable-key integration → cleanup) → `check:client-secrets` → **re-run the structural suite** to prove the seed is still business-empty → stop the stack. The service-role key is masked with `::add-mask::` before any command can emit it, is passed only to that step's process, and never reaches `GITHUB_ENV`, a file or a `VITE_*` variable.

**Migration validation and RLS negative tests both exist** as of WP4: every pull request proves the migrations apply cleanly from scratch, the committed generated types are current, the constraint set holds, and a user of one household provably cannot read or write another's.

Still **not implemented**:

- **The full base dataset** below (Household A/B with two children, plus regular/adults-only/overdue/deleted business data) — the identity half exists as WP4 fixtures; the business half needs business-module schema.
- **End-to-end tests** — no Playwright/Cypress suite.
- **Secret scanning** — no general scanning gate. `check:client-secrets` covers service-role material in `src/` and the build output only.
