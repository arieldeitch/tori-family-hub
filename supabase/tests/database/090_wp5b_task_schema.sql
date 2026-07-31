-- WP5B ג€” task and recurrence foundation: schema, grants and policy catalog.
-- Structural only: asserts shape and the locked-down surface, never behaviour.
-- Household isolation is behavioural and lives in supabase/tests/rls.
begin;
select plan(82);

-- Enums ---------------------------------------------------------------------
select has_type('public', 'task_status', 'task_status enum exists');
select enum_has_labels('public', 'task_status',
  array['pending', 'done', 'skipped', 'blocked'],
  'task_status has exactly the four documented occurrence states');

select has_type('public', 'task_priority', 'task_priority enum exists');
select enum_has_labels('public', 'task_priority',
  array['low', 'normal', 'high'], 'task_priority has exactly three levels');

select has_type('public', 'task_source', 'task_source enum exists');
select enum_has_labels('public', 'task_source',
  array['generated', 'manual', 'quick_add'],
  'task_source distinguishes reproducible generated rows from ones that are not');

select has_type('public', 'task_assignment_type', 'task_assignment_type enum exists');
select enum_has_labels('public', 'task_assignment_type',
  array['rotation', 'manual', 'volunteer'],
  'task_assignment_type records how the assignee was chosen');

select has_type('public', 'task_assignment_status', 'task_assignment_status enum exists');
select enum_has_labels('public', 'task_assignment_status',
  array['proposed', 'accepted', 'declined', 'reassigned'],
  'task_assignment_status keeps declined and reassigned as history states');

select has_type('public', 'task_missed_policy', 'task_missed_policy enum exists');
select enum_has_labels('public', 'task_missed_policy',
  array['remain_overdue', 'auto_skip', 'reschedule_next'],
  'task_missed_policy is explicit per template ג€” a chore never silently disappears');

select has_type('public', 'task_effort_level', 'task_effort_level enum exists');
select enum_has_labels('public', 'task_effort_level',
  array['light', 'medium', 'heavy'], 'task_effort_level has three bands');

select has_type('public', 'task_activity_action', 'task_activity_action enum exists');
select enum_has_labels('public', 'task_activity_action',
  array['created', 'assigned', 'unassigned', 'status_changed',
        'reopened', 'edited', 'soft_deleted', 'restored'],
  'task_activity_action is a closed vocabulary ג€” the log needs no free-text parsing');

-- Tables --------------------------------------------------------------------
select has_table('public', 'task_templates', 'task_templates exists');
select has_table('public', 'task_instances', 'task_instances exists');
select has_table('public', 'task_assignments', 'task_assignments exists');
select has_table('public', 'task_activity_log', 'task_activity_log exists');

select columns_are('public', 'task_templates', array[
  'id', 'household_id', 'title', 'description', 'category', 'area_or_room',
  'recurrence_rule', 'time_window_start', 'time_window_end',
  'estimated_minutes', 'effort_level', 'adult_only', 'approval_required',
  'missed_policy', 'default_priority', 'starts_on', 'ends_on', 'is_active',
  'created_by', 'updated_by', 'created_at', 'updated_at', 'deleted_at', 'deleted_by'
], 'task_templates has exactly the approved columns');

select columns_are('public', 'task_instances', array[
  'id', 'household_id', 'template_id', 'occurrence_date', 'occurrence_key',
  'title_snapshot', 'description_snapshot', 'scheduled_for', 'due_at',
  'status', 'priority', 'source', 'completed_at', 'completed_by',
  'skipped_reason', 'blocked_reason', 'manual_override',
  'created_by', 'updated_by', 'created_at', 'updated_at', 'deleted_at', 'deleted_by'
], 'task_instances has exactly the approved columns');

select columns_are('public', 'task_assignments', array[
  'id', 'household_id', 'task_instance_id', 'assignee_profile_id',
  'assignment_type', 'status', 'assigned_by_rule_id', 'assignment_reason',
  'reason_code', 'algorithm_version', 'accepted_at',
  'created_by', 'updated_by', 'created_at', 'updated_at'
], 'task_assignments has exactly the approved columns');

select columns_are('public', 'task_activity_log', array[
  'id', 'household_id', 'task_instance_id', 'actor_auth_user_id',
  'acting_profile_id', 'action_type', 'from_state', 'to_state', 'detail',
  'client_operation_id', 'occurred_at', 'created_at'
], 'task_activity_log has exactly the approved columns');

-- No credential or free-form authority material leaked onto the task tables.
select hasnt_column('public', 'task_instances', 'assignee_role',
  'authority is never denormalised onto an occurrence ג€” it comes from household_members');
select hasnt_column('public', 'task_templates', 'household_role',
  'a template carries no role column; adult_only is a hint, not a boundary');

-- occurrence_key is generated, never writable ---------------------------------
select is(
  (select a.attgenerated from pg_attribute a
    where a.attrelid = 'public.task_instances'::regclass and a.attname = 'occurrence_key'),
  's',
  'occurrence_key is a STORED generated column ג€” never client-supplied');

-- A generated expression must be IMMUTABLE, so it cannot read DateStyle. This
-- asserts the ISO construction rather than the ::text cast that would silently
-- vary the key per session.
select ok(
  (select pg_get_expr(d.adbin, d.adrelid) from pg_attrdef d
    where d.adrelid = 'public.task_instances'::regclass
      and d.adnum = (select attnum from pg_attribute
                      where attrelid = 'public.task_instances'::regclass
                        and attname = 'occurrence_key')) like '%lpad%',
  'the occurrence_key expression builds the date from immutable parts, not a DateStyle-dependent cast');

-- Household immutability, timestamps, snapshots and append-only enforcement ---
select has_function('public', 'prevent_task_snapshot_change',
  'prevent_task_snapshot_change() exists');
select has_function('public', 'prevent_task_activity_mutation',
  'prevent_task_activity_mutation() exists');

-- Both are SECURITY INVOKER with a pinned empty search_path, matching WP3.
select is(
  (select count(*) from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('prevent_task_snapshot_change', 'prevent_task_activity_mutation')
      and (p.prosecdef or p.proconfig is distinct from array['search_path=""'])),
  0::bigint,
  'both task trigger functions are SECURITY INVOKER with search_path pinned empty');

select has_trigger('public', 'task_templates', 'task_templates_set_updated_at',
  'task_templates maintains updated_at');
select has_trigger('public', 'task_instances', 'task_instances_set_updated_at',
  'task_instances maintains updated_at');
select has_trigger('public', 'task_assignments', 'task_assignments_set_updated_at',
  'task_assignments maintains updated_at');
select has_trigger('public', 'task_templates', 'task_templates_household_id_immutable',
  'task_templates household_id is immutable');
select has_trigger('public', 'task_instances', 'task_instances_household_id_immutable',
  'task_instances household_id is immutable');
select has_trigger('public', 'task_assignments', 'task_assignments_household_id_immutable',
  'task_assignments household_id is immutable');
select has_trigger('public', 'task_instances', 'task_instances_snapshot_immutable',
  'task_instances snapshots are protected by a trigger');
select has_trigger('public', 'task_activity_log', 'task_activity_log_no_update',
  'task_activity_log refuses UPDATE');
select has_trigger('public', 'task_activity_log', 'task_activity_log_no_delete',
  'task_activity_log refuses DELETE');

-- The activity-log triggers must fire for every role, not only clients.
select is(
  (select count(*) from pg_trigger
    where tgrelid = 'public.task_activity_log'::regclass
      and tgname in ('task_activity_log_no_update', 'task_activity_log_no_delete')
      and tgenabled <> 'O'),
  0::bigint,
  'the append-only triggers are ordinary enabled triggers ג€” service_role does not bypass them');

-- Indexes --------------------------------------------------------------------
select has_index('public', 'task_instances', 'task_instances_occurrence_key_unique',
  'the idempotency index exists');
select is(
  (select indisunique from pg_index where indexrelid = 'public.task_instances_occurrence_key_unique'::regclass),
  true, 'the idempotency index is UNIQUE');
select ok(
  (select pg_get_expr(indpred, indrelid) from pg_index
    where indexrelid = 'public.task_instances_occurrence_key_unique'::regclass) is not null,
  'the idempotency index is partial ג€” one-off and soft-deleted rows are exempt');
select has_index('public', 'task_assignments', 'task_assignments_one_live_per_instance',
  'at most one live assignment per occurrence');
select ok(
  (select pg_get_expr(indpred, indrelid) from pg_index
    where indexrelid = 'public.task_assignments_one_live_per_instance'::regclass) is not null,
  'the live-assignment index is partial, so declined and reassigned rows survive');
select has_index('public', 'task_instances', 'task_instances_household_date_idx',
  'the household-week query is indexed');
select has_index('public', 'task_assignments', 'task_assignments_assignee_idx',
  'the per-child query is indexed');
select has_index('public', 'task_activity_log', 'task_activity_log_instance_time_idx',
  'per-occurrence history is indexed newest first');

-- WP5B deliberately left assigned_by_rule_id an FK-less uuid because
-- rotation_rules did not exist. WP5C added the reference it promised, as a
-- COMPOSITE key so a rule from another household is structurally unreachable.
select col_is_fk('public', 'task_assignments', array['assigned_by_rule_id', 'household_id'],
  'assigned_by_rule_id now references rotation_rules, scoped to the same household (WP5C)');
select is(
  (select confdeltype from pg_constraint
    where conname = 'task_assignments_rule_same_household_fkey'),
  'n',
  'deleting a rotation rule sets assigned_by_rule_id NULL ג€” it never erases the assignment the rule produced');

-- Composite household FKs make cross-household rows structurally impossible ----
select col_is_fk('public', 'task_instances', array['template_id', 'household_id'],
  'an instance proves structurally that its template is in the same household');
select col_is_fk('public', 'task_instances', array['completed_by', 'household_id'],
  'the completing profile must belong to the same household');
select col_is_fk('public', 'task_assignments', array['task_instance_id', 'household_id'],
  'an assignment cannot point at another household''s occurrence');
select col_is_fk('public', 'task_assignments', array['assignee_profile_id', 'household_id'],
  'an assignee must belong to the same household');
select col_is_fk('public', 'task_activity_log', array['task_instance_id', 'household_id'],
  'a log entry cannot point at another household''s occurrence');
select col_is_fk('public', 'task_activity_log', array['acting_profile_id', 'household_id'],
  'the acting profile must belong to the same household');

-- RLS is on, everywhere -------------------------------------------------------
select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('task_templates', 'task_instances', 'task_assignments', 'task_activity_log')
      and not c.relrowsecurity),
  0::bigint,
  'row level security is enabled on all four WP5B tables');

-- Policy catalog --------------------------------------------------------------
select policies_are('public', 'task_templates',
  array['task_templates_select_member', 'task_templates_insert_adult',
        'task_templates_update_adult'],
  'task_templates has exactly the three approved policies');
select policies_are('public', 'task_instances',
  array['task_instances_select_member', 'task_instances_insert_member',
        'task_instances_update_member'],
  'task_instances has exactly the three approved policies');
select policies_are('public', 'task_assignments',
  array['task_assignments_select_member', 'task_assignments_insert_adult',
        'task_assignments_update_adult'],
  'task_assignments has exactly the three approved policies');
select policies_are('public', 'task_activity_log',
  array['task_activity_log_select_member', 'task_activity_log_insert_member'],
  'task_activity_log has exactly two policies ג€” read and append, never edit');

select is(
  (select count(*) from pg_policies
    where schemaname = 'public'
      and tablename in ('task_templates', 'task_instances', 'task_assignments', 'task_activity_log')
      and cmd = 'DELETE'),
  0::bigint,
  'no DELETE policy on any task table ג€” clients soft-delete, never hard-delete');

select is(
  (select count(*) from pg_policies
    where schemaname = 'public'
      and tablename in ('task_templates', 'task_instances', 'task_assignments', 'task_activity_log')
      and roles <> array['authenticated']::name[]),
  0::bigint,
  'every task policy targets the authenticated role only');

-- anon holds nothing ----------------------------------------------------------
select table_privs_are('public', 'task_templates', 'anon', array[]::text[],
  'anon has no privileges on task_templates');
select table_privs_are('public', 'task_instances', 'anon', array[]::text[],
  'anon has no privileges on task_instances');
select table_privs_are('public', 'task_assignments', 'anon', array[]::text[],
  'anon has no privileges on task_assignments');
select table_privs_are('public', 'task_activity_log', 'anon', array[]::text[],
  'anon has no privileges on task_activity_log');
select ok(not has_any_column_privilege('anon', 'public.task_instances', 'SELECT'),
  'anon has no column SELECT on task_instances');

-- Audit and generated columns are readable but never writable ------------------
select column_privs_are('public', 'task_instances', 'occurrence_key', 'authenticated',
  array['SELECT']::text[],
  'occurrence_key is readable but not writable ג€” an idempotency key cannot be forged');
select column_privs_are('public', 'task_instances', 'created_by', 'authenticated',
  array['SELECT']::text[], 'task_instances.created_by is readable but not writable');
select column_privs_are('public', 'task_instances', 'updated_by', 'authenticated',
  array['SELECT']::text[], 'task_instances.updated_by is readable but not writable');
select column_privs_are('public', 'task_instances', 'deleted_by', 'authenticated',
  array['SELECT']::text[], 'task_instances.deleted_by is readable but not writable');
select column_privs_are('public', 'task_templates', 'created_by', 'authenticated',
  array['SELECT']::text[], 'task_templates.created_by is readable but not writable');
select column_privs_are('public', 'task_templates', 'household_id', 'authenticated',
  array['SELECT', 'INSERT']::text[],
  'household_id may be set at creation but never updated ג€” a row cannot be moved between households');
select column_privs_are('public', 'task_activity_log', 'actor_auth_user_id', 'authenticated',
  array['SELECT']::text[],
  'the authenticated actor is recorded server-side, never written by a client (ADR-035)');

-- The activity log is insert-and-read only for clients.
select ok(not has_any_column_privilege('authenticated', 'public.task_activity_log', 'UPDATE'),
  'authenticated cannot UPDATE any task_activity_log column');
select ok(not has_table_privilege('authenticated', 'public.task_activity_log', 'DELETE'),
  'authenticated cannot DELETE from task_activity_log');
select ok(has_any_column_privilege('authenticated', 'public.task_activity_log', 'INSERT'),
  'authenticated can append to task_activity_log');

-- No client DELETE anywhere.
select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('task_templates', 'task_instances', 'task_assignments', 'task_activity_log')
      and has_table_privilege('authenticated', c.oid, 'DELETE')),
  0::bigint,
  'authenticated holds DELETE on no task table');

-- service_role: server-side administration and fixtures only (ADR-030).
select ok(has_table_privilege('service_role', 'public.task_instances', 'INSERT'),
  'service_role can write task_instances for server-side use cases and fixtures');

-- PUBLIC holds nothing.
select is(
  (select count(*) from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     cross join lateral aclexplode(c.relacl) a
    where n.nspname = 'public'
      and c.relname in ('task_templates', 'task_instances', 'task_assignments', 'task_activity_log')
      and a.grantee = 0),
  0::bigint,
  'PUBLIC holds no privileges on any WP5B table');

select * from finish();
rollback;
