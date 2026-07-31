-- WP5B — constraint, trigger and idempotency behaviour.
-- Runs as the table owner, so nothing here is an RLS test: it proves the
-- guarantees that hold for EVERY role, including service_role. Household
-- isolation by policy is asserted in supabase/tests/rls.
-- Fixtures are transactional and rolled back.
begin;
select plan(37);

insert into public.households (id, name) values
  ('c0000000-0000-4000-8000-000000000001', 'WP5B Household A'),
  ('c0000000-0000-4000-8000-000000000002', 'WP5B Household B');

insert into public.member_profiles (id, household_id, display_name) values
  ('c0000000-0000-4000-8000-000000000101', 'c0000000-0000-4000-8000-000000000001', 'A Child One'),
  ('c0000000-0000-4000-8000-000000000102', 'c0000000-0000-4000-8000-000000000001', 'A Child Two'),
  ('c0000000-0000-4000-8000-000000000201', 'c0000000-0000-4000-8000-000000000002', 'B Child');

insert into public.task_templates (id, household_id, title) values
  ('c0000000-0000-4000-8000-000000000301', 'c0000000-0000-4000-8000-000000000001', 'Unload the dishwasher'),
  ('c0000000-0000-4000-8000-000000000401', 'c0000000-0000-4000-8000-000000000002', 'B household chore');

-- occurrence_key: deterministic and DateStyle-independent -------------------
insert into public.task_instances (id, household_id, template_id, occurrence_date, title_snapshot)
values ('c0000000-0000-4000-8000-000000000501', 'c0000000-0000-4000-8000-000000000001',
        'c0000000-0000-4000-8000-000000000301', date '2026-08-03', 'Unload the dishwasher');

select is(
  (select occurrence_key from public.task_instances
    where id = 'c0000000-0000-4000-8000-000000000501'),
  'c0000000-0000-4000-8000-000000000301:2026-08-03',
  'occurrence_key is template_id:ISO-date, computed by the database');

-- The key must not depend on how this session happens to render dates. Under
-- 'SQL, DMY' the naive cast would have produced '03/08/2026' -- a different key
-- for the same day, which is exactly the disagreement the column prevents.
set local datestyle = 'SQL, DMY';
insert into public.task_instances (id, household_id, template_id, occurrence_date, title_snapshot)
values ('c0000000-0000-4000-8000-000000000502', 'c0000000-0000-4000-8000-000000000001',
        'c0000000-0000-4000-8000-000000000301', date '2026-08-04', 'Unload the dishwasher');
select is(
  (select occurrence_key from public.task_instances
    where id = 'c0000000-0000-4000-8000-000000000502'),
  'c0000000-0000-4000-8000-000000000301:2026-08-04',
  'occurrence_key is ISO-8601 under a non-ISO DateStyle too, so two clients cannot disagree');
reset datestyle;

-- Years before 1000 must still pad to four digits, so keys sort lexicographically.
insert into public.task_instances (id, household_id, template_id, occurrence_date, title_snapshot)
values ('c0000000-0000-4000-8000-000000000503', 'c0000000-0000-4000-8000-000000000001',
        'c0000000-0000-4000-8000-000000000301', date '0007-01-09', 'Unload the dishwasher');
select is(
  (select occurrence_key from public.task_instances
    where id = 'c0000000-0000-4000-8000-000000000503'),
  'c0000000-0000-4000-8000-000000000301:0007-01-09',
  'every date component is zero-padded, so keys compare lexicographically');

select throws_ok(
  $$ update public.task_instances set occurrence_key = 'forged'
       where id = 'c0000000-0000-4000-8000-000000000501' $$,
  '428C9', null, 'occurrence_key cannot be written directly, not even by the owner');

-- Idempotent generation ------------------------------------------------------
select throws_ok(
  $$ insert into public.task_instances (household_id, template_id, occurrence_date, title_snapshot)
     values ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000301',
             date '2026-08-03', 'Unload the dishwasher') $$,
  '23505', null,
  'regenerating the same (household, template, date) violates the idempotency index instead of duplicating');

-- A one-off task has no key, so any number of them may share a day.
insert into public.task_instances (id, household_id, occurrence_date, title_snapshot, source)
values ('c0000000-0000-4000-8000-000000000504', 'c0000000-0000-4000-8000-000000000001',
        date '2026-08-03', 'Water the plants', 'manual');
select is(
  (select occurrence_key from public.task_instances
    where id = 'c0000000-0000-4000-8000-000000000504'),
  null, 'a one-off task has a NULL occurrence_key');
select lives_ok(
  $$ insert into public.task_instances (household_id, occurrence_date, title_snapshot, source)
     values ('c0000000-0000-4000-8000-000000000001', date '2026-08-03', 'Fold laundry', 'quick_add') $$,
  'two distinct one-off tasks on the same day are legitimate');

-- Soft-deleting an occurrence frees that day for regeneration.
update public.task_instances set deleted_at = now()
  where id = 'c0000000-0000-4000-8000-000000000501';
select lives_ok(
  $$ insert into public.task_instances (household_id, template_id, occurrence_date, title_snapshot)
     values ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000301',
             date '2026-08-03', 'Unload the dishwasher') $$,
  'a soft-deleted occurrence does not block regenerating that day');

-- The same template date in a DIFFERENT household is a different key anyway,
-- but the index is household-scoped as well.
select lives_ok(
  $$ insert into public.task_instances (household_id, template_id, occurrence_date, title_snapshot)
     values ('c0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000401',
             date '2026-08-03', 'B household chore') $$,
  'each household generates its own occurrences independently');

-- Cross-household references are structurally impossible ----------------------
select throws_ok(
  $$ insert into public.task_instances (household_id, template_id, occurrence_date, title_snapshot)
     values ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000401',
             date '2026-08-05', 'Stolen template') $$,
  '23503', null,
  'an occurrence cannot borrow another household''s template: the composite FK refuses');

select throws_ok(
  $$ update public.task_instances
       set status = 'done', completed_at = now(),
           completed_by = 'c0000000-0000-4000-8000-000000000201'
     where id = 'c0000000-0000-4000-8000-000000000502' $$,
  '23503', null,
  'a profile from another household cannot be recorded as the completer');

-- Snapshots are history and never change --------------------------------------
select throws_ok(
  $$ update public.task_instances set title_snapshot = 'Rewritten'
       where id = 'c0000000-0000-4000-8000-000000000502' $$,
  '23514', null, 'title_snapshot is immutable after creation');
select throws_ok(
  $$ update public.task_instances set description_snapshot = 'Rewritten'
       where id = 'c0000000-0000-4000-8000-000000000502' $$,
  '23514', null, 'description_snapshot is immutable after creation');
select throws_ok(
  $$ update public.task_instances set occurrence_date = date '2026-09-01'
       where id = 'c0000000-0000-4000-8000-000000000502' $$,
  '23514', null, 'an occurrence cannot be moved to another date');
select throws_ok(
  $$ update public.task_instances set template_id = null
       where id = 'c0000000-0000-4000-8000-000000000502' $$,
  '23514', null, 'an occurrence cannot be detached from its template');
select throws_ok(
  $$ update public.task_instances
       set household_id = 'c0000000-0000-4000-8000-000000000002'
     where id = 'c0000000-0000-4000-8000-000000000502' $$,
  '23514', null, 'household_id is immutable: a chore cannot be moved between families');

-- Editing the template must not rewrite the occurrence already created.
update public.task_templates set title = 'Unload the dishwasher (revised)'
  where id = 'c0000000-0000-4000-8000-000000000301';
select is(
  (select title_snapshot from public.task_instances
    where id = 'c0000000-0000-4000-8000-000000000502'),
  'Unload the dishwasher',
  'editing a template leaves an existing occurrence snapshot untouched');

-- Completion is all-or-nothing -------------------------------------------------
select throws_ok(
  $$ update public.task_instances set status = 'done'
       where id = 'c0000000-0000-4000-8000-000000000502' $$,
  '23514', null,
  'a done occurrence must record when and by whom, so a half-write cannot read as success');
select throws_ok(
  $$ update public.task_instances set completed_at = now()
       where id = 'c0000000-0000-4000-8000-000000000502' $$,
  '23514', null, 'a pending occurrence cannot carry a completion timestamp');
select lives_ok(
  $$ update public.task_instances
       set status = 'done', completed_at = now(),
           completed_by = 'c0000000-0000-4000-8000-000000000101'
     where id = 'c0000000-0000-4000-8000-000000000502' $$,
  'a complete completion is accepted');
select lives_ok(
  $$ update public.task_instances
       set status = 'pending', completed_at = null, completed_by = null
     where id = 'c0000000-0000-4000-8000-000000000502' $$,
  'reopening clears the completion consistently');

-- A missed turn must be explainable --------------------------------------------
select throws_ok(
  $$ update public.task_instances set status = 'skipped'
       where id = 'c0000000-0000-4000-8000-000000000502' $$,
  '23514', null, 'a skipped occurrence must say why: the no-punishment rule needs the reason');
select throws_ok(
  $$ update public.task_instances set status = 'blocked'
       where id = 'c0000000-0000-4000-8000-000000000502' $$,
  '23514', null, 'a blocked occurrence must say why');

-- Templates ---------------------------------------------------------------------
select throws_ok(
  $$ insert into public.task_templates (household_id, title, recurrence_rule)
     values ('c0000000-0000-4000-8000-000000000001', 'Bad rule', '"weekly"'::jsonb) $$,
  '23514', null, 'recurrence_rule must be a JSON object, never a scalar');
select throws_ok(
  $$ insert into public.task_templates (household_id, title, time_window_start)
     values ('c0000000-0000-4000-8000-000000000001', 'Half window', time '09:00') $$,
  '23514', null, 'a time window is either fully specified or absent');
select throws_ok(
  $$ insert into public.task_templates (household_id, title, starts_on, ends_on)
     values ('c0000000-0000-4000-8000-000000000001', 'Backwards', date '2026-08-10', date '2026-08-01') $$,
  '23514', null, 'a template cannot end before it starts');
select is(
  (select missed_policy from public.task_templates
    where id = 'c0000000-0000-4000-8000-000000000301'),
  'remain_overdue'::public.task_missed_policy,
  'the default missed_policy leaves a missed chore visible rather than silently dropping it');

-- Assignments --------------------------------------------------------------------
select throws_ok(
  $$ insert into public.task_assignments
       (household_id, task_instance_id, assignee_profile_id, assignment_type)
     values ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000502',
             'c0000000-0000-4000-8000-000000000101', 'rotation') $$,
  '23514', null,
  'a rotation assignment without reason_code and algorithm_version is refused: no hidden decision');

insert into public.task_assignments
  (id, household_id, task_instance_id, assignee_profile_id, assignment_type,
   status, reason_code, algorithm_version)
values ('c0000000-0000-4000-8000-000000000601', 'c0000000-0000-4000-8000-000000000001',
        'c0000000-0000-4000-8000-000000000502', 'c0000000-0000-4000-8000-000000000101',
        'rotation', 'proposed', 'next_in_sequence', 'shifts.v1');

select throws_ok(
  $$ insert into public.task_assignments
       (household_id, task_instance_id, assignee_profile_id, assignment_type, status)
     values ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000502',
             'c0000000-0000-4000-8000-000000000102', 'manual', 'proposed') $$,
  '23505', null, 'an occurrence cannot have two live assignments at once');

-- Reassigning retires the old row rather than deleting it, and history survives.
update public.task_assignments set status = 'reassigned'
  where id = 'c0000000-0000-4000-8000-000000000601';
select lives_ok(
  $$ insert into public.task_assignments
       (household_id, task_instance_id, assignee_profile_id, assignment_type, status)
     values ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000502',
             'c0000000-0000-4000-8000-000000000102', 'manual', 'proposed') $$,
  'once the previous assignment is retired, a new one may be created');
select is(
  (select count(*) from public.task_assignments
    where task_instance_id = 'c0000000-0000-4000-8000-000000000502'),
  2::bigint, 'the superseded assignment is still on record: history is not rewritten');

select throws_ok(
  $$ update public.task_assignments set status = 'accepted'
       where id = 'c0000000-0000-4000-8000-000000000601' $$,
  '23514', null, 'an accepted assignment must record when it was accepted');

-- The activity log is append-only for every role ---------------------------------
insert into public.task_activity_log
  (id, household_id, task_instance_id, acting_profile_id, action_type, to_state)
values ('c0000000-0000-4000-8000-000000000701', 'c0000000-0000-4000-8000-000000000001',
        'c0000000-0000-4000-8000-000000000502', 'c0000000-0000-4000-8000-000000000101',
        'status_changed', 'done');

select throws_ok(
  $$ update public.task_activity_log set to_state = 'pending'
       where id = 'c0000000-0000-4000-8000-000000000701' $$,
  '23514', null, 'the activity log cannot be edited, not even by the owning role');
select throws_ok(
  $$ delete from public.task_activity_log
       where id = 'c0000000-0000-4000-8000-000000000701' $$,
  '23514', null, 'the activity log cannot be deleted: a correction is a new entry');
select throws_ok(
  $$ insert into public.task_activity_log
       (household_id, task_instance_id, action_type)
     values ('c0000000-0000-4000-8000-000000000001',
             'c0000000-0000-4000-8000-000000000502', 'status_changed') $$,
  '23514', null, 'a status_changed entry must record the state it moved to');

-- The reserved offline-queue token deduplicates a replay once it is used.
insert into public.task_activity_log
  (household_id, task_instance_id, action_type, client_operation_id)
values ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000502',
        'created', 'c0000000-0000-4000-8000-000000000801');

select throws_ok(
  $$ insert into public.task_activity_log
       (household_id, task_instance_id, action_type, client_operation_id)
     values ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000502',
             'created', 'c0000000-0000-4000-8000-000000000801') $$,
  '23505', null,
  'a replayed client_operation_id is rejected, so the offline queue (ADR-017) is replay-safe already');

-- The token is only reserved when supplied: ordinary entries never collide.
select lives_ok(
  $$ insert into public.task_activity_log (household_id, task_instance_id, action_type)
     select 'c0000000-0000-4000-8000-000000000001',
            'c0000000-0000-4000-8000-000000000502', 'created'
       from generate_series(1, 3) $$,
  'entries without a client_operation_id are never deduplicated against each other');

select * from finish();
rollback;
