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

## Current status (post-WP2)

The app ships **162 passing unit/integration tests across 19 test files** (Vitest + Testing Library + jsdom), including timezone-determinism regression tests for the rotation engine and public-env validation tests for the Supabase scaffold.

CI ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) runs **two jobs** on every pull request and on pushes to `main`:

- **`verify` — application verification.** `bun install --frozen-lockfile` → `typecheck` → `lint` → `test` → `build` → **generated-route-tree freshness check** (`routes:check`, see [`decisions.md`](./decisions.md) ADR-022).
- **`database` — local Supabase/database validation.** Starts a lean local stack (DB + API only), applies migrations + `seed.sql` via `supabase db reset`, verifies the generated `database.types.ts` matches the resulting schema (`db:types:check`), runs a public-key-only REST smoke test (`db:smoke`), then stops the stack. No secrets, no remote project, no `db push`.

**Migration validation exists** as of WP2: every pull request proves that the migrations apply cleanly from scratch and that the committed generated types are current.

Still **not implemented** (accurate as of WP2):

- **RLS policies and RLS negative tests** — no business schema exists yet, so there is nothing to protect. Scheduled for WP4 (see [`todo.md`](./todo.md)).
- **End-to-end tests** — no Playwright/Cypress suite.
- **Secret scanning** — no scanning gate in CI.
- The **base dataset** and **RLS negative tests** described above remain the target, not the current state; they arrive with the Identity/Household schema (WP3) and RLS (WP4).
