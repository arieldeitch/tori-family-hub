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

## Current status (post-WP3)

Two independent suites:

- **Application:** **162 passing unit/integration tests across 19 test files** (Vitest + Testing Library + jsdom), including timezone-determinism regression tests for the rotation engine and public-env validation tests for the Supabase scaffold.
- **Database:** **102 passing pgTAP tests across 7 files** in `supabase/tests/database/`, run with `bun run db:test` (`supabase test db` via the locked CLI — no PostgreSQL JavaScript driver is installed). Every file is wrapped in `begin … rollback`, so the tests are transactional, independent and leave no residue.

The pgTAP suite covers WP3 structure and constraints: enums and lifecycle values, table/column/default/nullability shape, household-consistency composite foreign keys (a membership cannot reference a profile from another household), live-membership uniqueness with `revoked` excluded, invitation counter and token-hash rules, `updated_at` maintenance, `household_id` immutability, cascade behaviour, index presence, and the locked-down RLS/privilege state (RLS enabled, zero policies, no privileges for `PUBLIC`/`anon`/`authenticated`). It also asserts that `seed.sql` stays business-empty and that no PIN credential column exists.

**It does not test RLS household isolation** — there are no policies yet, so there is no isolation behaviour to test. That is WP4's job, together with real Auth users created through the Auth admin API.

CI ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) runs **two jobs** on every pull request and on pushes to `main`:

- **`verify` — application verification.** `bun install --frozen-lockfile` → `typecheck` → `lint` → `test` → `build` → **generated-route-tree freshness check** (`routes:check`, see [`decisions.md`](./decisions.md) ADR-022).
- **`database` — local Supabase/database validation.** Starts a lean local stack (DB + API only), applies migrations + `seed.sql` via `supabase db reset`, verifies the generated `database.types.ts` matches the resulting schema (`db:types:check`), runs a public-key-only REST smoke test (`db:smoke`), runs the **pgTAP schema tests** (`db:test`), then stops the stack. No secrets, no remote project, no `db push`.

**Migration validation exists** as of WP2 and now includes schema tests: every pull request proves that the migrations apply cleanly from scratch, that the committed generated types are current, and that the schema's constraints and locked-down RLS state hold.

Still **not implemented** (accurate as of WP3):

- **RLS policies and RLS negative tests** — WP3 ships tables with RLS enabled and zero policies (ADR-023), so cross-household isolation cannot be tested yet. Scheduled for WP4 (see [`todo.md`](./todo.md)).
- **The base dataset** (Household A/B with owner, adult, two children and a guest) — needs real Auth users, so it arrives with WP4. WP3 uses transactional, test-local fixtures instead and keeps `seed.sql` business-empty (ADR-023 sibling decision D4).
- **End-to-end tests** — no Playwright/Cypress suite.
- **Secret scanning** — no scanning gate in CI.
