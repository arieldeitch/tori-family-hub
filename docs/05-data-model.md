# Data Model

Source of truth for the data model. The future source of truth is **PostgreSQL** (via Supabase). Every schema change is a versioned migration (see [`04-development-principles.md`](./04-development-principles.md)).

**Implementation status:** the Identity & Household section below is **implemented** as of WP3 (`supabase/migrations/20260725143927_wp3_identity_household.sql`). Everything from "Tasks" onward is still the target, not built.

## Identity & Household

Built in WP3 with RLS enabled, zero policies and no client privileges — see [`decisions.md`](./decisions.md) ADR-023.

### `households`
`id` · `name` · `timezone` · `locale` · `week_starts_on` · quiet-hours defaults · `created_by` · timestamps · soft-delete fields.

Hebrew-first defaults: `Asia/Jerusalem`, `he-IL`, `week_starts_on = 0`.

### `member_profiles`
`id` · `household_id` · `display_name` · `avatar_path` · `color_token` · `date_of_birth` · `is_child` · `is_active` · `pin_auth_enabled` · timestamps · soft-delete fields.

> **No `pin_hash`.** An earlier version of this document placed `pin_hash` on this row; that design was **deliberately dropped** in WP3 — see [`decisions.md`](./decisions.md) **ADR-025**. Household members will eventually be able to read profile rows, so no credential material may live here. `pin_auth_enabled` is non-sensitive configuration metadata only (default `false`) and authenticates nothing. Future PIN credentials live in an unexposed `private.member_pin_credentials` with no client grants, reachable only through a secured server/RPC boundary, and enabling PIN must be atomic with creating a valid credential.

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
