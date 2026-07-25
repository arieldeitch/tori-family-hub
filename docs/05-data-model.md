# Data Model

Source of truth for the data model. The future source of truth is **PostgreSQL** (via Supabase). Every schema change is a versioned migration (see [`04-development-principles.md`](./04-development-principles.md)).

**Implementation status:** the Identity & Household section below is **implemented** as of WP3 (`supabase/migrations/20260725143927_wp3_identity_household.sql`). Everything from "Tasks" onward is still the target, not built.

## Identity & Household

Built in WP3; RLS policies and the minimum grants added in WP4. Access is column-level only — see [`06-security-and-permissions.md`](./06-security-and-permissions.md) for the policy matrix and [`decisions.md`](./decisions.md) ADR-027…ADR-032.

**Client-inaccessible columns** (never granted to `anon` or `authenticated`): `member_profiles.date_of_birth`, `household_invitations.token_hash` and `created_by`, `household_members.auth_user_id`, and the `created_by` / `deleted_at` / `deleted_by` audit columns.

### `households`
`id` · `name` · `timezone` · `locale` · `week_starts_on` · quiet-hours defaults · `created_by` · timestamps · soft-delete fields.

Hebrew-first defaults: `Asia/Jerusalem`, `he-IL`, `week_starts_on = 0`.

### `member_profiles`
`id` · `household_id` · `display_name` · `avatar_path` · `color_token` · `date_of_birth` · `is_child` · `is_active` · `pin_auth_enabled` · timestamps · soft-delete fields.

> **No `pin_hash`.** An earlier version of this document placed `pin_hash` on this row; that design was **deliberately dropped** in WP3 — see [`decisions.md`](./decisions.md) **ADR-025**. Household members can read profile rows, so no credential material may live here. `pin_auth_enabled` is non-sensitive configuration metadata only (default `false`), readable but **not writable** by clients, and authenticates nothing. Future PIN credentials live in an unexposed `private.member_pin_credentials` with no client grants, reachable only through a secured server/RPC boundary, and enabling PIN must be atomic with creating a valid credential.

> **`date_of_birth` is not client-accessible.** WP4 grants neither SELECT nor UPDATE on it, and deliberately created **no** accessor function and **no** view (ADR-029). Read and write behaviour is deferred to a future sensitive-profile RPC or permission model; do not assume every adult is authorized to see it. Tracked in [`todo.md`](./todo.md).

A profile is a **person, independent of any login**: children have profiles but no account (ADR-013). Auth linkage lives on `household_members`, never here.

### `household_members`
`id` · `household_id` · `auth_user_id` · `profile_id` · `role` · `status` · `joined_at` · `access_expires_at` · timestamps.

Member statuses: `invited` · `active` · `suspended` · `revoked`. Lifecycle: `invited → active`; `active ↔ suspended`; any state `→ revoked` (**terminal**). Transition legality is enforced by RPCs, not declaratively.

This is the **dedicated membership/authorization table** — the role lives here and there is no `user_roles` table (ADR-024). A household may have **multiple active owners** (ADR-026).

`auth_user_id` is **nullable** (child and other non-login profiles) and references `auth.users(id)` only. The same account may belong to many households, but not twice to the same household: uniqueness is scoped per household and excludes `revoked` rows, so a revoked member can be re-added while the revoked row survives for audit.

Household consistency is enforced **structurally**: a composite foreign key `(profile_id, household_id) → member_profiles (id, household_id)` makes it impossible to attach a profile to an unrelated household. `household_id` is immutable on every household-owned row.

### `household_invitations`
`id` · `household_id` · `role` · `token_hash` · `invited_email` · `expires_at` · `max_uses` · `used_count` · `revoked_at` · `created_by` · timestamps.

**Only a hash of the token is stored** — the raw token is returned once by the creating RPC and never persisted. `token_hash` is unique. An invitation can never carry the `owner` role; ownership is granted only by an explicit owner-transfer RPC. `max_uses > 0` and `0 ≤ used_count ≤ max_uses` are database constraints.

An invitation is accepted in an **atomic** operation that verifies token, expiry, identity, and membership, consuming `used_count` with a conditional update so concurrent redemptions cannot over-consume.

## Tasks

Entities: `task_templates` · `task_instances` · `task_assignments` · `task_comments` · `task_activity_log`.

**Clarifications for the Family Pilot** (no schema exists yet — these constrain the WP5B design):

- A generated occurrence needs an **occurrence key** or equivalent unique constraint so re-running generation is idempotent and can never create a duplicate for the same (template, date) — see the recurring-instance rule below.
- An instance created from a template carries **snapshots** (`title_snapshot`, `description_snapshot`), so editing a template never rewrites historical instances.
- When an assignment is computed by the rotation engine, the instance or assignment persists the **`algorithm_version`** and **`reason_code`** that produced it, so the choice stays explainable after the engine changes (ADR-006, [`08-rotation-engine.md`](./08-rotation-engine.md)).
- Completion records **`completed_at`** and **`completed_by`**, and writes a **`task_activity_log`** entry. Undo, if approved, is a further logged transition — never a silent deletion.
- Every one of these tables carries `household_id` and ships `ENABLE ROW LEVEL SECURITY` in the same migration, with the membership predicate from [`06-security-and-permissions.md`](./06-security-and-permissions.md).
- **Age is not stored.** The pilot treats children's ages as product context only; `date_of_birth` stays client-inaccessible (ADR-029) and no age column is added.

`task_instances` includes at least:
`id` · `household_id` · `template_id` · `title_snapshot` · `description_snapshot` · `scheduled_for` · `due_at` · `status` · `priority` · `source` · `completed_at` · `completed_by` · `manual_override` · timestamps · soft-delete fields.

A recurring instance requires an occurrence key or an appropriate unique constraint.

## Calendar & events

Possible entities: `calendars` · `events` · `event_participants` · `event_requirements`.

An event includes: household · calendar · title · start/end · all-day · location · related child · visibility · participants · requirements · recurrence metadata · source · timestamps · soft delete.

## Transport (pickups & drop-offs)

Independent module. Statuses: `unassigned` · `pending_acceptance` · `accepted` · `en_route` · `completed` · `transferred` · `cancelled`.

Fields: child · pickup or dropoff · time · origin · destination · recommended departure · primary assignee · backup assignee · acceptance deadline · equipment · notes · timestamps · soft delete.

## Follow-up

Entities: `follow_up_cases` · `follow_up_actions`. Statuses and the `waiting_external` invariant are defined in [`01-product-requirements.md §10`](./01-product-requirements.md#10-follow-up). Sensitivity: `household` · `adults_only` · `restricted`.

## Shopping

Entities: `shopping_lists` · `shopping_items`. Statuses: `needed` · `claimed` · `purchased` · `unavailable` · `removed`. An item has requested-by and an optional assigned buyer.

## Errands

Task subtype/extension: `location` · `area label` · `assignee` · `due date` · `status` · `can_do_when_nearby` · linked task instance.

## Cross-cutting

- Every family table carries `household_id` and is protected by RLS ([`06-security-and-permissions.md`](./06-security-and-permissions.md)).
- Soft delete uses dedicated fields with a restore window (see [`decisions.md` ADR-007](./decisions.md)).
- `localStorage` is never a source of truth.
