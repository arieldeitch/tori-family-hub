-- WP4 behavioural RLS — households.
--
-- Requires the Auth-backed fixtures (bun run db:test:auth-suite). Runs inside a
-- transaction and rolls back, so it never mutates the fixture data.
--
-- CRITICAL: pgTAP connects as `postgres`, which has BYPASSRLS and owns these
-- tables, so every behavioural assertion must run under `set local role
-- authenticated` and must first prove which role it is acting as. Otherwise the
-- suite would pass no matter what the policies say.
--
-- Writes are executed as standalone statements and then verified by reading the
-- persisted value back as postgres — a denied write is silently zero rows under
-- RLS, so asserting the stored state is what actually proves the policy.
begin;
select plan(21);

-- Resolve fixture identities while still acting as postgres.
select set_config('tori.a_owner', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Owner'), true);
select set_config('tori.a_adult', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Adult'), true);
select set_config('tori.unrelated', (
  select id::text from auth.users where email = 'tori-wp4-unrelated@tori.invalid'), true);

select isnt(current_setting('tori.a_owner', true), null, 'fixture identity for A Owner resolved');

-- Household A owner --------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_owner'), 'role', 'authenticated')::text, true);
set local role authenticated;

select is(current_user::text, 'authenticated', 'acting as authenticated, not postgres');
select is((select count(*) from public.households), 1::bigint,
  'A owner sees exactly one household: their own live household A');
select is((select name from public.households), 'WP4 Household A',
  'the visible household is Household A');
select is((select count(*) from public.households
           where id = 'bbbb0000-0000-4000-8000-000000000001'), 0::bigint,
  'A owner cannot read Household B — zero rows, not an error, so B''s existence is never revealed');
select is((select count(*) from public.households
           where id = 'dddd0000-0000-4000-8000-000000000001'), 0::bigint,
  'a soft-deleted household is invisible even to its own active owner');

-- Protected columns and forbidden operations.
select throws_ok(
  $$ update public.households set created_by = null
     where id = 'aaaa0000-0000-4000-8000-000000000001' $$,
  '42501', null, 'households.created_by is not writable by authenticated');
select throws_ok(
  $$ update public.households set deleted_at = now()
     where id = 'aaaa0000-0000-4000-8000-000000000001' $$,
  '42501', null, 'a client cannot soft-delete a household directly');
select throws_ok(
  $$ select created_by from public.households $$,
  '42501', null, 'households.created_by is not readable by authenticated');
select throws_ok(
  $$ insert into public.households (name) values ('Rogue') $$,
  '42501', null, 'clients cannot INSERT households — direct owner creation is impossible');
select throws_ok(
  $$ delete from public.households where id = 'aaaa0000-0000-4000-8000-000000000001' $$,
  '42501', null, 'clients cannot DELETE households');

-- Permitted and denied writes, executed for real.
update public.households set name = 'Renamed by owner'
  where id = 'aaaa0000-0000-4000-8000-000000000001';
update public.households set name = 'Hijacked'
  where id = 'bbbb0000-0000-4000-8000-000000000001';
update public.households set name = 'Resurrected'
  where id = 'dddd0000-0000-4000-8000-000000000001';

reset role;

select is((select name from public.households
           where id = 'aaaa0000-0000-4000-8000-000000000001'), 'Renamed by owner',
  'owner can update the settings of their own live household');
select is((select name from public.households
           where id = 'bbbb0000-0000-4000-8000-000000000001'), 'WP4 Household B',
  'A owner cannot update Household B — the row is untouched');
select is((select name from public.households
           where id = 'dddd0000-0000-4000-8000-000000000001'), 'WP4 Household D (soft-deleted)',
  'a soft-deleted household cannot be updated');

-- Household A adult --------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_adult'), 'role', 'authenticated')::text, true);
set local role authenticated;

select is(current_user::text, 'authenticated', 'adult block acts as authenticated');
select is((select count(*) from public.households), 1::bigint,
  'A adult reads their own household');

update public.households set name = 'Adult rename attempt'
  where id = 'aaaa0000-0000-4000-8000-000000000001';

reset role;

select is((select name from public.households
           where id = 'aaaa0000-0000-4000-8000-000000000001'), 'Renamed by owner',
  'an adult cannot update household settings — owner only');

-- Unrelated authenticated user, missing uid, and true anonymous ------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.unrelated'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.households), 0::bigint,
  'an authenticated user with no membership anywhere sees no households');
reset role;

select set_config('request.jwt.claims', '', true);
set local role authenticated;
select is((select count(*) from public.households), 0::bigint,
  'authenticated with no resolvable auth.uid() sees nothing — fails closed');
reset role;

set local role anon;
select is(current_user::text, 'anon', 'acting as the anonymous role');
select throws_ok(
  $$ select count(*) from public.households $$,
  '42501', null, 'anon is denied at the privilege layer, before RLS is even consulted');
reset role;

select * from finish();
rollback;
