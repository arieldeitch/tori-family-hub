-- WP5B behavioural RLS — task_assignments and task_activity_log.
--
-- The attribution rule is the interesting one: a member may append history
-- attributed to THEMSELVES, and only an owner or adult may append history
-- attributed to somebody else. That is what lets an adult complete a chore on
-- a child's behalf (ADR-035) while stopping a sibling from forging an entry.
begin;
select plan(41);

-- Row fixtures, created as owner and rolled back with the transaction --------
insert into public.task_templates (id, household_id, title) values
  ('f0000000-0000-4000-8000-00000000a001', 'aaaa0000-0000-4000-8000-000000000001', 'A: chore'),
  ('f0000000-0000-4000-8000-00000000b001', 'bbbb0000-0000-4000-8000-000000000001', 'B: chore');

insert into public.task_instances
  (id, household_id, template_id, occurrence_date, title_snapshot) values
  ('f0000000-0000-4000-8000-00000000c001', 'aaaa0000-0000-4000-8000-000000000001',
   'f0000000-0000-4000-8000-00000000a001', date '2026-08-03', 'A: chore'),
  ('f0000000-0000-4000-8000-00000000c002', 'aaaa0000-0000-4000-8000-000000000001',
   'f0000000-0000-4000-8000-00000000a001', date '2026-08-04', 'A: chore'),
  ('f0000000-0000-4000-8000-00000000c003', 'aaaa0000-0000-4000-8000-000000000001',
   'f0000000-0000-4000-8000-00000000a001', date '2026-08-05', 'A: chore'),
  ('f0000000-0000-4000-8000-00000000d001', 'bbbb0000-0000-4000-8000-000000000001',
   'f0000000-0000-4000-8000-00000000b001', date '2026-08-03', 'B: chore');

insert into public.task_assignments
  (id, household_id, task_instance_id, assignee_profile_id, assignment_type, status) values
  ('f0000000-0000-4000-8000-00000000e001', 'aaaa0000-0000-4000-8000-000000000001',
   'f0000000-0000-4000-8000-00000000c001', 'aaaa0000-0000-4000-8000-000000000103', 'manual', 'proposed'),
  -- The guest holds one real assignment, so the attribution rules below are
  -- tested on a caller who is genuinely in scope (ADR-040) rather than one who
  -- is refused for lacking scope in the first place.
  ('f0000000-0000-4000-8000-00000000e003', 'aaaa0000-0000-4000-8000-000000000001',
   'f0000000-0000-4000-8000-00000000c003', 'aaaa0000-0000-4000-8000-000000000104', 'manual', 'proposed'),
  ('f0000000-0000-4000-8000-00000000e002', 'bbbb0000-0000-4000-8000-000000000001',
   'f0000000-0000-4000-8000-00000000d001', 'bbbb0000-0000-4000-8000-000000000102', 'manual', 'proposed');

insert into public.task_activity_log
  (id, household_id, task_instance_id, acting_profile_id, action_type) values
  ('f0000000-0000-4000-8000-00000000f001', 'aaaa0000-0000-4000-8000-000000000001',
   'f0000000-0000-4000-8000-00000000c001', 'aaaa0000-0000-4000-8000-000000000103', 'created'),
  ('f0000000-0000-4000-8000-00000000f002', 'bbbb0000-0000-4000-8000-000000000001',
   'f0000000-0000-4000-8000-00000000d001', 'bbbb0000-0000-4000-8000-000000000102', 'created');

-- Fixture identities ---------------------------------------------------------
select set_config('tori.a_adult', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Adult'), true);
select set_config('tori.a_guest', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Guest'), true);
select set_config('tori.a_suspended', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Suspended'), true);
select set_config('tori.b_owner', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'B Owner'), true);
select set_config('tori.unrelated', (
  select id::text from auth.users where email = 'tori-wp4-unrelated@tori.invalid'), true);

-- An adult of household A ------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_adult'), 'role', 'authenticated')::text, true);
set local role authenticated;

select is(current_user::text, 'authenticated', 'acting as authenticated, not as a BYPASSRLS owner');

select is((select count(*) from public.task_assignments), 2::bigint,
  'an adult sees every assignment of their own household and none of household B''s');
select is((select count(*) from public.task_activity_log), 1::bigint,
  'an adult sees only their own household''s history');
select is((select count(*) from public.task_assignments
           where household_id = 'bbbb0000-0000-4000-8000-000000000001'), 0::bigint,
  'another household''s assignments are invisible');
select is((select count(*) from public.task_activity_log
           where household_id = 'bbbb0000-0000-4000-8000-000000000001'), 0::bigint,
  'another household''s history is invisible');

-- Assigning is an owner/adult act.
select lives_ok(
  $$ insert into public.task_assignments
       (household_id, task_instance_id, assignee_profile_id, assignment_type)
     values ('aaaa0000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000c002',
             'aaaa0000-0000-4000-8000-000000000103', 'manual') $$,
  'an adult may assign a chore in their own household');
select throws_ok(
  $$ insert into public.task_assignments
       (household_id, task_instance_id, assignee_profile_id, assignment_type)
     values ('bbbb0000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000d001',
             'bbbb0000-0000-4000-8000-000000000102', 'manual') $$,
  '42501', null, 'an adult cannot assign a chore in a household they do not belong to');

-- The rotation explainability rule survives the policy layer.
select throws_ok(
  $$ insert into public.task_assignments
       (household_id, task_instance_id, assignee_profile_id, assignment_type)
     values ('aaaa0000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000c001',
             'aaaa0000-0000-4000-8000-000000000103', 'rotation') $$,
  '23514', null,
  'even a permitted caller cannot create an unexplained rotation assignment');

select lives_ok(
  $$ update public.task_assignments set status = 'reassigned'
     where id = 'f0000000-0000-4000-8000-00000000e001' $$,
  'an adult may retire an assignment');
select throws_ok(
  $$ delete from public.task_assignments where id = 'f0000000-0000-4000-8000-00000000e001' $$,
  '42501', null, 'authenticated holds no DELETE on task_assignments');

-- Appending history --------------------------------------------------------------
select lives_ok(
  $$ insert into public.task_activity_log
       (household_id, task_instance_id, acting_profile_id, action_type, to_state)
     values ('aaaa0000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000c001',
             'aaaa0000-0000-4000-8000-000000000103', 'status_changed', 'done') $$,
  'an adult may append history attributed to a child — acting on their behalf (ADR-035)');
select lives_ok(
  $$ insert into public.task_activity_log
       (household_id, task_instance_id, action_type)
     values ('aaaa0000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000c001',
             'created') $$,
  'an entry with no acting profile is allowed');
select throws_ok(
  $$ insert into public.task_activity_log
       (household_id, task_instance_id, action_type)
     values ('bbbb0000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000d001',
             'created') $$,
  '42501', null, 'an adult cannot append history to another household');

-- History is written once, by everyone.
select throws_ok(
  $$ update public.task_activity_log set action_type = 'edited'
     where id = 'f0000000-0000-4000-8000-00000000f001' $$,
  '42501', null, 'authenticated holds no UPDATE on task_activity_log');
select throws_ok(
  $$ delete from public.task_activity_log where id = 'f0000000-0000-4000-8000-00000000f001' $$,
  '42501', null, 'authenticated holds no DELETE on task_activity_log');
select throws_ok(
  $$ insert into public.task_activity_log
       (household_id, task_instance_id, action_type, actor_auth_user_id)
     values ('aaaa0000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000c001',
             'created', (select auth.uid())) $$,
  '42501', null,
  'a client cannot write actor_auth_user_id — the authenticated actor is recorded server-side');
reset role;

-- A guest holding exactly one assignment ---------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_guest'), 'role', 'authenticated')::text, true);
set local role authenticated;

select is((select count(*) from public.task_assignments), 1::bigint,
  'a guest sees their own assignment row and nobody else''s (ADR-040)');
select is((select count(*) from public.task_assignments
           where id = 'f0000000-0000-4000-8000-00000000e001'), 0::bigint,
  'the assignment naming another person is invisible to the guest');
select is((select count(*) from public.task_activity_log), 0::bigint,
  'a guest reads no history at all until something happens on their OWN occurrence');

select throws_ok(
  $$ insert into public.task_assignments
       (household_id, task_instance_id, assignee_profile_id, assignment_type)
     values ('aaaa0000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000c002',
             'aaaa0000-0000-4000-8000-000000000103', 'manual') $$,
  '42501', null, 'a guest cannot assign a chore to somebody else');

update public.task_assignments set assignee_profile_id = 'aaaa0000-0000-4000-8000-000000000104'
  where id = 'f0000000-0000-4000-8000-00000000e001';
reset role;
select is((select assignee_profile_id from public.task_assignments
           where id = 'f0000000-0000-4000-8000-00000000e001'),
  'aaaa0000-0000-4000-8000-000000000103'::uuid,
  'a guest cannot reassign somebody else''s chore to themselves — the UPDATE matches zero rows');

-- Attribution, tested on a caller who IS in scope: self yes, anybody else no.
set local role authenticated;
select is(private.current_profile_id('aaaa0000-0000-4000-8000-000000000001'),
  'aaaa0000-0000-4000-8000-000000000104'::uuid,
  'the guest caller resolves to their own profile');
select lives_ok(
  $$ insert into public.task_activity_log
       (household_id, task_instance_id, acting_profile_id, action_type, to_state)
     values ('aaaa0000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000c003',
             'aaaa0000-0000-4000-8000-000000000104', 'status_changed', 'done') $$,
  'a guest may append history about their own occurrence, attributed to themselves');
select lives_ok(
  $$ insert into public.task_activity_log
       (household_id, task_instance_id, action_type)
     values ('aaaa0000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000c003',
             'created') $$,
  'a guest may append an unattributed entry about their own occurrence');
select throws_ok(
  $$ insert into public.task_activity_log
       (household_id, task_instance_id, acting_profile_id, action_type, to_state)
     values ('aaaa0000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000c003',
             'aaaa0000-0000-4000-8000-000000000103', 'status_changed', 'done') $$,
  '42501', null,
  'a guest cannot forge an entry attributed to somebody else, even on their own occurrence');
select throws_ok(
  $$ insert into public.task_activity_log
       (household_id, task_instance_id, acting_profile_id, action_type, to_state)
     values ('aaaa0000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000c001',
             'aaaa0000-0000-4000-8000-000000000104', 'status_changed', 'done') $$,
  '42501', null,
  'and cannot append history about an occurrence that is not theirs, even attributed correctly');
select throws_ok(
  $$ insert into public.task_activity_log
       (household_id, task_instance_id, action_type)
     values ('bbbb0000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000d001',
             'created') $$,
  '42501', null, 'a guest cannot append history to another household');
reset role;

-- Household B is sealed off in the other direction ------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.b_owner'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.task_assignments), 1::bigint,
  'household B''s owner sees exactly their own assignment');
select is((select count(*) from public.task_activity_log), 1::bigint,
  'household B''s owner sees exactly their own history entry');
select is((select count(*) from public.task_assignments
           where household_id = 'aaaa0000-0000-4000-8000-000000000001'), 0::bigint,
  'household B''s owner sees none of household A''s assignments');
select throws_ok(
  $$ insert into public.task_activity_log
       (household_id, task_instance_id, action_type)
     values ('aaaa0000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000c001',
             'created') $$,
  '42501', null, 'household B''s owner cannot append to household A''s history');
reset role;

-- Membership state fails closed ----------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_suspended'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.task_assignments), 0::bigint,
  'a suspended member sees no assignments');
select is((select count(*) from public.task_activity_log), 0::bigint,
  'a suspended member sees no history');
select throws_ok(
  $$ insert into public.task_activity_log
       (household_id, task_instance_id, action_type)
     values ('aaaa0000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000c001',
             'created') $$,
  '42501', null, 'a suspended member cannot append history');
reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.unrelated'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.task_assignments), 0::bigint,
  'an unrelated authenticated user sees no assignments anywhere');
select is((select count(*) from public.task_activity_log), 0::bigint,
  'an unrelated authenticated user sees no history anywhere');
reset role;

select set_config('request.jwt.claims', '', true);
set local role authenticated;
select is((select count(*) from public.task_assignments), 0::bigint,
  'a NULL auth.uid() sees no assignments — the policies fail closed');
select is((select count(*) from public.task_activity_log), 0::bigint,
  'a NULL auth.uid() sees no history');
reset role;

-- anon holds nothing at all -----------------------------------------------------------
set local role anon;
select throws_ok($$ select count(*) from public.task_assignments $$,
  '42501', null, 'anon cannot read task_assignments');
select throws_ok($$ select count(*) from public.task_activity_log $$,
  '42501', null, 'anon cannot read task_activity_log');
select throws_ok(
  $$ insert into public.task_activity_log
       (household_id, task_instance_id, action_type)
     values ('aaaa0000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000c001',
             'created') $$,
  '42501', null, 'anon cannot append history');
reset role;

select * from finish();
rollback;
