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

## Current status (post-WP0)

The prototype ships **158 passing unit/integration tests** across 18 files (Vitest + Testing Library + jsdom), including timezone-determinism regression tests for the rotation engine. No E2E, migration validation, RLS, or secret-scanning gates exist yet — those arrive with the Supabase work (see [`todo.md`](./todo.md)). Current CI runs `install --frozen-lockfile → typecheck → lint → test → build`.
