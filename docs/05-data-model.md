# Data Model

Source of truth for the data model. The future source of truth is **PostgreSQL** (via Supabase). No schema exists yet — this document defines the target. Every schema change is a versioned migration (see [`04-development-principles.md`](./04-development-principles.md)).

## Identity & Household

### `households`
`id` · `name` · `timezone` · `locale` · `week_starts_on` · quiet-hours defaults · `created_by` · timestamps.

### `member_profiles`
`id` · `household_id` · `display_name` · `avatar_path` · `color_token` · `date_of_birth` · `is_child` · `is_active` · `pin_auth_enabled` · `pin_hash` · timestamps.

### `household_members`
`id` · `household_id` · `auth_user_id` · `profile_id` · `role` · `status` · `joined_at` · `access_expires_at` · timestamps.

Member statuses: `invited` · `active` · `suspended` · `revoked`.

### `household_invitations`
`id` · `household_id` · `role` · `token_hash` · `invited_email` · `expires_at` · `max_uses` · `used_count` · `revoked_at` · `created_by` · timestamps.

An invitation is accepted in an **atomic** operation that verifies token, expiry, identity, and membership.

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
