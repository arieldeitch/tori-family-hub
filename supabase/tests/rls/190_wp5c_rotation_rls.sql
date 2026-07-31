-- WP5C behavioural RLS ג€” the rotation is visible to the people it decides for,
-- writable only by adults, and impossible to allocate twice.
--
-- Every assertion runs as the `authenticated` role with a real fixture
-- auth.uid(), because pgTAP otherwise connects as a BYPASSRLS owner.
--
-- As in 180, the transaction lends the fixture child profile the otherwise-unused
-- `unrelated` identity, because the pilot child has no Auth account (ADR-013)
-- while the database supports one. Domain rows only, rolled back.
begin;
select plan(41);

update public.household_members
   set auth_user_id = (select id from auth.users where email = 'tori-wp4-unrelated@tori.invalid')
 where profile_id = 'aaaa0000-0000-4000-8000-000000000103';

-- Two chores in household A: one ordinary, one adult-only. One in household B.
insert into public.task_templates (id, household_id, title, adult_only) values
  ('a1000000-0000-4000-8000-000000000001', 'aaaa0000-0000-4000-8000-000000000001', 'Unload dishwasher', false),
  ('a1000000-0000-4000-8000-000000000002', 'aaaa0000-0000-4000-8000-000000000001', 'Household paperwork', true),
  -- A third chore with NO rule yet, so the adult can create one without
  -- colliding with rotation_rules_one_live_per_template. Adult-only, so it does
  -- not change what the child is expected to see further down.
  ('a1000000-0000-4000-8000-000000000003', 'aaaa0000-0000-4000-8000-000000000001', 'Adult admin chore', true),
  ('b1000000-0000-4000-8000-000000000001', 'bbbb0000-0000-4000-8000-000000000001', 'B chore', false);

insert into public.task_instances
  (id, household_id, template_id, occurrence_date, title_snapshot) values
  ('a2000000-0000-4000-8000-000000000001', 'aaaa0000-0000-4000-8000-000000000001',
   'a1000000-0000-4000-8000-000000000001', date '2026-08-03', 'Unload dishwasher'),
  ('a2000000-0000-4000-8000-000000000002', 'aaaa0000-0000-4000-8000-000000000001',
   'a1000000-0000-4000-8000-000000000002', date '2026-08-03', 'Household paperwork'),
  ('b2000000-0000-4000-8000-000000000001', 'bbbb0000-0000-4000-8000-000000000001',
   'b1000000-0000-4000-8000-000000000001', date '2026-08-03', 'B chore'),
  -- A later occurrence with no decision yet, used below to record an
  -- "unassigned" outcome. Created here as owner because `id` is deliberately
  -- absent from the client INSERT grant.
  ('a2000000-0000-4000-8000-000000000009', 'aaaa0000-0000-4000-8000-000000000001',
   'a1000000-0000-4000-8000-000000000001', date '2026-08-10', 'Unload dishwasher');

insert into public.rotation_rules (id, household_id, task_template_id, strategy) values
  ('a3000000-0000-4000-8000-000000000001', 'aaaa0000-0000-4000-8000-000000000001',
   'a1000000-0000-4000-8000-000000000001', 'fixed_sequence'),
  ('a3000000-0000-4000-8000-000000000002', 'aaaa0000-0000-4000-8000-000000000001',
   'a1000000-0000-4000-8000-000000000002', 'fixed_sequence'),
  ('b3000000-0000-4000-8000-000000000001', 'bbbb0000-0000-4000-8000-000000000001',
   'b1000000-0000-4000-8000-000000000001', 'fixed_sequence');

-- The two children, in canonical order, on the ordinary chore.
insert into public.rotation_members
  (household_id, rotation_rule_id, member_profile_id, position) values
  ('aaaa0000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001',
   'aaaa0000-0000-4000-8000-000000000103', 0),
  ('aaaa0000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001',
   'aaaa0000-0000-4000-8000-000000000104', 1);

-- The guest is the live assignee of the ordinary occurrence.
insert into public.task_assignments
  (household_id, task_instance_id, assignee_profile_id, assignment_type, status) values
  ('aaaa0000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
   'aaaa0000-0000-4000-8000-000000000104', 'manual', 'proposed');

insert into public.rotation_assignment_log
  (household_id, rotation_rule_id, task_instance_id, selected_profile_id,
   reason_code, algorithm_version, human_explanation) values
  ('aaaa0000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001',
   'a2000000-0000-4000-8000-000000000001', 'aaaa0000-0000-4000-8000-000000000103',
   'NEXT_IN_SEQUENCE', 'shifts.v1', '׳”׳‘׳ ׳‘׳×׳•׳¨ ׳‘׳¨׳•׳˜׳¦׳™׳”.'),
  ('aaaa0000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000002',
   'a2000000-0000-4000-8000-000000000002', 'aaaa0000-0000-4000-8000-000000000101',
   'NEXT_IN_SEQUENCE', 'shifts.v1', '׳”׳‘׳ ׳‘׳×׳•׳¨ ׳‘׳¨׳•׳˜׳¦׳™׳”.');

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
select set_config('tori.suspended', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Suspended'), true);
select set_config('tori.b_owner', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'B Owner'), true);

-- ===========================================================================
-- Adult ג€” the whole household
-- ===========================================================================
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.adult'), 'role', 'authenticated')::text, true);
set local role authenticated;

select is(current_user::text, 'authenticated', 'acting as authenticated, not a BYPASSRLS owner');
select is((select count(*) from public.rotation_rules), 2::bigint,
  'an adult sees both rotation rules of their household, adult-only included');
select is((select count(*) from public.rotation_rules
           where household_id = 'bbbb0000-0000-4000-8000-000000000001'), 0::bigint,
  'another household''s rotation rules are invisible');
select is((select count(*) from public.rotation_members), 2::bigint,
  'an adult sees the full participant order');
select is((select count(*) from public.rotation_assignment_log), 2::bigint,
  'an adult sees every allocation decision');

select lives_ok(
  $$ insert into public.rotation_rules (household_id, task_template_id, strategy)
     values ('aaaa0000-0000-4000-8000-000000000001',
             'a1000000-0000-4000-8000-000000000003', 'manual') $$,
  'an adult may define a rotation rule for a chore that has none');

-- One live rule per chore: a second live rule would give it two competing cursors.
select throws_ok(
  $$ insert into public.rotation_rules (household_id, task_template_id, strategy)
     values ('aaaa0000-0000-4000-8000-000000000001',
             'a1000000-0000-4000-8000-000000000001', 'manual') $$,
  '23505', null,
  'a second live rule for the same chore is refused ג€” "whose turn is it" stays unambiguous');

select throws_ok(
  $$ insert into public.rotation_rules (household_id, task_template_id, strategy)
     values ('bbbb0000-0000-4000-8000-000000000001',
             'b1000000-0000-4000-8000-000000000001', 'manual') $$,
  '42501', null, 'an adult cannot define a rule in a household they do not belong to');

select lives_ok(
  $$ update public.rotation_rules set avoid_consecutive = true
       where id = 'a3000000-0000-4000-8000-000000000001' $$,
  'an adult may tune the rotation');
select lives_ok(
  $$ insert into public.rotation_members
       (household_id, rotation_rule_id, member_profile_id, position)
     values ('aaaa0000-0000-4000-8000-000000000001',
             'a3000000-0000-4000-8000-000000000002',
             'aaaa0000-0000-4000-8000-000000000101', 0) $$,
  'an adult may add a participant');
select lives_ok(
  $$ delete from public.rotation_members
       where rotation_rule_id = 'a3000000-0000-4000-8000-000000000002' $$,
  'an adult may remove a participant ג€” the forward list is editable');

-- The cursor is never client-writable, for anybody.
select throws_ok(
  $$ update public.rotation_rules
       set cursor_profile_id = 'aaaa0000-0000-4000-8000-000000000103'
     where id = 'a3000000-0000-4000-8000-000000000001' $$,
  '42501', null,
  'not even an adult may move the cursor from a client ג€” that would be a hidden decision');

-- The allocation log is write-once.
select throws_ok(
  $$ update public.rotation_assignment_log set reason_code = 'FORGED'
       where rotation_rule_id = 'a3000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'authenticated holds no UPDATE on the allocation log');
select throws_ok(
  $$ delete from public.rotation_assignment_log
       where rotation_rule_id = 'a3000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'authenticated holds no DELETE on the allocation log');
select throws_ok(
  $$ delete from public.rotation_rules where id = 'a3000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'a rotation rule cannot be hard-deleted ג€” it soft-deletes');

-- IDEMPOTENCY: the same (rule, occurrence) can only ever be decided once.
select throws_ok(
  $$ insert into public.rotation_assignment_log
       (household_id, rotation_rule_id, task_instance_id, reason_code, algorithm_version)
     values ('aaaa0000-0000-4000-8000-000000000001',
             'a3000000-0000-4000-8000-000000000001',
             'a2000000-0000-4000-8000-000000000001', 'NEXT_IN_SEQUENCE', 'shifts.v1') $$,
  '23505', null,
  'a repeated allocation for the same occurrence collides instead of deciding twice');

-- An unassigned outcome is a real, recordable decision.
select lives_ok(
  $$ insert into public.rotation_assignment_log
       (household_id, rotation_rule_id, task_instance_id, selected_profile_id,
        reason_code, algorithm_version, human_explanation)
     values ('aaaa0000-0000-4000-8000-000000000001',
             'a3000000-0000-4000-8000-000000000001',
             'a2000000-0000-4000-8000-000000000009', null,
             'NO_ELIGIBLE_PARTICIPANT', 'shifts.v1', '׳׳™׳ ׳׳©׳×׳×׳£ ׳–׳›׳׳™ ׳•׳–׳׳™׳ ׳׳׳•׳₪׳¢ ׳”׳–׳”.') $$,
  'nobody-eligible is recorded as an explained decision, not as a missing row');
reset role;

-- ===========================================================================
-- Child ג€” sees how their week is decided, changes nothing
-- ===========================================================================
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.child'), 'role', 'authenticated')::text, true);
set local role authenticated;

select is((select count(*) from public.rotation_rules), 1::bigint,
  'a child sees the rotation of the ordinary chore, and not the adult-only one');
select is((select count(*) from public.rotation_rules
           where id = 'a3000000-0000-4000-8000-000000000002'), 0::bigint,
  'the adult-only chore''s rotation is hidden from the child');
select is((select count(*) from public.rotation_members), 2::bigint,
  'a child sees the participant ORDER ג€” this is what makes "whose turn is next" not a mystery');
select is((select count(*) from public.rotation_assignment_log
           where rotation_rule_id = 'a3000000-0000-4000-8000-000000000001'), 2::bigint,
  'a child can read WHY the app chose somebody ג€” the rotation is explainable, not just deterministic');
select is((select count(*) from public.rotation_assignment_log
           where rotation_rule_id = 'a3000000-0000-4000-8000-000000000002'), 0::bigint,
  'but not the history of an adult-only chore');

select throws_ok(
  $$ insert into public.rotation_rules (household_id, task_template_id, strategy)
     values ('aaaa0000-0000-4000-8000-000000000001',
             'a1000000-0000-4000-8000-000000000001', 'manual') $$,
  '42501', null, 'a child cannot write the rule that decides their own turn');
select throws_ok(
  $$ insert into public.rotation_members
       (household_id, rotation_rule_id, member_profile_id, position)
     values ('aaaa0000-0000-4000-8000-000000000001',
             'a3000000-0000-4000-8000-000000000001',
             'aaaa0000-0000-4000-8000-000000000101', 7) $$,
  '42501', null, 'a child cannot add themselves or anybody else to a rotation');
select throws_ok(
  $$ insert into public.rotation_assignment_log
       (household_id, rotation_rule_id, task_instance_id, reason_code, algorithm_version)
     values ('aaaa0000-0000-4000-8000-000000000001',
             'a3000000-0000-4000-8000-000000000001',
             'a2000000-0000-4000-8000-000000000009', 'FORGED', 'shifts.v1') $$,
  '42501', null, 'a child cannot manufacture an allocation that hands a chore to a sibling');

update public.rotation_members set position = 99
  where rotation_rule_id = 'a3000000-0000-4000-8000-000000000001';
reset role;
select is((select count(*) from public.rotation_members where position = 99), 0::bigint,
  'a child reordering the rotation matches zero rows and changes nothing');

-- ===========================================================================
-- Guest ג€” only the rotation of work actually given to them
-- ===========================================================================
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.guest'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.rotation_rules), 1::bigint,
  'an assigned guest sees the rule behind their own work, and no other');
select is((select count(*) from public.rotation_rules
           where id = 'a3000000-0000-4000-8000-000000000002'), 0::bigint,
  'and nothing about a rotation they are not part of');
select throws_ok(
  $$ insert into public.rotation_rules (household_id, task_template_id, strategy)
     values ('aaaa0000-0000-4000-8000-000000000001',
             'a1000000-0000-4000-8000-000000000001', 'manual') $$,
  '42501', null, 'a guest cannot define a rotation');
reset role;

-- ===========================================================================
-- Service provider ג€” assigned nothing here, so sees nothing
-- ===========================================================================
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.service'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.rotation_rules), 0::bigint,
  'an unassigned service provider sees no rotation at all');
select is((select count(*) from public.rotation_assignment_log), 0::bigint,
  'and no allocation history');
reset role;

-- ===========================================================================
-- Household isolation, membership state, anon
-- ===========================================================================
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.b_owner'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.rotation_rules), 1::bigint,
  'household B''s owner sees exactly their own rule');
select is((select count(*) from public.rotation_rules
           where household_id = 'aaaa0000-0000-4000-8000-000000000001'), 0::bigint,
  'and none of household A''s');
select is((select count(*) from public.rotation_assignment_log), 0::bigint,
  'and none of household A''s allocation history');
reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.suspended'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.rotation_rules), 0::bigint,
  'a suspended member sees no rotation');
select throws_ok(
  $$ insert into public.rotation_rules (household_id, task_template_id, strategy)
     values ('aaaa0000-0000-4000-8000-000000000001',
             'a1000000-0000-4000-8000-000000000001', 'manual') $$,
  '42501', null, 'a suspended member cannot define a rotation');
reset role;

select set_config('request.jwt.claims', '', true);
set local role authenticated;
select is((select count(*) from public.rotation_rules), 0::bigint,
  'a NULL auth.uid() sees no rotation ג€” the policies fail closed');
select is((select count(*) from public.rotation_assignment_log), 0::bigint,
  'a NULL auth.uid() sees no allocation history');
reset role;

set local role anon;
select throws_ok($$ select count(*) from public.rotation_rules $$,
  '42501', null, 'anon cannot read rotation_rules');
select throws_ok($$ select count(*) from public.rotation_members $$,
  '42501', null, 'anon cannot read rotation_members');
select throws_ok($$ select count(*) from public.rotation_assignment_log $$,
  '42501', null, 'anon cannot read the allocation log');
reset role;

select * from finish();
rollback;
