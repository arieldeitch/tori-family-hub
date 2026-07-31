-- WP5C — Child rotation foundation.
--
-- WP5B made a chore survive a refresh. This makes "whose turn is it?" survive a
-- refresh, and — more importantly — makes the answer EXPLAINABLE after the fact.
--
--   rotation_rules           how a chore rotates, and where the cursor is
--   rotation_members         who participates, in canonical order
--   rotation_assignment_log  every allocation decision, append-only
--
-- Structure, GRANTs and the complete RLS policy set ship together in this one
-- migration (ADR-023). auth.users is REFERENCED ONLY.
--
-- THE ENGINE IS NOT REIMPLEMENTED HERE. `src/domain/shifts.ts` already selects
-- an assignee deterministically (ALGORITHM_VERSION = "shifts.v1") and is tested,
-- including the WP0 timezone regression. 08-rotation-engine.md is explicit that
-- the pilot reuses it rather than introducing a second engine. This migration is
-- the durable memory around that engine: its inputs, its cursor, and an
-- immutable record of what it decided and why.
--
-- What that buys, concretely:
--
--   * DETERMINISM — the cursor lives in a column, not in a client. Two devices
--     computing the same week get the same answer because they read the same
--     cursor, not because they happen to agree.
--   * EXPLAINABILITY — every decision stores reason_code, algorithm_version, the
--     candidate snapshot and the human sentence that was shown. A past
--     assignment stays explainable after the engine changes (ADR-006).
--   * IDEMPOTENCY — one decision per (rule, occurrence), enforced by a unique
--     index. A retry or a concurrent second client collides instead of
--     allocating twice.
--
-- Not in this migration:
--   * any UI or app wiring                                     (WP5D)
--   * the approved pilot chores as data (ADR-034: guarded bootstrap only)
--   * RPCs. Everything is reachable by ordinary policy-checked DML.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Mirrors ShiftStrategy in src/domain/shifts.ts. The database must not invent a
-- strategy the engine cannot execute.
create type public.rotation_strategy as enum (
  'fixed_sequence',
  'weekday_fixed',
  'manual'
);

-- Mirrors FallbackStrategy.
create type public.rotation_fallback as enum (
  'unassigned',
  'next_available_in_sequence'
);

-- PILOT_WEEKLY_CHORES.md §10 leaves "does the sequence advance per occurrence or
-- per week?" as an open product decision, and 08-rotation-engine.md requires it
-- to be CONFIGURABLE rather than hard-coded. So it is a column, not an
-- assumption. The pilot default is per-occurrence, which is what makes the trash
-- chore alternate by occurrence and a week legitimately end 9-8 (ADR-036).
create type public.rotation_advance_mode as enum (
  'per_occurrence',
  'per_week'
);

-- ---------------------------------------------------------------------------
-- Trigger function
-- ---------------------------------------------------------------------------

-- The allocation log is the audit trail for "why did the app choose this child?".
-- Append-only for EVERY role, service_role included, exactly like
-- task_activity_log: a correction is a new decision, never an edited one.
create or replace function public.prevent_rotation_log_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'rotation_assignment_log is append-only: % is not permitted', tg_op
    using errcode = '23514';
end;
$$;

comment on function public.prevent_rotation_log_mutation() is
  'Blocks UPDATE and DELETE on rotation_assignment_log for every role including service_role. A rotation decision is recorded once; superseding it means appending a new decision.';

-- ---------------------------------------------------------------------------
-- rotation_rules
--
-- One rule per chore. The cursor lives here, which is the whole point: ADR-036
-- requires the cursor to CONTINUE ACROSS WEEKS and never reset on Sunday, so it
-- cannot be derived from "this week's occurrences" — it has to be remembered.
-- ---------------------------------------------------------------------------

create table public.rotation_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,

  -- The chore this rule rotates. Composite FK proves same-household.
  task_template_id uuid not null,

  strategy public.rotation_strategy not null default 'fixed_sequence',

  -- Persisted so a rule records which engine version it was authored against,
  -- and so a future engine can refuse or migrate an older rule deliberately.
  algorithm_version text not null default 'shifts.v1'
    constraint rotation_rules_algorithm_version_length
      check (length(btrim(algorithm_version)) between 1 and 40),

  advance_mode public.rotation_advance_mode not null default 'per_occurrence',
  avoid_consecutive boolean not null default false,
  fallback public.rotation_fallback not null default 'unassigned',

  -- weekday_fixed mapping, shape validated by the application. The database
  -- guarantees only that it is an object, so a malformed scalar cannot be
  -- stored. Empty for fixed_sequence rules.
  weekday_map jsonb not null default '{}'::jsonb
    constraint rotation_rules_weekday_map_is_object
      check (jsonb_typeof(weekday_map) = 'object'),

  -- THE CURSOR. The profile that most recently held a turn under this rule; the
  -- engine's `lastAssigneeId`. NULL means "never run", which the engine reads as
  -- "start at the beginning of the sequence".
  --
  -- ON DELETE SET NULL rather than cascade: removing a person must not delete
  -- the rule, it must reset the cursor to the start.
  cursor_profile_id uuid,

  -- Advanced only when a decision is actually recorded, so a read never moves
  -- the cursor and the same week can be recomputed without drift.
  cursor_advanced_at timestamptz,

  is_active boolean not null default true,

  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id) on delete set null,

  constraint rotation_rules_id_household_key unique (id, household_id),

  constraint rotation_rules_template_same_household_fkey
    foreign key (task_template_id, household_id)
    references public.task_templates (id, household_id)
    on delete cascade,

  constraint rotation_rules_cursor_same_household_fkey
    foreign key (cursor_profile_id, household_id)
    references public.member_profiles (id, household_id)
    on delete set null
);

comment on table public.rotation_rules is
  'How one chore rotates between people, and where its cursor currently sits. Each chore keeps its OWN cursor, which is what lets the two dishwasher chores stagger so that on any given day one child unloads and the other loads (ADR-036).';
comment on column public.rotation_rules.cursor_profile_id is
  'The profile that most recently held a turn — the engine''s lastAssigneeId. NULL means the rule has never run and the sequence starts at its first member. Persisted rather than derived, because ADR-036 requires the cursor to continue across weeks and never reset on Sunday.';
comment on column public.rotation_rules.advance_mode is
  'Whether the sequence advances per occurrence or per week. A column rather than a constant because PILOT_WEEKLY_CHORES.md §10 leaves it open and 08-rotation-engine.md requires it to be configurable.';
comment on column public.rotation_rules.algorithm_version is
  'The engine version this rule was authored against, e.g. shifts.v1. Stored so a future engine can treat an older rule deliberately instead of silently reinterpreting it.';

-- At most one live rule per chore. A second live rule would make "whose turn is
-- it?" ambiguous, which is precisely what this package exists to prevent.
create unique index rotation_rules_one_live_per_template
  on public.rotation_rules (task_template_id)
  where is_active and deleted_at is null;

comment on index public.rotation_rules_one_live_per_template is
  'One live rotation rule per chore. Superseded rules are deactivated or soft-deleted, never duplicated, so a chore can never have two competing cursors.';

create index rotation_rules_household_active_idx
  on public.rotation_rules (household_id)
  where is_active and deleted_at is null;

-- ---------------------------------------------------------------------------
-- rotation_members
--
-- The participants, in canonical order. `position` is the sequence the engine
-- walks; it is UNIQUE per rule so the order can never be ambiguous — the one
-- thing that would make the outcome non-deterministic.
-- ---------------------------------------------------------------------------

create table public.rotation_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,

  rotation_rule_id uuid not null,
  member_profile_id uuid not null,

  position integer not null
    constraint rotation_members_position_range check (position between 0 and 999),

  -- Generic eligibility for this rule (the engine's Participant.eligible).
  -- NOT a security boundary: authority comes from household_members.
  is_eligible boolean not null default true,

  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint rotation_members_id_household_key unique (id, household_id),

  constraint rotation_members_rule_same_household_fkey
    foreign key (rotation_rule_id, household_id)
    references public.rotation_rules (id, household_id)
    on delete cascade,

  constraint rotation_members_profile_same_household_fkey
    foreign key (member_profile_id, household_id)
    references public.member_profiles (id, household_id)
    on delete cascade,

  -- A person appears at most once in a rule.
  constraint rotation_members_unique_profile unique (rotation_rule_id, member_profile_id),
  -- And exactly one person occupies each position: no ties, so no tie-break is
  -- ever needed and the walk order is total.
  constraint rotation_members_unique_position unique (rotation_rule_id, position)
);

comment on table public.rotation_members is
  'Who participates in a rotation, in canonical order. position is unique per rule, so the sequence is a total order and the engine never needs a tie-break to stay deterministic.';
comment on column public.rotation_members.is_eligible is
  'Generic eligibility hint consumed by the engine. NOT a security boundary: authority comes from household_members and RLS never consults this column.';

create index rotation_members_rule_position_idx
  on public.rotation_members (rotation_rule_id, position);

create index rotation_members_profile_idx
  on public.rotation_members (member_profile_id);

-- ---------------------------------------------------------------------------
-- rotation_assignment_log
--
-- Append-only. One decision per (rule, occurrence) — that uniqueness IS the
-- idempotency and concurrency guarantee: a retry, a double-tap or a second
-- device collides with the index instead of allocating a second time.
-- ---------------------------------------------------------------------------

create table public.rotation_assignment_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,

  rotation_rule_id uuid not null,
  task_instance_id uuid not null,

  -- NULL is a legitimate, recorded outcome: "nobody was eligible" is a decision
  -- the family is entitled to see explained, not a missing row.
  selected_profile_id uuid,

  -- The engine's ReasonCode, e.g. NEXT_IN_SEQUENCE, PRIMARY_UNAVAILABLE,
  -- ONLY_ELIGIBLE_PARTICIPANT, NO_ELIGIBLE_PARTICIPANT, CONSECUTIVE_AVOIDED.
  -- Text rather than an enum so the engine can add a reason without a migration;
  -- the closed vocabulary lives with the engine that produces it.
  reason_code text not null
    constraint rotation_assignment_log_reason_code_length
      check (length(btrim(reason_code)) between 1 and 60),

  algorithm_version text not null
    constraint rotation_assignment_log_algorithm_version_length
      check (length(btrim(algorithm_version)) between 1 and 40),

  -- The exact sentence shown to the family, kept verbatim. Re-deriving it later
  -- from a reason code would risk showing a different explanation than the one
  -- they actually saw.
  human_explanation text
    constraint rotation_assignment_log_explanation_length
      check (human_explanation is null or length(btrim(human_explanation)) between 1 and 500),

  -- Who was considered, and why each was or was not a candidate.
  candidate_snapshot jsonb
    constraint rotation_assignment_log_snapshot_is_array
      check (candidate_snapshot is null or jsonb_typeof(candidate_snapshot) = 'array'),
  warnings jsonb
    constraint rotation_assignment_log_warnings_is_array
      check (warnings is null or jsonb_typeof(warnings) = 'array'),

  -- The cursor as it stood BEFORE this decision, so a decision can be replayed
  -- and audited without reconstructing history from every prior row.
  cursor_before_profile_id uuid,

  client_operation_id uuid,

  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint rotation_assignment_log_rule_same_household_fkey
    foreign key (rotation_rule_id, household_id)
    references public.rotation_rules (id, household_id)
    on delete cascade,

  constraint rotation_assignment_log_instance_same_household_fkey
    foreign key (task_instance_id, household_id)
    references public.task_instances (id, household_id)
    on delete cascade,

  constraint rotation_assignment_log_selected_same_household_fkey
    foreign key (selected_profile_id, household_id)
    references public.member_profiles (id, household_id)
    on delete set null
);

comment on table public.rotation_assignment_log is
  'Append-only record of every allocation decision: who was chosen, why, by which engine version, and who else was considered. This is what makes a past assignment explainable after the engine changes (ADR-006).';
comment on column public.rotation_assignment_log.selected_profile_id is
  'NULL is a real outcome, not a missing value: "nobody was eligible" is a decision the family is entitled to see explained.';
comment on column public.rotation_assignment_log.human_explanation is
  'The sentence actually shown, stored verbatim rather than re-derived, so the explanation can never drift from what the family read.';
comment on column public.rotation_assignment_log.cursor_before_profile_id is
  'The rule cursor as it stood before this decision, so one row is enough to audit or replay it.';

-- THE idempotency guarantee. One decision per (rule, occurrence): a retry or a
-- concurrent second allocator hits this index and can treat the violation as a
-- no-op instead of assigning the chore twice.
create unique index rotation_assignment_log_one_per_instance
  on public.rotation_assignment_log (rotation_rule_id, task_instance_id);

comment on index public.rotation_assignment_log_one_per_instance is
  'Makes allocation idempotent under concurrency: the second transaction to decide the same (rule, occurrence) fails here rather than producing a competing decision.';

-- Deduplicates a replayed offline operation once the queue exists (ADR-017).
create unique index rotation_assignment_log_client_operation_unique
  on public.rotation_assignment_log (household_id, client_operation_id)
  where client_operation_id is not null;

create index rotation_assignment_log_rule_time_idx
  on public.rotation_assignment_log (rotation_rule_id, decided_at desc);

create index rotation_assignment_log_household_time_idx
  on public.rotation_assignment_log (household_id, decided_at desc);

-- ---------------------------------------------------------------------------
-- The foreign key WP5B deliberately deferred
--
-- task_assignments.assigned_by_rule_id was left an FK-less uuid because
-- rotation_rules did not exist yet. It exists now, so the reference is added —
-- the small, honest migration WP5B promised.
-- ---------------------------------------------------------------------------

alter table public.task_assignments
  add constraint task_assignments_rule_same_household_fkey
  foreign key (assigned_by_rule_id, household_id)
  references public.rotation_rules (id, household_id)
  on delete set null;

comment on column public.task_assignments.assigned_by_rule_id is
  'The rotation rule that produced this assignment. WP5C added the foreign key that WP5B deliberately deferred; ON DELETE SET NULL so removing a rule never erases the assignment it produced.';

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger rotation_rules_set_updated_at
  before update on public.rotation_rules
  for each row execute function public.set_updated_at();

create trigger rotation_members_set_updated_at
  before update on public.rotation_members
  for each row execute function public.set_updated_at();

create trigger rotation_rules_household_id_immutable
  before update on public.rotation_rules
  for each row execute function public.prevent_household_id_change();

create trigger rotation_members_household_id_immutable
  before update on public.rotation_members
  for each row execute function public.prevent_household_id_change();

create trigger rotation_assignment_log_no_update
  before update on public.rotation_assignment_log
  for each row execute function public.prevent_rotation_log_mutation();

create trigger rotation_assignment_log_no_delete
  before delete on public.rotation_assignment_log
  for each row execute function public.prevent_rotation_log_mutation();

-- ---------------------------------------------------------------------------
-- Authorization helpers (private, ADR-027)
--
-- Same contract as every other helper in this schema: SECURITY DEFINER, STABLE,
-- search_path pinned empty, exactly one uuid argument, NO user id, and standing
-- re-derived from auth.uid() so the function can never be used to probe another
-- household. 080_wp4_helper_functions.sql enforces that over the whole schema.
--
-- These exist because a rotation row's visibility is inherited from the CHORE it
-- rotates: a rule is as visible as its template, and no more.
-- ---------------------------------------------------------------------------

-- Is the chore behind this rule adult-only?
create or replace function private.is_rotation_rule_adult_only(p_rotation_rule_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(
    (select t.adult_only
       from public.rotation_rules r
       join public.task_templates t
         on t.id = r.task_template_id
       join public.household_members m
         on m.household_id = r.household_id
       join public.member_profiles p
         on p.id = m.profile_id
        and p.household_id = m.household_id
       join public.households h
         on h.id = m.household_id
      where r.id = p_rotation_rule_id
        and m.auth_user_id = (select auth.uid())
        and m.status = 'active'
        and (m.access_expires_at is null or m.access_expires_at > now())
        and h.deleted_at is null
        and p.is_active
        and p.deleted_at is null),
    false
  );
$$;

comment on function private.is_rotation_rule_adult_only(uuid) is
  'True when the chore behind this rotation rule is flagged adult_only AND the caller holds active standing in its household. Scoped to the caller so it cannot be used to probe another household.';

-- Is the CALLER the live assignee of any occurrence of the chore this rule
-- rotates? That is what earns a guest or service provider sight of the rule.
create or replace function private.is_assigned_to_rotation_rule(p_rotation_rule_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.rotation_rules r
    join public.task_instances i
      on i.template_id = r.task_template_id
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
    where r.id = p_rotation_rule_id
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

comment on function private.is_assigned_to_rotation_rule(uuid) is
  'True when the CALLER holds a live assignment on an occurrence of the chore this rule rotates. Lets somebody see why they were given the work, without exposing the rest of the household rotation.';

revoke all on function private.is_rotation_rule_adult_only(uuid) from public, anon;
revoke all on function private.is_assigned_to_rotation_rule(uuid) from public, anon;

grant execute on function private.is_rotation_rule_adult_only(uuid) to authenticated, service_role;
grant execute on function private.is_assigned_to_rotation_rule(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security — enabled before any GRANT
-- ---------------------------------------------------------------------------

alter table public.rotation_rules enable row level security;
alter table public.rotation_members enable row level security;
alter table public.rotation_assignment_log enable row level security;

revoke all on table public.rotation_rules from public, anon, authenticated;
revoke all on table public.rotation_members from public, anon, authenticated;
revoke all on table public.rotation_assignment_log from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Column-level grants
--
-- Audit columns and the cursor are readable but never client-writable. The
-- cursor especially: letting a client set it would let a child hand themselves
-- the easy chore forever, which is exactly the "no hidden decision" property
-- this package exists to protect. It moves only through a server-side use case
-- or a service-role path, alongside the log entry that explains the move.
--
-- `anon` receives nothing.
-- ---------------------------------------------------------------------------

grant select on public.rotation_rules to authenticated;
grant insert (
  household_id, task_template_id, strategy, algorithm_version,
  advance_mode, avoid_consecutive, fallback, weekday_map, is_active
) on public.rotation_rules to authenticated;
grant update (
  strategy, algorithm_version, advance_mode, avoid_consecutive,
  fallback, weekday_map, is_active, deleted_at
) on public.rotation_rules to authenticated;

grant select on public.rotation_members to authenticated;
grant insert (
  household_id, rotation_rule_id, member_profile_id, position, is_eligible
) on public.rotation_members to authenticated;
grant update (position, is_eligible) on public.rotation_members to authenticated;
-- Removing a participant is a real edit, not a soft delete: the rule's history
-- lives in the append-only log, not in this row.
grant delete on public.rotation_members to authenticated;

grant select on public.rotation_assignment_log to authenticated;
grant insert (
  household_id, rotation_rule_id, task_instance_id, selected_profile_id,
  reason_code, algorithm_version, human_explanation, candidate_snapshot,
  warnings, cursor_before_profile_id, client_operation_id, decided_at
) on public.rotation_assignment_log to authenticated;

grant select, insert, update, delete on public.rotation_rules to service_role;
grant select, insert, update, delete on public.rotation_members to service_role;
grant select, insert, update, delete on public.rotation_assignment_log to service_role;

-- ---------------------------------------------------------------------------
-- Policies
--
-- Role-scoped exactly like the task tables (ADR-041). A rotation row is as
-- visible as the chore it rotates, and no more:
--
--   owner / adult      the whole household, including soft-deleted rules
--   child              rules for chores they can see, minus adult_only
--   guest / service    only rules for chores actually assigned to them
--
-- No DELETE policy on rotation_rules or the log: rules soft-delete, the log is
-- append-only. rotation_members is the one exception and is explained above.
-- ---------------------------------------------------------------------------

-- rotation_rules -------------------------------------------------------------

create policy rotation_rules_select_member
  on public.rotation_rules
  for select
  to authenticated
  using (
    private.is_active_household_member(household_id)
    and (
      private.has_household_role(
        household_id, array['owner', 'adult']::public.household_role[]
      )
      or (
        deleted_at is null
        and not private.is_task_template_adult_only(task_template_id)
        and private.has_household_role(
          household_id, array['child']::public.household_role[]
        )
      )
      or (
        deleted_at is null
        and private.is_assigned_to_task_template(task_template_id)
      )
    )
  );

comment on policy rotation_rules_select_member on public.rotation_rules is
  'A rotation rule is as visible as the chore it rotates (ADR-041). A child sees how their week is decided — which is the point of "no hidden decision" — but not the rotation of an adult-only chore.';

create policy rotation_rules_insert_adult
  on public.rotation_rules
  for insert
  to authenticated
  with check (
    deleted_at is null
    and private.has_household_role(
      household_id, array['owner', 'adult']::public.household_role[]
    )
  );

comment on policy rotation_rules_insert_adult on public.rotation_rules is
  'Only an owner or adult defines how a chore rotates. A child cannot write the rule that decides their own turn.';

create policy rotation_rules_update_adult
  on public.rotation_rules
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

comment on policy rotation_rules_update_adult on public.rotation_rules is
  'Owner/adult may edit, deactivate, soft-delete and restore a rule. The USING clause omits the deleted_at filter so a soft-deleted rule stays restorable (ADR-007, ADR-040).';

-- rotation_members -----------------------------------------------------------

create policy rotation_members_select_member
  on public.rotation_members
  for select
  to authenticated
  using (
    private.is_active_household_member(household_id)
    and (
      private.has_household_role(
        household_id, array['owner', 'adult']::public.household_role[]
      )
      or (
        not private.is_rotation_rule_adult_only(rotation_rule_id)
        and private.has_household_role(
          household_id, array['child']::public.household_role[]
        )
      )
      or private.is_assigned_to_rotation_rule(rotation_rule_id)
    )
  );

comment on policy rotation_members_select_member on public.rotation_members is
  'Who is in the rotation, and in what order, is visible to whoever can see the rule. A child seeing the order is how "whose turn is next" stops being a mystery.';

create policy rotation_members_insert_adult
  on public.rotation_members
  for insert
  to authenticated
  with check (
    private.has_household_role(
      household_id, array['owner', 'adult']::public.household_role[]
    )
  );

create policy rotation_members_update_adult
  on public.rotation_members
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

create policy rotation_members_delete_adult
  on public.rotation_members
  for delete
  to authenticated
  using (
    private.has_household_role(
      household_id, array['owner', 'adult']::public.household_role[]
    )
  );

comment on policy rotation_members_delete_adult on public.rotation_members is
  'The only DELETE policy in the schema. Removing somebody from a rotation is an edit to a forward-looking list, not the erasure of history: every turn they already took is preserved in rotation_assignment_log, which nobody can delete.';

-- rotation_assignment_log ----------------------------------------------------

create policy rotation_assignment_log_select_member
  on public.rotation_assignment_log
  for select
  to authenticated
  using (
    private.is_active_household_member(household_id)
    and (
      private.has_household_role(
        household_id, array['owner', 'adult']::public.household_role[]
      )
      or (
        not private.is_rotation_rule_adult_only(rotation_rule_id)
        and private.has_household_role(
          household_id, array['child']::public.household_role[]
        )
      )
      or private.is_assigned_to_task_instance(task_instance_id)
    )
  );

comment on policy rotation_assignment_log_select_member on public.rotation_assignment_log is
  'The explanation is readable by whoever the decision was about. A child is entitled to see why the app gave them a chore — that is what makes the rotation explainable rather than merely deterministic (ADR-006).';

create policy rotation_assignment_log_insert_adult
  on public.rotation_assignment_log
  for insert
  to authenticated
  with check (
    private.has_household_role(
      household_id, array['owner', 'adult']::public.household_role[]
    )
  );

comment on policy rotation_assignment_log_insert_adult on public.rotation_assignment_log is
  'Only an owner or adult records an allocation, matching task_assignments_insert_adult: a child cannot manufacture a decision that hands a chore to a sibling. There is no UPDATE or DELETE policy, and the trigger blocks both for every role.';
