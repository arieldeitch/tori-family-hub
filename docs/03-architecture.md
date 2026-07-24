# Architecture

Source of truth for architecture. Describes the target layering the codebase must converge on. For the **as-built** state of the prototype see [`LOVABLE_ARCHITECTURE.md`](./LOVABLE_ARCHITECTURE.md) and [`project-status.md`](./project-status.md).

## Layers

### Presentation
Routes, components, forms, view models. **No raw Supabase queries and no complex business logic here.**

### Application
Use cases, e.g. `createTask`, `completeTaskInstance`, `assignTransport`, `acceptTransportResponsibility`, `moveFollowUpToWaiting`, `addShoppingItem`, `restoreDeletedItem`.

### Domain
Entities, value objects, state machines, rotation policies, pure validation. No dependency on React or Supabase where possible.

### Data
Repositories, reads/writes, subscriptions, mapping.

### Infrastructure
Auth, Supabase, Storage, Notifications, PWA, Telemetry, Jobs, Integrations.

## Rules

- No `.from(...)` scattered across UI components.
- Multiple critical operations run inside a transaction or an RPC.
- Realtime is not a substitute for initial load or reconciliation.
- Every DB change is a versioned migration.
- No manual production change as a substitute for a migration.
- Local, staging, and production are separated.
- No production data in development without anonymization.

## Offline & PWA

- PostgreSQL is the source of truth.
- Future core offline actions: complete a task, create a basic task, add a shopping item.
- Each local operation carries: `client_operation_id`, operation type, payload, household, actor, local timestamp, base version, status.
- Local operation statuses: `pending` · `syncing` · `failed` · `synced`.
- The server handles idempotency.
- A non-mergeable conflict is shown to the user — no silent overwrite.
- The initial PWA is app-shell-only. No deliberate caching of tokens or sensitive family data. See [`PWA.md`](./PWA.md).

## Server boundary

Sensitive actions must go through an RPC or a server endpoint — see [`06-security-and-permissions.md`](./06-security-and-permissions.md#sensitive-actions).
