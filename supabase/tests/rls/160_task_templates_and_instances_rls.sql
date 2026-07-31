-- WP5B behavioural RLS — task_templates and task_instances.
--
-- Positive AND negative: every assertion is made while acting as the
-- `authenticated` role with a real fixture auth.uid(), because pgTAP otherwise
-- connects as a BYPASSRLS owner and would prove nothing.
--
-- The fixture children have no Auth identity at all (ADR-013/ADR-035), so the
-- non-privileged authenticated caller here is the guest or the service
-- provider. That is the correct shape: a child never signs in, and an adult
-- acting on a child's behalf is asserted in 170.
--
-- Soft-delete visibility is deliberately role-scoped. Postgres applies SELECT
-- policies to the NEW row of an UPDATE, so a policy hiding deleted rows from
-- everyone would make soft-deletion itself impossible. Owners and adults keep
-- seeing deleted rows — that is the trash view and the ADR-007 restore path.
begin;
select plan(55);

-- Row fixtures, created as owner and rolled back with the transaction --------
insert into public.task_templates (id, household_id, title) values
  ('e0000000-0000-4000-8000-00000000a001', 'aaaa0000-0000-4000-8000-000000000001', 'A: unload dishwasher'),
  ('e0000000-0000-4000-8000-00000000a002', 'aaaa0000-0000-4000-8000-000000000001', 'A: retired chore'),
  ('e0000000-0000-4000-8000-00000000b001', 'bbbb0000-0000-4000-8000-000000000001', 'B: private chore');

update public.task_templates set deleted_at = now()
  where id = 'e0000000-0000-4000-8000-00000000a002';

insert into public.task_instances
  (id, household_id, template_id, occurrence_date, title_snapshot) values
  ('e0000000-0000-4000-8000-00000000c001', 'aaaa0000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-00000000a001', date '2026-08-03', 'A: unload dishwasher'),
  ('e0000000-0000-4000-8000-00000000c002', 'aaaa0000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-00000000a001', date '2026-08-04', 'A: unload dishwasher'),
  ('e0000000-0000-4000-8000-00000000d001', 'bbbb0000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-00000000b001', date '2026-08-03', 'B: private chore');

update public.task_instances set deleted_at = now()
  where id = 'e0000000-0000-4000-8000-00000000c002';

-- Fixture identities ---------------------------------------------------------
select set_config('tori.a_owner', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Owner'), true);
select set_config('tori.a_adult', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Adult'), true);
select set_config('tori.a_guest', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Guest'), true);
select set_config('tori.a_service', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Service Provider'), true);
select set_config('tori.a_suspended', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Suspended'), true);
select set_config('tori.a_revoked', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Revoked'), true);
select set_config('tori.a_expired', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Expired Guest'), true);
select set_config('tori.a_inactive', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Inactive Profile'), true);
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

select is((select count(*) from public.task_templates), 2::bigint,
  'an adult sees their own household''s templates, live and soft-deleted');
select is((select count(*) from public.task_templates where deleted_at is null), 1::bigint,
  'exactly one of them is live; the other is in the trash');
select is((select count(*) from public.task_templates
           where household_id = 'bbbb0000-0000-4000-8000-000000000001'), 0::bigint,
  'another household''s templates are invisible, not merely filtered');

select is((select count(*) from public.task_instances), 2::bigint,
  'an adult sees their own household''s occurrences, live and soft-deleted');
select is((select count(*) from public.task_instances where deleted_at is null), 1::bigint,
  'exactly one occurrence is live');
select is((select count(*) from public.task_instances
           where household_id = 'bbbb0000-0000-4000-8000-000000000001'), 0::bigint,
  'another household''s occurrences are invisible');

-- Adults define chores.
select lives_ok(
  $$ insert into public.task_templates (household_id, title)
     values ('aaaa0000-0000-4000-8000-000000000001', 'A: new chore') $$,
  'an adult may define a chore in their own household');
select throws_ok(
  $$ insert into public.task_templates (household_id, title)
     values ('bbbb0000-0000-4000-8000-000000000001', 'A adult reaching into B') $$,
  '42501', null,
  'an adult cannot create a template in a household they do not belong to');

-- A client-supplied household_id never grants standing: the WITH CHECK derives
-- authority from auth.uid(), so naming another household is simply refused.
select throws_ok(
  $$ insert into public.task_instances
       (household_id, template_id, occurrence_date, title_snapshot)
     values ('bbbb0000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-00000000b001',
             date '2026-08-06', 'Injected') $$,
  '42501', null, 'naming another household in the payload does not grant access to it');

-- Editing, soft-deleting and restoring a template.
update public.task_templates set title = 'A: unload dishwasher (edited)'
  where id = 'e0000000-0000-4000-8000-00000000a001';
select is((select title from public.task_templates
           where id = 'e0000000-0000-4000-8000-00000000a001'),
  'A: unload dishwasher (edited)', 'an adult may edit a template in their own household');

select lives_ok(
  $$ update public.task_templates set deleted_at = now()
       where id = 'e0000000-0000-4000-8000-00000000a001' $$,
  'an adult may soft-delete a template');
select is((select count(*) from public.task_templates
           where id = 'e0000000-0000-4000-8000-00000000a001' and deleted_at is not null), 1::bigint,
  'the soft-deleted template stays visible to the adult — this is the trash view');

-- Restoring is reachable precisely because the row is still visible.
select lives_ok(
  $$ update public.task_templates set deleted_at = null
       where id = 'e0000000-0000-4000-8000-00000000a001' $$,
  'an adult may restore a soft-deleted template within the ADR-007 window');
select is((select count(*) from public.task_templates
           where id = 'e0000000-0000-4000-8000-00000000a001' and deleted_at is null), 1::bigint,
  'the restored template is live again');

-- An adult cannot reach into household B even for an UPDATE: the row is simply
-- not visible, so the statement matches nothing rather than raising.
update public.task_templates set title = 'hijacked'
  where id = 'e0000000-0000-4000-8000-00000000b001';
reset role;
select is((select title from public.task_templates
           where id = 'e0000000-0000-4000-8000-00000000b001'), 'B: private chore',
  'an UPDATE aimed at another household matches zero rows and changes nothing');

-- Completing a chore -----------------------------------------------------------
set local role authenticated;
select lives_ok(
  $$ update public.task_instances
       set status = 'done', completed_at = now(),
           completed_by = 'aaaa0000-0000-4000-8000-000000000103'
     where id = 'e0000000-0000-4000-8000-00000000c001' $$,
  'a member may complete an occurrence in their own household');
select is((select status::text from public.task_instances
           where id = 'e0000000-0000-4000-8000-00000000c001'), 'done',
  'the completion persisted');

-- Attribution: an adult may record a CHILD as the completer, which is the
-- pilot's whole point (ADR-035). The child has no login of their own.
select is((select completed_by from public.task_instances
           where id = 'e0000000-0000-4000-8000-00000000c001'),
  'aaaa0000-0000-4000-8000-000000000103'::uuid,
  'an adult may record the child profile as the completer');

select lives_ok(
  $$ update public.task_instances
       set status = 'pending', completed_at = null, completed_by = null
     where id = 'e0000000-0000-4000-8000-00000000c001' $$,
  'a member may reopen an occurrence — every transition is logged, not blocked');

select lives_ok(
  $$ update public.task_instances set deleted_at = now()
       where id = 'e0000000-0000-4000-8000-00000000c001' $$,
  'an adult may soft-delete an occurrence');
select lives_ok(
  $$ update public.task_instances set deleted_at = null
       where id = 'e0000000-0000-4000-8000-00000000c001' $$,
  'and restore it');

-- Snapshots stay immutable even for a permitted caller.
select throws_ok(
  $$ update public.task_instances set title_snapshot = 'rewritten'
     where id = 'e0000000-0000-4000-8000-00000000c001' $$,
  '42501', null,
  'title_snapshot is not even granted to authenticated — history cannot be rewritten by a client');

-- Forgeable columns are ungranted ------------------------------------------------
select throws_ok(
  $$ update public.task_instances set created_by = (select auth.uid())
     where id = 'e0000000-0000-4000-8000-00000000c001' $$,
  '42501', null, 'a client cannot forge authorship on an occurrence');
select throws_ok(
  $$ insert into public.task_instances
       (household_id, occurrence_date, title_snapshot, occurrence_key)
     values ('aaaa0000-0000-4000-8000-000000000001', date '2026-08-07', 'Forged', 'nope') $$,
  '428C9', null,
  'a client cannot supply an occurrence_key — the generated column refuses it before privileges are even consulted');

-- No client may ever hard-delete.
select throws_ok(
  $$ delete from public.task_instances where id = 'e0000000-0000-4000-8000-00000000c001' $$,
  '42501', null, 'authenticated holds no DELETE on task_instances');
select throws_ok(
  $$ delete from public.task_templates where id = 'e0000000-0000-4000-8000-00000000a001' $$,
  '42501', null, 'authenticated holds no DELETE on task_templates');
reset role;

-- An owner has the same authority as an adult ------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_owner'), 'role', 'authenticated')::text, true);
set local role authenticated;
select lives_ok(
  $$ insert into public.task_templates (household_id, title)
     values ('aaaa0000-0000-4000-8000-000000000001', 'A: owner chore') $$,
  'an owner may also define a chore');
reset role;

-- A non-adult member: reads live rows, defines nothing, removes nothing ----------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_guest'), 'role', 'authenticated')::text, true);
set local role authenticated;
select cmp_ok((select count(*) from public.task_templates), '>', 0::bigint,
  'an active non-adult member reads the household chore list');
select is((select count(*) from public.task_templates
           where id = 'e0000000-0000-4000-8000-00000000a002'), 0::bigint,
  'a non-adult member never sees the trash — soft-deleted templates are hidden from them');
select is((select count(*) from public.task_instances
           where id = 'e0000000-0000-4000-8000-00000000c002'), 0::bigint,
  'a non-adult member never sees a soft-deleted occurrence');
select throws_ok(
  $$ insert into public.task_templates (household_id, title)
     values ('aaaa0000-0000-4000-8000-000000000001', 'guest invents a chore') $$,
  '42501', null, 'a non-adult member cannot define a chore');

update public.task_templates set title = 'guest edit'
  where id = 'e0000000-0000-4000-8000-00000000a001';
reset role;
select isnt((select title from public.task_templates
             where id = 'e0000000-0000-4000-8000-00000000a001'), 'guest edit',
  'a non-adult member cannot edit a template — the UPDATE matches zero rows');

-- Completion, by contrast, is open to any active member: the pilot family view
-- lets whoever is at the sink mark the chore done.
set local role authenticated;
select lives_ok(
  $$ insert into public.task_instances (household_id, occurrence_date, title_snapshot, source)
     values ('aaaa0000-0000-4000-8000-000000000001', date '2026-08-08', 'Quick add', 'quick_add') $$,
  'any active member may add an occurrence in their own household');
select lives_ok(
  $$ update public.task_instances
       set status = 'done', completed_at = now(),
           completed_by = 'aaaa0000-0000-4000-8000-000000000103'
     where id = 'e0000000-0000-4000-8000-00000000c001' $$,
  'any active member may complete an occurrence in their own household');
select throws_ok(
  $$ update public.task_instances set deleted_at = now()
       where id = 'e0000000-0000-4000-8000-00000000c001' $$,
  '42501', null,
  'a non-adult member cannot remove a chore from the week — soft-delete is an owner/adult act');
reset role;

-- The service provider currently has the same task visibility as any member.
-- Pinned deliberately: task reads use is_active_household_member, which is
-- role-agnostic, unlike the WP4 member_profiles policy which narrows guests and
-- service providers to their own row. Recorded as an open question for WP5D.
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_service'), 'role', 'authenticated')::text, true);
set local role authenticated;
select cmp_ok((select count(*) from public.task_templates), '>', 0::bigint,
  'a service provider currently reads the household chore list (open question for WP5D)');
select throws_ok(
  $$ insert into public.task_templates (household_id, title)
     values ('aaaa0000-0000-4000-8000-000000000001', 'service provider invents a chore') $$,
  '42501', null, 'a service provider cannot define a chore');
reset role;

-- Household B is sealed off in the other direction too -------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.b_owner'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.task_templates
           where household_id = 'aaaa0000-0000-4000-8000-000000000001'), 0::bigint,
  'household B''s owner sees none of household A''s templates');
select is((select count(*) from public.task_instances
           where household_id = 'aaaa0000-0000-4000-8000-000000000001'), 0::bigint,
  'household B''s owner sees none of household A''s occurrences');
select is((select count(*) from public.task_instances), 1::bigint,
  'household B''s owner sees exactly their own occurrence');
reset role;

-- Membership state fails closed -------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_suspended'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.task_templates), 0::bigint,
  'a suspended member sees no templates');
select is((select count(*) from public.task_instances), 0::bigint,
  'a suspended member sees no occurrences');
select throws_ok(
  $$ insert into public.task_instances (household_id, occurrence_date, title_snapshot)
     values ('aaaa0000-0000-4000-8000-000000000001', date '2026-08-09', 'Suspended write') $$,
  '42501', null, 'a suspended member cannot create an occurrence');
reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_revoked'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.task_instances), 0::bigint,
  'a revoked member sees no occurrences');
reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_expired'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.task_instances), 0::bigint,
  'a member whose temporary access has expired sees no occurrences');
reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_inactive'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.task_instances), 0::bigint,
  'an active membership with a deactivated profile sees no occurrences');
reset role;

-- No standing at all --------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.unrelated'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.task_templates), 0::bigint,
  'an unrelated authenticated user sees no templates anywhere');
select is((select count(*) from public.task_instances), 0::bigint,
  'an unrelated authenticated user sees no occurrences anywhere');
select throws_ok(
  $$ insert into public.task_templates (household_id, title)
     values ('aaaa0000-0000-4000-8000-000000000001', 'stranger chore') $$,
  '42501', null, 'an unrelated authenticated user cannot write into someone else''s household');
reset role;

-- A missing JWT fails closed rather than opening up.
select set_config('request.jwt.claims', '', true);
set local role authenticated;
select is((select count(*) from public.task_templates), 0::bigint,
  'a NULL auth.uid() sees no templates — the policies fail closed');
select is((select count(*) from public.task_instances), 0::bigint,
  'a NULL auth.uid() sees no occurrences');
reset role;

-- anon holds nothing at all --------------------------------------------------------
set local role anon;
select throws_ok($$ select count(*) from public.task_templates $$,
  '42501', null, 'anon cannot read task_templates');
select throws_ok($$ select count(*) from public.task_instances $$,
  '42501', null, 'anon cannot read task_instances');
select throws_ok(
  $$ insert into public.task_instances (household_id, occurrence_date, title_snapshot)
     values ('aaaa0000-0000-4000-8000-000000000001', date '2026-08-10', 'anon write') $$,
  '42501', null, 'anon cannot write an occurrence');
reset role;

select * from finish();
rollback;
