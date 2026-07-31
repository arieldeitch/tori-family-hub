-- WP5B behavioural RLS — the ADR-040 role scope, table by table and role by role.
--
-- The rule under test:
--   owner / adult          the whole household, including the trash
--   child                  the family week MINUS adult_only chores
--   guest / service        ONLY what is actually assigned to them
--   provider
--
-- Every role is asserted both ways: what it CAN reach and what it CANNOT.
--
-- The shared fixture child has no Auth identity (ADR-013), because a child does
-- not sign in during the pilot. The database nevertheless supports a child-role
-- membership that does, and WP5C/WP5D will need one, so this transaction lends
-- the child profile the otherwise-unused `unrelated` identity. Domain rows only
-- — auth.users is never written by SQL — and the whole thing is rolled back.
begin;
select plan(48);

update public.household_members
   set auth_user_id = (select id from auth.users where email = 'tori-wp4-unrelated@tori.invalid')
 where profile_id = 'aaaa0000-0000-4000-8000-000000000103';

-- Two templates: one ordinary, one adult-only ---------------------------------
insert into public.task_templates (id, household_id, title, adult_only) values
  ('99000000-0000-4000-8000-000000000001', 'aaaa0000-0000-4000-8000-000000000001',
   'Unload the dishwasher', false),
  ('99000000-0000-4000-8000-000000000002', 'aaaa0000-0000-4000-8000-000000000001',
   'Sort the household paperwork', true);

-- Three occurrences: one ordinary, one adult-only, one one-off (no template).
insert into public.task_instances
  (id, household_id, template_id, occurrence_date, title_snapshot, source) values
  ('99000000-0000-4000-8000-000000000101', 'aaaa0000-0000-4000-8000-000000000001',
   '99000000-0000-4000-8000-000000000001', date '2026-08-03', 'Unload the dishwasher', 'generated'),
  ('99000000-0000-4000-8000-000000000102', 'aaaa0000-0000-4000-8000-000000000001',
   '99000000-0000-4000-8000-000000000002', date '2026-08-03', 'Sort the household paperwork', 'generated'),
  ('99000000-0000-4000-8000-000000000103', 'aaaa0000-0000-4000-8000-000000000001',
   null, date '2026-08-03', 'Water the plants', 'quick_add');

-- The guest is assigned the ordinary chore; the service provider is assigned the
-- ADULT-ONLY one, which proves adult_only is a rule about children rather than a
-- general secrecy flag. Nobody is assigned the one-off.
insert into public.task_assignments
  (id, household_id, task_instance_id, assignee_profile_id, assignment_type, status) values
  ('99000000-0000-4000-8000-000000000201', 'aaaa0000-0000-4000-8000-000000000001',
   '99000000-0000-4000-8000-000000000101', 'aaaa0000-0000-4000-8000-000000000104', 'manual', 'proposed'),
  ('99000000-0000-4000-8000-000000000202', 'aaaa0000-0000-4000-8000-000000000001',
   '99000000-0000-4000-8000-000000000102', 'aaaa0000-0000-4000-8000-000000000105', 'manual', 'proposed');

insert into public.task_activity_log
  (id, household_id, task_instance_id, action_type) values
  ('99000000-0000-4000-8000-000000000301', 'aaaa0000-0000-4000-8000-000000000001',
   '99000000-0000-4000-8000-000000000101', 'created'),
  ('99000000-0000-4000-8000-000000000302', 'aaaa0000-0000-4000-8000-000000000001',
   '99000000-0000-4000-8000-000000000102', 'created');

select set_config('tori.adult', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Adult'), true);
select set_config('tori.child', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Child'), true);
select set_config('tori.guest', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Guest'), true);
select set_config('tori.service', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Service Provider'), true);
select set_config('tori.expired', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Expired Guest'), true);

-- ===========================================================================
-- Owner / adult: the whole household
-- ===========================================================================
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.adult'), 'role', 'authenticated')::text, true);
set local role authenticated;

select is(current_user::text, 'authenticated', 'acting as authenticated, not as a BYPASSRLS owner');
select is((select count(*) from public.task_templates), 2::bigint,
  'an adult sees both templates, adult-only included');
select is((select count(*) from public.task_instances), 3::bigint,
  'an adult sees all three occurrences');
select is((select count(*) from public.task_assignments), 2::bigint,
  'an adult sees both assignments');
select is((select count(*) from public.task_activity_log), 2::bigint,
  'an adult sees the whole household history');
reset role;

-- ===========================================================================
-- Child: the family week, minus adult-only
-- ===========================================================================
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.child'), 'role', 'authenticated')::text, true);
set local role authenticated;

select is((select count(*) from public.task_templates), 1::bigint,
  'a child sees exactly one template');
select is((select count(*) from public.task_templates
           where id = '99000000-0000-4000-8000-000000000001'), 1::bigint,
  'the ordinary chore is visible to the child');
select is((select count(*) from public.task_templates
           where id = '99000000-0000-4000-8000-000000000002'), 0::bigint,
  'the adult_only template is invisible to the child');

select is((select count(*) from public.task_instances), 2::bigint,
  'a child sees the ordinary occurrence and the one-off, but not the adult-only one');
select is((select count(*) from public.task_instances
           where id = '99000000-0000-4000-8000-000000000101'), 1::bigint,
  'a child sees an occurrence assigned to SOMEBODY ELSE — the family week, per §13');
select is((select count(*) from public.task_instances
           where id = '99000000-0000-4000-8000-000000000102'), 0::bigint,
  'a child cannot see an occurrence of an adult_only template');
select is((select count(*) from public.task_instances
           where id = '99000000-0000-4000-8000-000000000103'), 1::bigint,
  'a one-off occurrence has no template and is therefore not adult-only');

select is((select count(*) from public.task_assignments), 1::bigint,
  'a child sees whose turn it is, except on adult-only chores');
select is((select count(*) from public.task_assignments
           where task_instance_id = '99000000-0000-4000-8000-000000000102'), 0::bigint,
  'the assignment of an adult-only chore is hidden from the child');
select is((select count(*) from public.task_activity_log), 1::bigint,
  'a child reads the history of the chores they can see, and no others');

select lives_ok(
  $$ update public.task_instances
       set status = 'done', completed_at = now(),
           completed_by = 'aaaa0000-0000-4000-8000-000000000103'
     where id = '99000000-0000-4000-8000-000000000101' $$,
  'a child may complete a chore of the family week');
select lives_ok(
  $$ insert into public.task_instances (household_id, occurrence_date, title_snapshot, source)
     values ('aaaa0000-0000-4000-8000-000000000001', date '2026-08-09', 'Child quick add', 'quick_add') $$,
  'a child may quick-add a chore');
select lives_ok(
  $$ insert into public.task_activity_log
       (household_id, task_instance_id, acting_profile_id, action_type, to_state)
     values ('aaaa0000-0000-4000-8000-000000000001', '99000000-0000-4000-8000-000000000101',
             'aaaa0000-0000-4000-8000-000000000103', 'status_changed', 'done') $$,
  'a child may append history about a chore they can see, attributed to themselves');

-- Negative: the adult-only occurrence is untouchable, and removal is not a
-- child's act.
update public.task_instances
   set status = 'done', completed_at = now(),
       completed_by = 'aaaa0000-0000-4000-8000-000000000103'
 where id = '99000000-0000-4000-8000-000000000102';
reset role;
select is((select status::text from public.task_instances
           where id = '99000000-0000-4000-8000-000000000102'), 'pending',
  'a child completing an adult-only occurrence matches zero rows and changes nothing');

set local role authenticated;
select throws_ok(
  $$ update public.task_instances set deleted_at = now()
       where id = '99000000-0000-4000-8000-000000000101' $$,
  '42501', null, 'a child cannot remove a chore from the week');
select throws_ok(
  $$ insert into public.task_templates (household_id, title)
     values ('aaaa0000-0000-4000-8000-000000000001', 'child invents a chore') $$,
  '42501', null, 'a child cannot define a chore');
select throws_ok(
  $$ insert into public.task_assignments
       (household_id, task_instance_id, assignee_profile_id, assignment_type)
     values ('aaaa0000-0000-4000-8000-000000000001', '99000000-0000-4000-8000-000000000101',
             'aaaa0000-0000-4000-8000-000000000103', 'manual') $$,
  '42501', null, 'a child cannot assign a chore to a sibling');
select throws_ok(
  $$ insert into public.task_activity_log
       (household_id, task_instance_id, action_type, to_state)
     values ('aaaa0000-0000-4000-8000-000000000001', '99000000-0000-4000-8000-000000000102',
             'status_changed', 'done') $$,
  '42501', null, 'a child cannot append history about an adult-only chore');
reset role;

-- ===========================================================================
-- Guest: assigned work only
-- ===========================================================================
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.guest'), 'role', 'authenticated')::text, true);
set local role authenticated;

select is((select count(*) from public.task_templates), 1::bigint,
  'a guest sees only the template they hold an assignment from');
select is((select count(*) from public.task_templates
           where id = '99000000-0000-4000-8000-000000000002'), 0::bigint,
  'a guest sees no other template');
select is((select count(*) from public.task_instances), 1::bigint,
  'a guest sees exactly the occurrence assigned to them — no household-wide chore visibility');
select is((select count(*) from public.task_instances
           where id = '99000000-0000-4000-8000-000000000103'), 0::bigint,
  'an unassigned one-off chore is invisible to a guest');
select is((select count(*) from public.task_assignments), 1::bigint,
  'a guest sees their own assignment row and nobody else''s');
select is((select count(*) from public.task_assignments
           where assignee_profile_id <> 'aaaa0000-0000-4000-8000-000000000104'), 0::bigint,
  'a guest learns nothing about how the rest of the household is organised');
-- Counted by predicate rather than by total, because earlier roles in this
-- transaction have already appended entries of their own.
select is((select count(*) from public.task_activity_log
           where task_instance_id <> '99000000-0000-4000-8000-000000000101'), 0::bigint,
  'a guest reads only the history of their own assigned occurrence, and none other');

select lives_ok(
  $$ update public.task_instances
       set status = 'done', completed_at = now(),
           completed_by = 'aaaa0000-0000-4000-8000-000000000104'
     where id = '99000000-0000-4000-8000-000000000101' $$,
  'a guest may complete the chore assigned to them');
select lives_ok(
  $$ insert into public.task_activity_log
       (household_id, task_instance_id, acting_profile_id, action_type, to_state)
     values ('aaaa0000-0000-4000-8000-000000000001', '99000000-0000-4000-8000-000000000101',
             'aaaa0000-0000-4000-8000-000000000104', 'status_changed', 'done') $$,
  'a guest may append history about their own assigned occurrence');

select throws_ok(
  $$ insert into public.task_instances (household_id, occurrence_date, title_snapshot, source)
     values ('aaaa0000-0000-4000-8000-000000000001', date '2026-08-11', 'Guest quick add', 'quick_add') $$,
  '42501', null, 'a guest cannot add a chore to the household');
select throws_ok(
  $$ insert into public.task_templates (household_id, title)
     values ('aaaa0000-0000-4000-8000-000000000001', 'guest invents a chore') $$,
  '42501', null, 'a guest cannot define a chore');
select throws_ok(
  $$ insert into public.task_assignments
       (household_id, task_instance_id, assignee_profile_id, assignment_type)
     values ('aaaa0000-0000-4000-8000-000000000001', '99000000-0000-4000-8000-000000000101',
             'aaaa0000-0000-4000-8000-000000000104', 'manual') $$,
  '42501', null, 'a guest cannot assign work, not even to themselves');
select throws_ok(
  $$ update public.task_instances set deleted_at = now()
       where id = '99000000-0000-4000-8000-000000000101' $$,
  '42501', null, 'a guest cannot remove the chore assigned to them');
select throws_ok(
  $$ insert into public.task_activity_log
       (household_id, task_instance_id, action_type, to_state)
     values ('aaaa0000-0000-4000-8000-000000000001', '99000000-0000-4000-8000-000000000103',
             'status_changed', 'done') $$,
  '42501', null, 'a guest cannot append history about a chore that is not theirs');
reset role;

-- ===========================================================================
-- Service provider: assigned work only, adult-only notwithstanding
-- ===========================================================================
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.service'), 'role', 'authenticated')::text, true);
set local role authenticated;

select is((select count(*) from public.task_instances), 1::bigint,
  'a service provider sees exactly the occurrence assigned to them');
select is((select count(*) from public.task_instances
           where id = '99000000-0000-4000-8000-000000000102'), 1::bigint,
  'adult_only hides a chore from CHILDREN, not from an assignee who must do it');
select is((select count(*) from public.task_instances
           where id = '99000000-0000-4000-8000-000000000101'), 0::bigint,
  'a service provider cannot see the chore assigned to the guest');
select is((select count(*) from public.task_templates), 1::bigint,
  'a service provider sees only the template behind their own work');
select lives_ok(
  $$ update public.task_instances
       set status = 'done', completed_at = now(),
           completed_by = 'aaaa0000-0000-4000-8000-000000000105'
     where id = '99000000-0000-4000-8000-000000000102' $$,
  'a service provider may complete the chore assigned to them');
reset role;

-- ===========================================================================
-- Access follows the LIVE assignment, and standing, not history
-- ===========================================================================
update public.task_assignments set status = 'reassigned'
  where id = '99000000-0000-4000-8000-000000000201';

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.guest'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.task_instances), 0::bigint,
  'once the assignment is retired the guest loses access to the occurrence');
select is((select count(*) from public.task_templates), 0::bigint,
  'and to its template');
select is((select count(*) from public.task_activity_log), 0::bigint,
  'and to its history');
select is((select count(*) from public.task_assignments), 1::bigint,
  'but they still see their own assignment row — that is their record, not somebody else''s');
reset role;

-- An expired guest holding a live assignment still gets nothing: the helper
-- re-verifies standing rather than trusting the assignment row.
insert into public.task_assignments
  (household_id, task_instance_id, assignee_profile_id, assignment_type, status)
values ('aaaa0000-0000-4000-8000-000000000001', '99000000-0000-4000-8000-000000000103',
        'aaaa0000-0000-4000-8000-000000000108', 'manual', 'proposed');

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.expired'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.task_instances), 0::bigint,
  'a guest whose access has expired sees nothing, even holding a live assignment');
select is((select count(*) from public.task_assignments), 0::bigint,
  'and no assignment row either — expiry fails closed before scope is even considered');
reset role;

select * from finish();
rollback;
