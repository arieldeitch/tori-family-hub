-- WP5C ג€” rotation foundation: schema, grants, policy catalog and the
-- determinism/idempotency guarantees that hold for EVERY role.
--
-- Behaviour under RLS lives in supabase/tests/rls/190.
begin;
select plan(65);

-- Enums mirror the engine ----------------------------------------------------
-- The database must not be able to express a strategy src/domain/shifts.ts
-- cannot execute, or a rule becomes unrunnable at allocation time.
select has_type('public', 'rotation_strategy', 'rotation_strategy enum exists');
select enum_has_labels('public', 'rotation_strategy',
  array['fixed_sequence', 'weekday_fixed', 'manual'],
  'rotation_strategy matches ShiftStrategy in src/domain/shifts.ts exactly');

select has_type('public', 'rotation_fallback', 'rotation_fallback enum exists');
select enum_has_labels('public', 'rotation_fallback',
  array['unassigned', 'next_available_in_sequence'],
  'rotation_fallback matches FallbackStrategy exactly');

select has_type('public', 'rotation_advance_mode', 'rotation_advance_mode enum exists');
select enum_has_labels('public', 'rotation_advance_mode',
  array['per_occurrence', 'per_week'],
  'advance mode is a value, not a hard-coded assumption (PILOT_WEEKLY_CHORES.md ֲ§10)');

-- Tables ---------------------------------------------------------------------
select has_table('public', 'rotation_rules', 'rotation_rules exists');
select has_table('public', 'rotation_members', 'rotation_members exists');
select has_table('public', 'rotation_assignment_log', 'rotation_assignment_log exists');

select columns_are('public', 'rotation_rules', array[
  'id', 'household_id', 'task_template_id', 'strategy', 'algorithm_version',
  'advance_mode', 'avoid_consecutive', 'fallback', 'weekday_map',
  'cursor_profile_id', 'cursor_advanced_at', 'is_active',
  'created_by', 'updated_by', 'created_at', 'updated_at', 'deleted_at', 'deleted_by'
], 'rotation_rules has exactly the approved columns');

select columns_are('public', 'rotation_members', array[
  'id', 'household_id', 'rotation_rule_id', 'member_profile_id',
  'position', 'is_eligible', 'created_by', 'created_at', 'updated_at'
], 'rotation_members has exactly the approved columns');

select columns_are('public', 'rotation_assignment_log', array[
  'id', 'household_id', 'rotation_rule_id', 'task_instance_id',
  'selected_profile_id', 'reason_code', 'algorithm_version', 'human_explanation',
  'candidate_snapshot', 'warnings', 'cursor_before_profile_id',
  'client_operation_id', 'decided_at', 'created_at'
], 'rotation_assignment_log has exactly the approved columns');

-- Determinism ----------------------------------------------------------------
-- The cursor must be stored, not derived: ADR-036 requires it to continue across
-- weeks and never reset on Sunday, which no per-week derivation can honour.
select has_column('public', 'rotation_rules', 'cursor_profile_id',
  'the rotation cursor is persisted, so it survives the week boundary');
select col_is_null('public', 'rotation_rules', 'cursor_profile_id',
  'a rule that has never run has a NULL cursor and starts at the sequence head');

-- Every decision records which engine produced it.
select col_not_null('public', 'rotation_rules', 'algorithm_version',
  'a rule records the engine version it was authored against');
select col_not_null('public', 'rotation_assignment_log', 'algorithm_version',
  'every recorded decision carries its algorithm version (ADR-006)');
select col_not_null('public', 'rotation_assignment_log', 'reason_code',
  'every recorded decision carries a reason code ג€” no unexplained assignment');
select col_default_is('public', 'rotation_rules', 'algorithm_version', 'shifts.v1',
  'the default engine version is shifts.v1, the engine that already exists');
select col_default_is('public', 'rotation_rules', 'advance_mode', 'per_occurrence',
  'the pilot advances per occurrence, which is what staggers the two dishwasher chores');

-- Idempotency and concurrency -------------------------------------------------
select has_index('public', 'rotation_assignment_log', 'rotation_assignment_log_one_per_instance',
  'one allocation decision per (rule, occurrence)');
select is(
  (select indisunique from pg_index
    where indexrelid = 'public.rotation_assignment_log_one_per_instance'::regclass),
  true,
  'that index is UNIQUE ג€” it is the idempotency and concurrency guarantee');
select has_index('public', 'rotation_assignment_log', 'rotation_assignment_log_client_operation_unique',
  'a replayed offline operation is deduplicated (ADR-017)');
select has_index('public', 'rotation_rules', 'rotation_rules_one_live_per_template',
  'at most one live rule per chore');
select ok(
  (select pg_get_expr(indpred, indrelid) from pg_index
    where indexrelid = 'public.rotation_rules_one_live_per_template'::regclass) is not null,
  'the one-live-rule index is partial, so superseded rules survive as history');

-- A total order, so the engine never needs a tie-break to stay deterministic.
select col_is_unique('public', 'rotation_members', array['rotation_rule_id', 'position'],
  'exactly one participant per position ג€” the sequence is a total order');
select col_is_unique('public', 'rotation_members', array['rotation_rule_id', 'member_profile_id'],
  'a person appears at most once in a rotation');

-- Household isolation is structural ------------------------------------------
select col_is_fk('public', 'rotation_rules', array['task_template_id', 'household_id'],
  'a rule cannot rotate another household''s chore');
select col_is_fk('public', 'rotation_rules', array['cursor_profile_id', 'household_id'],
  'the cursor cannot point at another household''s profile');
select col_is_fk('public', 'rotation_members', array['rotation_rule_id', 'household_id'],
  'a participant cannot belong to another household''s rule');
select col_is_fk('public', 'rotation_members', array['member_profile_id', 'household_id'],
  'a participant must be a profile of the same household');
select col_is_fk('public', 'rotation_assignment_log', array['rotation_rule_id', 'household_id'],
  'a decision cannot reference another household''s rule');
select col_is_fk('public', 'rotation_assignment_log', array['task_instance_id', 'household_id'],
  'a decision cannot reference another household''s occurrence');
select col_is_fk('public', 'rotation_assignment_log', array['selected_profile_id', 'household_id'],
  'a decision cannot select another household''s profile');

-- Removing a rule must not erase the assignments it produced.
select is(
  (select confdeltype from pg_constraint
    where conname = 'task_assignments_rule_same_household_fkey'),
  'n',
  'deleting a rotation rule sets assigned_by_rule_id NULL rather than cascading');
select is(
  (select confdeltype from pg_constraint
    where conname = 'rotation_rules_cursor_same_household_fkey'),
  'n',
  'removing a person resets the cursor rather than deleting the rule');

-- Triggers --------------------------------------------------------------------
select has_function('public', 'prevent_rotation_log_mutation',
  'prevent_rotation_log_mutation() exists');
select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'prevent_rotation_log_mutation'
      and (p.prosecdef or p.proconfig is distinct from array['search_path=""'])),
  0::bigint,
  'the rotation-log trigger function is SECURITY INVOKER with search_path pinned empty');

select has_trigger('public', 'rotation_rules', 'rotation_rules_set_updated_at',
  'rotation_rules maintains updated_at');
select has_trigger('public', 'rotation_members', 'rotation_members_set_updated_at',
  'rotation_members maintains updated_at');
select has_trigger('public', 'rotation_rules', 'rotation_rules_household_id_immutable',
  'rotation_rules household_id is immutable');
select has_trigger('public', 'rotation_members', 'rotation_members_household_id_immutable',
  'rotation_members household_id is immutable');
select has_trigger('public', 'rotation_assignment_log', 'rotation_assignment_log_no_update',
  'the allocation log refuses UPDATE');
select has_trigger('public', 'rotation_assignment_log', 'rotation_assignment_log_no_delete',
  'the allocation log refuses DELETE');
select is(
  (select count(*) from pg_trigger
    where tgrelid = 'public.rotation_assignment_log'::regclass
      and tgname in ('rotation_assignment_log_no_update', 'rotation_assignment_log_no_delete')
      and tgenabled <> 'O'),
  0::bigint,
  'the append-only triggers are ordinary enabled triggers ג€” service_role does not bypass them');

-- RLS -------------------------------------------------------------------------
select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('rotation_rules', 'rotation_members', 'rotation_assignment_log')
      and not c.relrowsecurity),
  0::bigint,
  'row level security is enabled on all three WP5C tables');

select policies_are('public', 'rotation_rules',
  array['rotation_rules_select_member', 'rotation_rules_insert_adult',
        'rotation_rules_update_adult'],
  'rotation_rules has exactly the three approved policies');
select policies_are('public', 'rotation_members',
  array['rotation_members_select_member', 'rotation_members_insert_adult',
        'rotation_members_update_adult', 'rotation_members_delete_adult'],
  'rotation_members has four policies ג€” the DELETE is the documented exception');
select policies_are('public', 'rotation_assignment_log',
  array['rotation_assignment_log_select_member', 'rotation_assignment_log_insert_adult'],
  'the allocation log has exactly two policies ג€” read and append, never edit');

select is(
  (select count(*) from pg_policies
    where schemaname = 'public'
      and tablename in ('rotation_rules', 'rotation_assignment_log')
      and cmd = 'DELETE'),
  0::bigint,
  'neither the rules nor the log may be hard-deleted by a client');

select is(
  (select count(*) from pg_policies
    where schemaname = 'public'
      and tablename in ('rotation_rules', 'rotation_members', 'rotation_assignment_log')
      and roles <> array['authenticated']::name[]),
  0::bigint,
  'every rotation policy targets the authenticated role only');

-- anon holds nothing ----------------------------------------------------------
select table_privs_are('public', 'rotation_rules', 'anon', array[]::text[],
  'anon has no privileges on rotation_rules');
select table_privs_are('public', 'rotation_members', 'anon', array[]::text[],
  'anon has no privileges on rotation_members');
select table_privs_are('public', 'rotation_assignment_log', 'anon', array[]::text[],
  'anon has no privileges on rotation_assignment_log');
select ok(not has_any_column_privilege('anon', 'public.rotation_rules', 'SELECT'),
  'anon has no column SELECT on rotation_rules');

-- The cursor is never client-writable -----------------------------------------
-- Letting a client set the cursor would let somebody hand themselves the easy
-- chore forever, which is exactly the hidden decision this package prevents.
select column_privs_are('public', 'rotation_rules', 'cursor_profile_id', 'authenticated',
  array['SELECT']::text[],
  'the cursor is readable but NEVER client-writable ג€” it moves only server-side');
select column_privs_are('public', 'rotation_rules', 'cursor_advanced_at', 'authenticated',
  array['SELECT']::text[], 'the cursor timestamp is readable but not writable');
select column_privs_are('public', 'rotation_rules', 'created_by', 'authenticated',
  array['SELECT']::text[], 'rotation_rules.created_by cannot be forged');
select column_privs_are('public', 'rotation_rules', 'household_id', 'authenticated',
  array['SELECT', 'INSERT']::text[],
  'household_id may be set at creation but never updated ג€” a rule cannot move between households');

-- The log is append-only for clients.
select ok(not has_any_column_privilege('authenticated', 'public.rotation_assignment_log', 'UPDATE'),
  'authenticated cannot UPDATE any allocation-log column');
select ok(not has_table_privilege('authenticated', 'public.rotation_assignment_log', 'DELETE'),
  'authenticated cannot DELETE from the allocation log');
select ok(has_any_column_privilege('authenticated', 'public.rotation_assignment_log', 'INSERT'),
  'authenticated can append an allocation decision');

-- Only rotation_members is client-deletable, and that is deliberate.
select ok(not has_table_privilege('authenticated', 'public.rotation_rules', 'DELETE'),
  'authenticated cannot DELETE a rotation rule ג€” rules soft-delete');
select ok(has_table_privilege('authenticated', 'public.rotation_members', 'DELETE'),
  'authenticated may remove a participant: the forward-looking list is editable, history is not');

select ok(has_table_privilege('service_role', 'public.rotation_rules', 'UPDATE'),
  'service_role may advance the cursor for server-side allocation');

select is(
  (select count(*) from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     cross join lateral aclexplode(c.relacl) a
    where n.nspname = 'public'
      and c.relname in ('rotation_rules', 'rotation_members', 'rotation_assignment_log')
      and a.grantee = 0),
  0::bigint,
  'PUBLIC holds no privileges on any WP5C table');

select * from finish();
rollback;
