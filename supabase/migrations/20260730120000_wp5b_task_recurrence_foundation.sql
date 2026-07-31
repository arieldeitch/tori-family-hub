-- WP5B — Task and recurrence foundation.
--
-- The first BUSINESS-domain tables in Tori. Everything before this migration was
-- identity: households, profiles, membership, invitations. This adds the four
-- tables a chore needs in order to survive a page refresh:
--
--   task_templates     the recurring definition of a chore
--   task_instances     one concrete dated occurrence of it
--   task_assignments   who is responsible for that occurrence
--   task_activity_log  append-only history of every state transition
--
-- Structure, GRANTs and the complete RLS policy set ship together in this one
-- migration (ADR-023) — never split across two, because a table that exists
-- without its policies is a table that is briefly unprotected.
--
-- NOT in this migration:
--   * rotation_rules / rotation_members / rotation_assignment_log  (WP5C)
--   * any UI, any app wiring, any change to a mock repository       (WP5D/WP5E)
--   * the three approved pilot chore templates as data              (ADR-034:
--     pilot data is loaded by the guarded bootstrap, never by a migration and
--     never by the shared seed)
--   * RPCs. Everything here is reachable by ordinary, policy-checked DML. The
--     multi-write operations that need atomicity (rotation assignment, undo
--     with audit) arrive with WP5C/WP5D.
--
-- auth.users is REFERENCED ONLY. This migration never writes to it.
--
-- Design notes that are easy to lose:
--
--   * `occurrence_key` is what makes generation idempotent. It is a generated
--     column, not an application-supplied string, so two clients generating the
--     same (template, date) cannot disagree about the key and cannot produce a
--     duplicate. See the column comment.
--   * Instances carry SNAPSHOTS of the template's title and description. Editing
--     a template must never rewrite history (docs/05-data-model.md), so the
--     snapshot is taken at creation and a trigger makes it immutable afterwards.
--   * Clients never DELETE. Every table either soft-deletes or is append-only,
--     so a family can always answer "what happened to that chore?".

-- ---------------------------------------------------------------------------
-- Enums
--
-- Value domains only. Transition legality lives in the application and in the
-- WP5C/WP5D use cases, exactly as membership status does (WP3).
-- ---------------------------------------------------------------------------

-- Lifecycle of one occurrence.
--   pending -> done | skipped | blocked ; done -> pending (a logged reopen).
-- `skipped` and `blocked` both require a reason (constraint below), because
-- 08-rotation-engine.md's no-punishment rule needs to know WHY a turn was
-- missed before it can decline to punish it.
create type public.task_status as enum (
  'pending',
  'done',
  'skipped',
  'blocked'
);

create type public.task_priority as enum (
  'low',
  'normal',
  'high'
);

-- How the instance came to exist. `generated` rows are reproducible from the
-- template; `manual` and `quick_add` rows are not, and must never be silently
-- regenerated or reconciled away.
create type public.task_source as enum (
  'generated',
  'manual',
  'quick_add'
);

-- How the assignee was chosen. `rotation` is the WP5C engine; `manual` is an
-- adult overriding it; `volunteer` is someone claiming an unassigned chore.
create type public.task_assignment_type as enum (
  'rotation',
  'manual',
  'volunteer'
);

create type public.task_assignment_status as enum (
  'proposed',
  'accepted',
  'declined',
  'reassigned'
);

-- What a chore does when nobody does it. Recorded per template so the family
-- can choose, rather than the system deciding silently
-- (PILOT_WEEKLY_CHORES.md §7 leaves this to an explicit policy).
create type public.task_missed_policy as enum (
  'remain_overdue',
  'auto_skip',
  'reschedule_next'
);

create type public.task_effort_level as enum (
  'light',
  'medium',
  'heavy'
);

-- Vocabulary of the append-only log. Deliberately small: every entry is one of
-- these, so the log can be read without parsing free text.
create type public.task_activity_action as enum (
  'created',
  'assigned',
  'unassigned',
  'status_changed',
  'reopened',
  'edited',
  'soft_deleted',
  'restored'
);

-- ---------------------------------------------------------------------------
-- Trigger functions
--
-- SECURITY INVOKER with a fixed empty search_path, matching WP3's
-- set_updated_at() and prevent_household_id_change(), both of which are reused
-- here rather than duplicated.
-- ---------------------------------------------------------------------------

-- The snapshot columns exist so that editing a template cannot rewrite history
-- (docs/05-data-model.md). A column that must never change after INSERT needs a
-- trigger: there is no DDL for "immutable after write".
create or replace function public.prevent_task_snapshot_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.title_snapshot is distinct from old.title_snapshot
     or new.description_snapshot is distinct from old.description_snapshot
     or new.template_id is distinct from old.template_id
     or new.occurrence_date is distinct from old.occurrence_date then
    raise exception
      'task_instances snapshot fields are immutable: template_id, occurrence_date, title_snapshot and description_snapshot cannot change after creation'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

comment on function public.prevent_task_snapshot_change() is
  'Keeps a historical occurrence historical. Editing a template changes future occurrences only — never the recorded title, description, template link or date of one already created.';

-- The activity log is the audit trail. Making it append-only for EVERY role
-- (not just clients, which already lack the grant) means a future RPC bug
-- cannot quietly rewrite history either.
create or replace function public.prevent_task_activity_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'task_activity_log is append-only: % is not permitted', tg_op
    using errcode = '23514';
end;
$$;

comment on function public.prevent_task_activity_mutation() is
  'Blocks UPDATE and DELETE on task_activity_log for every role including service_role. History is written once. Correcting a mistake means appending a new entry, not editing the old one.';

-- ---------------------------------------------------------------------------
-- Task authorization helpers  (private schema, ADR-027)
--
-- Created AFTER the tables they read, at the bottom of this file. They are
-- declared here in comment form only so the reading order stays: functions,
-- tables, indexes, triggers, RLS, grants, policies.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- task_templates
--
-- The definition of a recurring chore. `recurrence_rule` is jsonb rather than a
-- set of columns because the pilot needs only weekday lists (ADR-036) while the
-- PRD anticipates richer schedules; jsonb lets WP5C/WP5D grow the vocabulary
-- without a migration per shape. The *interpretation* of the rule lives in
-- src/domain/recurrence.ts, which is already tested.
-- ---------------------------------------------------------------------------

create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,

  title text not null
    constraint task_templates_title_length check (length(btrim(title)) between 1 and 120),
  description text
    constraint task_templates_description_length
      check (description is null or length(description) <= 2000),
  category text
    constraint task_templates_category_length
      check (category is null or length(btrim(category)) between 1 and 40),
  area_or_room text
    constraint task_templates_area_length
      check (area_or_room is null or length(btrim(area_or_room)) between 1 and 60),

  -- Shape is validated by the application; the database guarantees only that it
  -- is a JSON object, so a malformed scalar can never be stored.
  recurrence_rule jsonb not null default '{}'::jsonb
    constraint task_templates_recurrence_rule_is_object
      check (jsonb_typeof(recurrence_rule) = 'object'),

  -- "No fixed time" is the pilot default (ADR-036), so both bounds are nullable.
  -- A window is either fully specified or absent — a half-open window is a bug,
  -- not a feature.
  time_window_start time,
  time_window_end time,
  constraint task_templates_time_window_complete
    check (num_nulls(time_window_start, time_window_end) <> 1),
  constraint task_templates_time_window_ordered
    check (time_window_start is null or time_window_start <= time_window_end),

  estimated_minutes integer
    constraint task_templates_estimated_minutes_range
      check (estimated_minutes is null or estimated_minutes between 1 and 1440),
  effort_level public.task_effort_level,

  adult_only boolean not null default false,
  approval_required boolean not null default false,
  missed_policy public.task_missed_policy not null default 'remain_overdue',
  default_priority public.task_priority not null default 'normal',

  starts_on date not null default current_date,
  ends_on date,
  constraint task_templates_date_range_ordered
    check (ends_on is null or ends_on >= starts_on),

  is_active boolean not null default true,

  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id) on delete set null,

  -- Composite-FK target, exactly as member_profiles does for household_members:
  -- lets task_instances prove structurally that its template belongs to the
  -- same household.
  constraint task_templates_id_household_key unique (id, household_id)
);

comment on table public.task_templates is
  'The recurring definition of a chore. Editing one affects FUTURE occurrences only; existing task_instances keep their snapshots.';
comment on column public.task_templates.recurrence_rule is
  'JSON object interpreted by src/domain/recurrence.ts. jsonb rather than columns so the vocabulary can grow (weekday lists today, richer schedules later) without a migration per shape.';
comment on column public.task_templates.missed_policy is
  'What happens to an occurrence nobody completed. Explicit per template, because PILOT_WEEKLY_CHORES.md §7 forbids a chore silently disappearing at the end of the day. The no-punishment rule of 08-rotation-engine.md holds whichever value is chosen.';
comment on column public.task_templates.adult_only is
  'Hides the chore, its occurrences, its assignments and its history from CHILDREN — RLS does consult this column (ADR-040), implementing "a child does not see adults_only data" from 06-security-and-permissions.md. It is not a general authority mechanism: authority still comes from household_members, and this flag grants nobody anything. Safe as a boundary because only an owner or adult can write task_templates, so a child cannot clear it.';

-- ---------------------------------------------------------------------------
-- task_instances
--
-- One dated occurrence. This is the row a child taps "done" on.
-- ---------------------------------------------------------------------------

create table public.task_instances (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,

  -- Nullable: a one-off task has no template. ON DELETE SET NULL rather than
  -- CASCADE — hard-deleting a template must never erase the history of chores
  -- that were actually done.
  template_id uuid,

  -- The date the occurrence belongs to, in the household's own calendar. Kept
  -- as a plain date, never a timestamp, so a chore "on Tuesday" does not drift
  -- across a timezone boundary — the same bug WP0 fixed in the rotation engine.
  occurrence_date date not null,

  -- Deterministic idempotency key. GENERATED, not client-supplied: two clients
  -- generating the same (template, date) cannot disagree about it, and the
  -- unique index below turns a concurrent double-generation into a constraint
  -- violation the caller can treat as a no-op instead of a duplicate row.
  --
  -- A one-off task (template_id IS NULL) is excluded from the uniqueness rule
  -- via the partial index, because two distinct one-off chores on the same day
  -- are perfectly legitimate.
  --
  -- The date is formatted from extracted parts rather than with the obvious
  -- `occurrence_date::text`. A generated column must be IMMUTABLE, and
  -- date-to-text is only STABLE: it reads the DateStyle GUC, so the same day
  -- would render '2026-08-03' for one session and '03/08/2026' for another —
  -- two different keys for one occurrence, which is precisely the disagreement
  -- this column exists to prevent. extract() and lpad() are immutable, so this
  -- form is ISO-8601 for every session regardless of DateStyle.
  occurrence_key text generated always as (
    case
      when template_id is null then null
      else template_id::text || ':'
        || lpad(extract(year  from occurrence_date)::int::text, 4, '0') || '-'
        || lpad(extract(month from occurrence_date)::int::text, 2, '0') || '-'
        || lpad(extract(day   from occurrence_date)::int::text, 2, '0')
    end
  ) stored,

  -- Snapshots, immutable after insert (see prevent_task_snapshot_change).
  title_snapshot text not null
    constraint task_instances_title_length check (length(btrim(title_snapshot)) between 1 and 120),
  description_snapshot text
    constraint task_instances_description_length
      check (description_snapshot is null or length(description_snapshot) <= 2000),

  scheduled_for timestamptz,
  due_at timestamptz,
  constraint task_instances_schedule_ordered
    check (scheduled_for is null or due_at is null or scheduled_for <= due_at),

  status public.task_status not null default 'pending',
  priority public.task_priority not null default 'normal',
  source public.task_source not null default 'generated',

  completed_at timestamptz,
  completed_by uuid,
  -- Completion is all-or-nothing: a row claiming to be done must say when and by
  -- whom, and a row that is not done must claim neither. This is what stops a
  -- failed write from rendering as a success (PILOT_WEEKLY_CHORES.md §7).
  constraint task_instances_completion_consistent
    check (
      (status = 'done' and completed_at is not null and completed_by is not null)
      or (status <> 'done' and completed_at is null and completed_by is null)
    ),

  skipped_reason text
    constraint task_instances_skipped_reason_length
      check (skipped_reason is null or length(btrim(skipped_reason)) between 1 and 500),
  blocked_reason text
    constraint task_instances_blocked_reason_length
      check (blocked_reason is null or length(btrim(blocked_reason)) between 1 and 500),
  -- A skipped or blocked chore must say why, so the rotation engine can decline
  -- to punish an absence it can actually explain.
  constraint task_instances_skipped_requires_reason
    check (status <> 'skipped' or skipped_reason is not null),
  constraint task_instances_blocked_requires_reason
    check (status <> 'blocked' or blocked_reason is not null),

  manual_override boolean not null default false,

  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id) on delete set null,

  constraint task_instances_id_household_key unique (id, household_id),

  -- Household consistency, structural rather than policy-dependent: the
  -- template must belong to the same household as the instance.
  constraint task_instances_template_same_household_fkey
    foreign key (template_id, household_id)
    references public.task_templates (id, household_id)
    on delete set null,

  -- The completing profile must belong to the same household too.
  constraint task_instances_completed_by_same_household_fkey
    foreign key (completed_by, household_id)
    references public.member_profiles (id, household_id)
    on delete set null
);

comment on table public.task_instances is
  'One dated occurrence of a chore — the row a family member marks done. Carries snapshots so editing the template never rewrites history.';
comment on column public.task_instances.occurrence_key is
  'Generated idempotency key, template_id:YYYY-MM-DD. NULL for one-off tasks. Never client-supplied: generation is idempotent because the database computes the key, and the partial unique index makes a concurrent duplicate a constraint violation rather than a second row. The date is built from extract()/lpad() rather than a ::text cast, which is only STABLE and would vary the key with the session DateStyle.';
comment on column public.task_instances.occurrence_date is
  'The household-calendar date this occurrence belongs to. A date, never a timestamp, so a chore does not drift across a timezone boundary.';
comment on column public.task_instances.completed_by is
  'member_profiles.id of the person who completed it — the acting profile, not the authenticated account (ADR-035). The authenticated actor is recorded in task_activity_log.';
comment on column public.task_instances.manual_override is
  'True when an adult overrode a computed value. Set by WP5C/WP5D use cases; the override itself is recorded in task_activity_log.';
comment on constraint task_instances_completion_consistent on public.task_instances is
  'A done row must carry completed_at and completed_by; a not-done row must carry neither. Prevents a half-written completion from reading as success.';

-- The idempotency guarantee. Partial: one-off tasks (NULL occurrence_key) are
-- exempt, and a soft-deleted occurrence does not block regenerating that day.
create unique index task_instances_occurrence_key_unique
  on public.task_instances (household_id, occurrence_key)
  where occurrence_key is not null and deleted_at is null;

comment on index public.task_instances_occurrence_key_unique is
  'Makes recurrence generation idempotent under concurrency: the second transaction to insert the same (household, template, date) fails on this index instead of creating a duplicate. Excludes one-off tasks and soft-deleted rows.';

-- ---------------------------------------------------------------------------
-- task_assignments
--
-- Who is responsible for one occurrence. A separate table rather than a column
-- on task_instances because an occurrence can be reassigned, and the previous
-- assignment must remain visible (08-rotation-engine.md: historical assignments
-- are never rewritten).
--
-- assigned_by_rule_id is deliberately a bare uuid with NO foreign key: the
-- rotation_rules table arrives in WP5C. Adding the reference then is a small,
-- honest migration; inventing the table now would be WP5C leaking into WP5B.
-- ---------------------------------------------------------------------------

create table public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,

  task_instance_id uuid not null,

  -- Nullable: an unassigned chore is a real, displayable state.
  assignee_profile_id uuid,

  assignment_type public.task_assignment_type not null default 'manual',
  status public.task_assignment_status not null default 'proposed',

  -- No FK until WP5C creates rotation_rules.
  assigned_by_rule_id uuid,

  -- The explanation the rotation engine owes the family (ADR-006). Stored with
  -- the version that produced it, so the choice stays explainable after the
  -- engine changes.
  assignment_reason text
    constraint task_assignments_reason_length
      check (assignment_reason is null or length(btrim(assignment_reason)) between 1 and 500),
  reason_code text
    constraint task_assignments_reason_code_length
      check (reason_code is null or length(btrim(reason_code)) between 1 and 60),
  algorithm_version text
    constraint task_assignments_algorithm_version_length
      check (algorithm_version is null or length(btrim(algorithm_version)) between 1 and 40),

  accepted_at timestamptz,
  constraint task_assignments_accepted_consistent
    check ((status = 'accepted') = (accepted_at is not null)),

  -- A rotation-produced assignment must be explainable. This is the constraint
  -- that keeps "no hidden AI decision" (PILOT_WEEKLY_CHORES.md §3) true in the
  -- database rather than only in the UI.
  constraint task_assignments_rotation_is_explainable
    check (
      assignment_type <> 'rotation'
      or (reason_code is not null and algorithm_version is not null)
    ),

  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint task_assignments_instance_same_household_fkey
    foreign key (task_instance_id, household_id)
    references public.task_instances (id, household_id)
    on delete cascade,

  constraint task_assignments_assignee_same_household_fkey
    foreign key (assignee_profile_id, household_id)
    references public.member_profiles (id, household_id)
    on delete set null
);

comment on table public.task_assignments is
  'Who is responsible for one occurrence. A row per assignment rather than a column on the instance, so reassignment preserves the previous decision.';
comment on column public.task_assignments.assigned_by_rule_id is
  'The rotation rule that produced this assignment. Intentionally has NO foreign key yet — rotation_rules arrives in WP5C, which will add the reference.';
comment on column public.task_assignments.algorithm_version is
  'e.g. shifts.v1. Persisted with reason_code so a past assignment stays explainable after the engine changes (ADR-006).';
comment on constraint task_assignments_rotation_is_explainable on public.task_assignments is
  'A rotation-produced assignment must carry both a reason_code and an algorithm_version. Enforces "deterministic and explained, no hidden decision" in the database, not only in the UI.';

-- One live assignment per occurrence. `reassigned` and `declined` rows are
-- excluded so history survives while only one assignment is current.
create unique index task_assignments_one_live_per_instance
  on public.task_assignments (task_instance_id)
  where status in ('proposed', 'accepted');

comment on index public.task_assignments_one_live_per_instance is
  'At most one current assignment per occurrence. Declined and reassigned rows stay for history, exactly as revoked memberships do in WP3.';

-- ---------------------------------------------------------------------------
-- task_activity_log
--
-- Append-only history. Records BOTH the authenticated actor and the acting
-- profile, because conflating them is the mistake ADR-035 exists to prevent:
-- an adult completing a chore on behalf of a child is one account and a
-- different profile, and the log has to be able to say so.
-- ---------------------------------------------------------------------------

create table public.task_activity_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,

  task_instance_id uuid not null,

  -- The authenticated account that performed the action. ON DELETE SET NULL:
  -- deleting an account must never erase what happened.
  actor_auth_user_id uuid references auth.users (id) on delete set null,
  -- The profile the action was performed AS. Never conflate the two (ADR-035).
  acting_profile_id uuid,

  action_type public.task_activity_action not null,
  from_state public.task_status,
  to_state public.task_status,
  detail jsonb
    constraint task_activity_log_detail_is_object
      check (detail is null or jsonb_typeof(detail) = 'object'),

  -- Idempotency token for a future offline queue (ADR-017, post-MVP). Nullable
  -- and unused today; present now so the log does not need a migration to
  -- become replay-safe later.
  client_operation_id uuid,

  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint task_activity_log_status_change_has_states
    check (action_type <> 'status_changed' or to_state is not null),

  constraint task_activity_log_instance_same_household_fkey
    foreign key (task_instance_id, household_id)
    references public.task_instances (id, household_id)
    on delete cascade,

  constraint task_activity_log_acting_profile_same_household_fkey
    foreign key (acting_profile_id, household_id)
    references public.member_profiles (id, household_id)
    on delete set null
);

comment on table public.task_activity_log is
  'Append-only history of every task transition. UPDATE and DELETE are blocked by trigger for EVERY role, including service_role — a correction is a new entry, never an edit.';
comment on column public.task_activity_log.actor_auth_user_id is
  'The authenticated account that acted — authority. Distinct from acting_profile_id, which is attribution (ADR-035). An adult completing a child''s chore is one account and a different profile.';
comment on column public.task_activity_log.client_operation_id is
  'Reserved for the post-MVP offline queue (ADR-017). Unused today; present so replay-safety needs no migration later.';

-- Deduplicates a replayed offline operation once the queue exists. Partial, so
-- the column stays free today.
create unique index task_activity_log_client_operation_unique
  on public.task_activity_log (household_id, client_operation_id)
  where client_operation_id is not null;

-- ---------------------------------------------------------------------------
-- Indexes
--
-- Driven by the two queries WP5D will actually run: "this household's week" and
-- "this child's week".
-- ---------------------------------------------------------------------------

create index task_templates_household_active_idx
  on public.task_templates (household_id)
  where is_active and deleted_at is null;

create index task_instances_household_date_idx
  on public.task_instances (household_id, occurrence_date)
  where deleted_at is null;

create index task_instances_template_idx
  on public.task_instances (template_id)
  where template_id is not null;

create index task_instances_household_status_idx
  on public.task_instances (household_id, status)
  where deleted_at is null;

create index task_assignments_assignee_idx
  on public.task_assignments (assignee_profile_id)
  where assignee_profile_id is not null;

create index task_assignments_household_idx
  on public.task_assignments (household_id);

create index task_activity_log_instance_time_idx
  on public.task_activity_log (task_instance_id, occurred_at desc);

create index task_activity_log_household_time_idx
  on public.task_activity_log (household_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger task_templates_set_updated_at
  before update on public.task_templates
  for each row execute function public.set_updated_at();

create trigger task_instances_set_updated_at
  before update on public.task_instances
  for each row execute function public.set_updated_at();

create trigger task_assignments_set_updated_at
  before update on public.task_assignments
  for each row execute function public.set_updated_at();

-- household_id immutability, reusing the WP3 function.
create trigger task_templates_household_id_immutable
  before update on public.task_templates
  for each row execute function public.prevent_household_id_change();

create trigger task_instances_household_id_immutable
  before update on public.task_instances
  for each row execute function public.prevent_household_id_change();

create trigger task_assignments_household_id_immutable
  before update on public.task_assignments
  for each row execute function public.prevent_household_id_change();

-- Snapshots and the occurrence identity are fixed at creation.
create trigger task_instances_snapshot_immutable
  before update on public.task_instances
  for each row execute function public.prevent_task_snapshot_change();

-- Append-only, enforced for every role.
create trigger task_activity_log_no_update
  before update on public.task_activity_log
  for each row execute function public.prevent_task_activity_mutation();

create trigger task_activity_log_no_delete
  before delete on public.task_activity_log
  for each row execute function public.prevent_task_activity_mutation();

-- ---------------------------------------------------------------------------
-- Task authorization helpers
--
-- Same contract as the WP4 helpers (ADR-027):
--   * SECURITY DEFINER, so a policy can consult a table the caller cannot read
--     without recursing through that table's own policies.
--   * STABLE — auth.uid() and now() are stable within a statement.
--   * SET search_path = '' with every object fully schema-qualified.
--   * NO user-id parameter. A caller can only ever ask about itself, so these
--     cannot be used to probe what somebody else is assigned to.
--   * They live in `private`, which anon cannot even use.
--
-- These exist because least privilege here is ROW-shaped, not table-shaped: a
-- guest or service provider may see the chores assigned to them and nothing
-- else, and that question cannot be answered from the row alone.
-- ---------------------------------------------------------------------------

-- Is the CALLER the live assignee of this occurrence?
--
-- `proposed` and `accepted` are the live statuses; `declined` and `reassigned`
-- are history, and history must not keep granting access after somebody else
-- has taken the turn. Standing is re-verified in full (active, unexpired, live
-- household, active profile), so a suspended assignee loses access immediately
-- without anybody having to rewrite their assignment rows.
create or replace function private.is_assigned_to_task_instance(p_task_instance_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.task_assignments a
    join public.household_members m
      on m.household_id = a.household_id
     and m.profile_id = a.assignee_profile_id
    join public.member_profiles p
      on p.id = m.profile_id
     and p.household_id = m.household_id
    join public.households h
      on h.id = m.household_id
    where a.task_instance_id = p_task_instance_id
      and a.status in ('proposed', 'accepted')
      and m.auth_user_id = (select auth.uid())
      and m.status = 'active'
      and (m.access_expires_at is null or m.access_expires_at > now())
      and h.deleted_at is null
      and p.is_active
      and p.deleted_at is null
  );
$$;

comment on function private.is_assigned_to_task_instance(uuid) is
  'True when the CALLER holds the live assignment (proposed or accepted) for this occurrence, with full membership standing re-verified. Takes no user id: it can only answer for the caller. This is what gives a guest or service provider access to their own work and nothing else.';

-- Is the CALLER the live assignee of any occurrence of this template?
--
-- A template is not assignable itself, so "scoped to me" means: work generated
-- from it has actually been given to me. Soft-deleted occurrences do not count.
create or replace function private.is_assigned_to_task_template(p_template_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.task_instances i
    join public.task_assignments a
      on a.task_instance_id = i.id
    join public.household_members m
      on m.household_id = a.household_id
     and m.profile_id = a.assignee_profile_id
    join public.member_profiles p
      on p.id = m.profile_id
     and p.household_id = m.household_id
    join public.households h
      on h.id = m.household_id
    where i.template_id = p_template_id
      and i.deleted_at is null
      and a.status in ('proposed', 'accepted')
      and m.auth_user_id = (select auth.uid())
      and m.status = 'active'
      and (m.access_expires_at is null or m.access_expires_at > now())
      and h.deleted_at is null
      and p.is_active
      and p.deleted_at is null
  );
$$;

comment on function private.is_assigned_to_task_template(uuid) is
  'True when the CALLER is the live assignee of at least one live occurrence of this template. Lets a guest or service provider read the definition of work they have actually been given, without exposing the rest of the household chore list.';

-- Is this template adult-only?
--
-- Kept as a helper rather than a join inside the policy so that reading
-- task_templates from a task_instances policy cannot recurse through
-- task_templates' own policies.
--
-- It answers ONLY about the caller's own household. A bare lookup would have
-- been a one-bit oracle: anybody could ask whether an arbitrary template id is
-- adult-only. The membership predicate is repeated here rather than delegated,
-- because that is the invariant 080_wp4_helper_functions.sql enforces over every
-- function in this schema.
--
-- Absent, foreign or unreadable ⇒ false. Safe, because the policies that call
-- this always AND it with a role check in the same household, so a false answer
-- can never widen access on its own. A one-off occurrence has no template and is
-- likewise not adult-only.
create or replace function private.is_task_template_adult_only(p_template_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(
    (select t.adult_only
       from public.task_templates t
       join public.household_members m
         on m.household_id = t.household_id
       join public.member_profiles p
         on p.id = m.profile_id
        and p.household_id = m.household_id
       join public.households h
         on h.id = m.household_id
      where t.id = p_template_id
        and m.auth_user_id = (select auth.uid())
        and m.status = 'active'
        and (m.access_expires_at is null or m.access_expires_at > now())
        and h.deleted_at is null
        and p.is_active
        and p.deleted_at is null),
    false
  );
$$;

comment on function private.is_task_template_adult_only(uuid) is
  'True when the template is flagged adult_only AND the caller holds active standing in its household. Scoped to the caller so it cannot be used to probe another household. Only an owner or adult can set the flag, because only they can write task_templates at all — which is what makes it safe to consult from a policy.';

-- The same question, reached from an occurrence rather than a template.
create or replace function private.is_task_instance_adult_only(p_task_instance_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(
    (select t.adult_only
       from public.task_instances i
       join public.task_templates t
         on t.id = i.template_id
       join public.household_members m
         on m.household_id = i.household_id
       join public.member_profiles p
         on p.id = m.profile_id
        and p.household_id = m.household_id
       join public.households h
         on h.id = m.household_id
      where i.id = p_task_instance_id
        and m.auth_user_id = (select auth.uid())
        and m.status = 'active'
        and (m.access_expires_at is null or m.access_expires_at > now())
        and h.deleted_at is null
        and p.is_active
        and p.deleted_at is null),
    false
  );
$$;

comment on function private.is_task_instance_adult_only(uuid) is
  'True when the occurrence came from an adult_only template AND the caller holds active standing in its household. Used by the task_assignments and task_activity_log policies, which hold an instance id rather than a template id.';

revoke all on function private.is_assigned_to_task_instance(uuid) from public, anon;
revoke all on function private.is_assigned_to_task_template(uuid) from public, anon;
revoke all on function private.is_task_template_adult_only(uuid) from public, anon;
revoke all on function private.is_task_instance_adult_only(uuid) from public, anon;

grant execute on function private.is_assigned_to_task_instance(uuid) to authenticated, service_role;
grant execute on function private.is_assigned_to_task_template(uuid) to authenticated, service_role;
grant execute on function private.is_task_template_adult_only(uuid) to authenticated, service_role;
grant execute on function private.is_task_instance_adult_only(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Enabled before any GRANT is issued, so there is no window in which the tables
-- are reachable without a policy.
-- ---------------------------------------------------------------------------

alter table public.task_templates enable row level security;
alter table public.task_instances enable row level security;
alter table public.task_assignments enable row level security;
alter table public.task_activity_log enable row level security;

-- Strip the Supabase default privileges first, then grant back the minimum.
revoke all on table public.task_templates from public, anon, authenticated;
revoke all on table public.task_instances from public, anon, authenticated;
revoke all on table public.task_assignments from public, anon, authenticated;
revoke all on table public.task_activity_log from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Column-level grants
--
-- RLS is row-level only, so the column grants carry what RLS cannot: which
-- fields a client may write at all. Audit columns (created_by, updated_by,
-- deleted_by) and the generated occurrence_key are readable but NEVER writable,
-- so a client cannot forge authorship or fabricate an idempotency key.
--
-- `anon` receives nothing — no grant, no policy — exactly as in WP4.
-- ---------------------------------------------------------------------------

grant select on public.task_templates to authenticated;
grant insert (
  household_id, title, description, category, area_or_room,
  recurrence_rule, time_window_start, time_window_end,
  estimated_minutes, effort_level, adult_only, approval_required,
  missed_policy, default_priority, starts_on, ends_on, is_active
) on public.task_templates to authenticated;
grant update (
  title, description, category, area_or_room,
  recurrence_rule, time_window_start, time_window_end,
  estimated_minutes, effort_level, adult_only, approval_required,
  missed_policy, default_priority, starts_on, ends_on, is_active,
  deleted_at
) on public.task_templates to authenticated;

grant select on public.task_instances to authenticated;
grant insert (
  household_id, template_id, occurrence_date,
  title_snapshot, description_snapshot,
  scheduled_for, due_at, status, priority, source
) on public.task_instances to authenticated;
grant update (
  scheduled_for, due_at, status, priority,
  completed_at, completed_by, skipped_reason, blocked_reason,
  manual_override, deleted_at
) on public.task_instances to authenticated;

grant select on public.task_assignments to authenticated;
grant insert (
  household_id, task_instance_id, assignee_profile_id,
  assignment_type, status, assigned_by_rule_id,
  assignment_reason, reason_code, algorithm_version, accepted_at
) on public.task_assignments to authenticated;
grant update (
  assignee_profile_id, assignment_type, status,
  assignment_reason, reason_code, algorithm_version, accepted_at
) on public.task_assignments to authenticated;

-- Insert-and-read only. No UPDATE or DELETE grant exists, and the trigger blocks
-- them even for roles that bypass RLS.
grant select on public.task_activity_log to authenticated;
grant insert (
  household_id, task_instance_id, acting_profile_id,
  action_type, from_state, to_state, detail, client_operation_id, occurred_at
) on public.task_activity_log to authenticated;

-- Server-side administration, bootstrap and deterministic test fixtures only
-- (ADR-030). DELETE is granted for fixture teardown; the activity-log trigger
-- still refuses it, which is deliberate.
grant select, insert, update, delete on public.task_templates to service_role;
grant select, insert, update, delete on public.task_instances to service_role;
grant select, insert, update, delete on public.task_assignments to service_role;
grant select, insert, update, delete on public.task_activity_log to service_role;

-- ---------------------------------------------------------------------------
-- Policies
--
-- Every policy derives the caller's standing from auth.uid() through the WP4
-- private helpers, never from a client-supplied household_id. A non-member
-- matches zero rows rather than raising, so no policy reveals that another
-- household exists.
--
-- Deliberately NO DELETE policy on any table. Clients soft-delete by setting
-- deleted_at; physical deletion is unreachable, so a family can always recover
-- and audit.
--
-- WHY THE SELECT POLICIES DO NOT SIMPLY FILTER `deleted_at is null`:
-- PostgreSQL applies a table's SELECT policies to the NEW row of an UPDATE, not
-- only to the old one. A policy that hides soft-deleted rows from everybody
-- therefore makes soft-deletion itself impossible — the UPDATE that sets
-- deleted_at produces a row the caller may no longer see, and Postgres rejects
-- it with "new row violates row-level security policy". A row can never be
-- updated into invisibility.
--
-- So visibility of a soft-deleted row is scoped by ROLE instead: owners and
-- adults keep seeing it, which is what makes both soft-delete and the ADR-007
-- 48-hour restore reachable, and is exactly what the /templates/trash screen
-- needs. Children, guests and service providers see live rows only.
--
-- THE ROLE SCOPE (ADR-040). Membership alone is NOT the read predicate. Every
-- task SELECT policy asks which of three scopes the caller has, mirroring the
-- split WP4 already applies to member_profiles and household_members:
--
--   owner / adult      the whole household, including the trash.
--   child              the household week MINUS adult_only chores. A child must
--                      see the family week including a sibling's chores
--                      (PILOT_WEEKLY_CHORES.md §3 and §13), and must never see
--                      adults_only data (06-security-and-permissions.md).
--   guest / service    ONLY what is actually assigned to them. No household-wide
--   provider           chore visibility at all.
--
-- adult_only therefore stops being a presentation hint and becomes a real
-- boundary for children. That is safe because only an owner or adult can write
-- task_templates at all, so a child cannot clear the flag to reveal a row.
-- ---------------------------------------------------------------------------

-- task_templates -----------------------------------------------------------

create policy task_templates_select_member
  on public.task_templates
  for select
  to authenticated
  using (
    private.is_active_household_member(household_id)
    and (
      -- Owner/adult: everything, live and soft-deleted. The trash view.
      private.has_household_role(
        household_id, array['owner', 'adult']::public.household_role[]
      )
      -- Child: the live family chore list, minus adult-only chores.
      or (
        deleted_at is null
        and not adult_only
        and private.has_household_role(
          household_id, array['child']::public.household_role[]
        )
      )
      -- Guest / service provider: only the definition of work actually given to
      -- them. No role check is needed — being assigned IS the scope.
      or (
        deleted_at is null
        and private.is_assigned_to_task_template(id)
      )
    )
  );

comment on policy task_templates_select_member on public.task_templates is
  'Scoped by role, not by membership alone (ADR-040). Owner/adult read every template including soft-deleted ones — that is the trash view, and without it neither soft-delete nor the ADR-007 restore would be possible, because Postgres applies SELECT policies to the new row of an UPDATE. A child reads the live chore list minus adult_only chores. A guest or service provider reads only templates they hold a live assignment from, so they never see the household chore list.';

create policy task_templates_insert_adult
  on public.task_templates
  for insert
  to authenticated
  with check (
    deleted_at is null
    and private.has_household_role(
      household_id, array['owner', 'adult']::public.household_role[]
    )
  );

comment on policy task_templates_insert_adult on public.task_templates is
  'Only an owner or adult defines a chore. A child completing chores never gets to invent them.';

create policy task_templates_update_adult
  on public.task_templates
  for update
  to authenticated
  using (
    private.has_household_role(
      household_id, array['owner', 'adult']::public.household_role[]
    )
  )
  with check (
    private.has_household_role(
      household_id, array['owner', 'adult']::public.household_role[]
    )
  );

comment on policy task_templates_update_adult on public.task_templates is
  'Owner/adult may edit a template, including soft-deleting and restoring it via deleted_at. The USING clause omits the deleted_at filter on purpose, so a soft-deleted template can still be restored within the ADR-007 window.';

-- task_instances -----------------------------------------------------------

create policy task_instances_select_member
  on public.task_instances
  for select
  to authenticated
  using (
    private.is_active_household_member(household_id)
    and (
      private.has_household_role(
        household_id, array['owner', 'adult']::public.household_role[]
      )
      -- A child sees the family week — both children's chores, which §13 makes
      -- an acceptance criterion — minus anything adult-only.
      or (
        deleted_at is null
        and not private.is_task_template_adult_only(template_id)
        and private.has_household_role(
          household_id, array['child']::public.household_role[]
        )
      )
      -- A guest or service provider sees their own assigned occurrences only.
      or (
        deleted_at is null
        and private.is_assigned_to_task_instance(id)
      )
    )
  );

comment on policy task_instances_select_member on public.task_instances is
  'Scoped by role (ADR-040). Owner/adult read every occurrence including soft-deleted ones. A child reads the whole family week — a sibling''s chores included, because PILOT_WEEKLY_CHORES.md §13 requires it — minus occurrences of adult_only templates. A guest or service provider reads only occurrences assigned to them. A one-off occurrence has no template and is therefore not adult-only.';

create policy task_instances_insert_member
  on public.task_instances
  for insert
  to authenticated
  with check (
    deleted_at is null
    -- The family generates and quick-adds chores. A guest or service provider
    -- does not: they would be creating a row they cannot then see, and adding
    -- work to a household is not part of doing the work you were given.
    and private.has_household_role(
      household_id, array['owner', 'adult', 'child']::public.household_role[]
    )
  );

comment on policy task_instances_insert_member on public.task_instances is
  'Owner, adult or child may generate or quick-add an occurrence in their own household; a guest or service provider may not (ADR-040). Generation is idempotent, so a repeated attempt collides with task_instances_occurrence_key_unique rather than creating a duplicate.';

create policy task_instances_update_member
  on public.task_instances
  for update
  to authenticated
  using (
    private.is_active_household_member(household_id)
    and (
      private.has_household_role(
        household_id, array['owner', 'adult']::public.household_role[]
      )
      or (
        deleted_at is null
        and not private.is_task_template_adult_only(template_id)
        and private.has_household_role(
          household_id, array['child']::public.household_role[]
        )
      )
      or (
        deleted_at is null
        and private.is_assigned_to_task_instance(id)
      )
    )
  )
  with check (
    private.is_active_household_member(household_id)
    -- Completing and reopening are open to everyone in scope; REMOVING a chore
    -- from the week is an owner/adult act. Stated here rather than left to the
    -- SELECT policy, so a child attempting it gets a policy refusal instead of
    -- the confusing "new row violates row-level security policy" that the
    -- new-row SELECT check would otherwise produce.
    and (
      private.has_household_role(
        household_id, array['owner', 'adult']::public.household_role[]
      )
      or (
        deleted_at is null
        and not private.is_task_template_adult_only(template_id)
        and private.has_household_role(
          household_id, array['child']::public.household_role[]
        )
      )
      or (
        deleted_at is null
        and private.is_assigned_to_task_instance(id)
      )
    )
  );

comment on policy task_instances_update_member on public.task_instances is
  'Completion and reopening follow the same scope as reading (ADR-040): owner/adult anywhere in the household, a child on any non-adult-only occurrence of the family week, a guest or service provider only on occurrences assigned to them. Only an owner or adult may soft-delete or restore. Whether a CHILD may undo their own completion is a product rule enforced above the database (PILOT_WEEKLY_CHORES.md §10.4), not a policy — every transition is logged either way. The immutability trigger still protects the snapshots.';

-- task_assignments ---------------------------------------------------------

create policy task_assignments_select_member
  on public.task_assignments
  for select
  to authenticated
  using (
    private.is_active_household_member(household_id)
    and (
      private.has_household_role(
        household_id, array['owner', 'adult']::public.household_role[]
      )
      -- A child has to see whose turn it is, including a sibling's turn, but
      -- not the assignment of an adult-only chore.
      or (
        not private.is_task_instance_adult_only(task_instance_id)
        and private.has_household_role(
          household_id, array['child']::public.household_role[]
        )
      )
      -- A guest or service provider sees their OWN assignment rows only, and so
      -- learns nothing about how the rest of the household is organised.
      or assignee_profile_id = private.current_profile_id(household_id)
    )
  );

comment on policy task_assignments_select_member on public.task_assignments is
  'Scoped by role (ADR-040). Owner/adult read every assignment in the household. A child reads the rotation, sibling turns included, minus adult-only chores. A guest or service provider reads only rows where they are themselves the assignee — matched on assignee_profile_id against private.current_profile_id, so history rows naming somebody else stay hidden.';

create policy task_assignments_insert_adult
  on public.task_assignments
  for insert
  to authenticated
  with check (
    private.has_household_role(
      household_id, array['owner', 'adult']::public.household_role[]
    )
  );

comment on policy task_assignments_insert_adult on public.task_assignments is
  'Only an owner or adult creates an assignment, so a child cannot assign a chore to a sibling. Volunteering, when WP5C/WP5D introduce it, arrives as an authorized use case rather than a widened policy.';

create policy task_assignments_update_adult
  on public.task_assignments
  for update
  to authenticated
  using (
    private.has_household_role(
      household_id, array['owner', 'adult']::public.household_role[]
    )
  )
  with check (
    private.has_household_role(
      household_id, array['owner', 'adult']::public.household_role[]
    )
  );

comment on policy task_assignments_update_adult on public.task_assignments is
  'Only an owner or adult reassigns or accepts on behalf of the household.';

-- task_activity_log --------------------------------------------------------

create policy task_activity_log_select_member
  on public.task_activity_log
  for select
  to authenticated
  using (
    private.is_active_household_member(household_id)
    and (
      private.has_household_role(
        household_id, array['owner', 'adult']::public.household_role[]
      )
      or (
        not private.is_task_instance_adult_only(task_instance_id)
        and private.has_household_role(
          household_id, array['child']::public.household_role[]
        )
      )
      or private.is_assigned_to_task_instance(task_instance_id)
    )
  );

comment on policy task_activity_log_select_member on public.task_activity_log is
  'Scoped by role (ADR-040), and always to the history of occurrences the caller can see in the first place. Owner/adult read the whole household history — transparency within the family is the point. A child reads the history of the family week minus adult-only chores. A guest or service provider reads the history of their own assigned occurrences only.';

create policy task_activity_log_insert_member
  on public.task_activity_log
  for insert
  to authenticated
  with check (
    private.is_active_household_member(household_id)
    -- You may only write history about an occurrence you are entitled to act on.
    and (
      private.has_household_role(
        household_id, array['owner', 'adult']::public.household_role[]
      )
      or (
        not private.is_task_instance_adult_only(task_instance_id)
        and private.has_household_role(
          household_id, array['child']::public.household_role[]
        )
      )
      or private.is_assigned_to_task_instance(task_instance_id)
    )
    -- And you may only attribute it to yourself, unless you are an adult acting
    -- on a child's behalf.
    and (
      acting_profile_id is null
      or acting_profile_id = private.current_profile_id(household_id)
      or private.has_household_role(
        household_id, array['owner', 'adult']::public.household_role[]
      )
    )
  );

comment on policy task_activity_log_insert_member on public.task_activity_log is
  'Two independent conditions. First, the caller must be entitled to act on that occurrence at all — same scope as reading (ADR-040), so a guest cannot append history to a chore that is not theirs. Second, they may only attribute the entry to themselves unless they are an owner or adult, who may act on behalf of a child (ADR-035); a child cannot forge an entry attributed to a sibling. There is no UPDATE or DELETE policy, and the trigger blocks both for every role.';
