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

## Acting on behalf of another profile (Family Pilot)

The Family Pilot runs with **one authenticated adult identity** and a **profile selector** in the UI (ADR-035, [`PILOT_WEEKLY_CHORES.md`](./PILOT_WEEKLY_CHORES.md)). That selector is a **display and attribution** mechanism, never an authorization mechanism.

- Authority always derives from the **authenticated adult's membership**, exactly as WP4 enforces it. A client-supplied `profile_id` is never trusted.
- A write made on behalf of a child goes through a **server-side use case or RPC**, which verifies that the authenticated caller belongs to the same household and may act for that profile before writing.
- The **acting profile is recorded in the activity log** alongside the authenticated actor, so history shows both who was represented and who actually performed the action.
- The pilot adds **no anonymous write path**, no service-role key in the browser, and no RLS bypass. `localStorage` may cache, never own.
- The whole pilot mode sits behind an **explicit non-production environment guard**.

## Server boundary

Sensitive actions must go through an RPC or a server endpoint — see [`06-security-and-permissions.md`](./06-security-and-permissions.md#sensitive-actions).
