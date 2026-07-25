-- WP4 behavioural RLS — household_members.
-- The authority table: readable in a scoped way, never writable by a client.
begin;
select plan(20);

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
select set_config('tori.a_sp', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Service Provider'), true);

-- Owner: full roster of their own household ---------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_owner'), 'role', 'authenticated')::text, true);
set local role authenticated;

select is(current_user::text, 'authenticated', 'acting as authenticated');
select is((select count(*) from public.household_members), 10::bigint,
  'owner reads the ten membership rows of household A');
select is((select count(*) from public.household_members
           where household_id = 'bbbb0000-0000-4000-8000-000000000001'), 0::bigint,
  'owner cannot read memberships of household B');

-- auth_user_id is never exposed.
select throws_ok($$ select auth_user_id from public.household_members $$,
  '42501', null, 'auth_user_id is not readable by any client');

-- The table is entirely read-only for clients.
select throws_ok($$ insert into public.household_members
                    (household_id, profile_id, role, status)
                    values ('aaaa0000-0000-4000-8000-000000000001',
                            'aaaa0000-0000-4000-8000-000000000101', 'owner', 'active') $$,
  '42501', null, 'no client can INSERT a membership — self-assignment is impossible');
select throws_ok($$ update public.household_members set role = 'owner' $$,
  '42501', null, 'role cannot be changed — no UPDATE privilege exists');
select throws_ok($$ update public.household_members set status = 'active' $$,
  '42501', null, 'status cannot be changed — suspend/revoke are RPC-only');
select throws_ok($$ update public.household_members
                    set auth_user_id = '00000000-0000-4000-8000-000000000000' $$,
  '42501', null, 'auth_user_id cannot be changed — identity cannot be spoofed');
select throws_ok($$ update public.household_members
                    set profile_id = 'aaaa0000-0000-4000-8000-000000000102' $$,
  '42501', null, 'profile_id cannot be changed');
select throws_ok($$ update public.household_members
                    set household_id = 'bbbb0000-0000-4000-8000-000000000001' $$,
  '42501', null, 'household_id cannot be changed');
select throws_ok($$ delete from public.household_members $$,
  '42501', null, 'no client can DELETE a membership — removal preserves audit history');

reset role;

-- Adult: also sees the roster ------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_adult'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.household_members), 10::bigint,
  'an adult reads the membership rows of their household');
reset role;

-- Child, guest and service provider: own row only ---------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_guest'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is(current_user::text, 'authenticated', 'guest block acts as authenticated');
select is((select count(*) from public.household_members), 1::bigint,
  'a guest reads only their own membership row');
select is((select role::text from public.household_members), 'guest',
  'the single visible membership is the guest''s own');
reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_sp'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.household_members), 1::bigint,
  'a service provider reads only their own membership row');
select is((select role::text from public.household_members), 'service_provider',
  'the single visible membership is the service provider''s own');
reset role;

-- Recursion check ------------------------------------------------------------
-- A policy on household_members that consulted household_members directly would
-- recurse infinitely. Reading the roster proves the private helpers break it.
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_owner'), 'role', 'authenticated')::text, true);
set local role authenticated;
select lives_ok($$ select count(*) from public.household_members $$,
  'reading household_members does not recurse');
select lives_ok($$ select m.id from public.household_members m
                   join public.member_profiles p on p.id = m.profile_id $$,
  'joining memberships to profiles does not recurse across policies');
reset role;

-- Anonymous ------------------------------------------------------------------
set local role anon;
select throws_ok($$ select count(*) from public.household_members $$,
  '42501', null, 'anon cannot read household_members at all');
reset role;

select * from finish();
rollback;
