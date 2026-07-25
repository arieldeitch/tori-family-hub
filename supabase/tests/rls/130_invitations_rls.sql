-- WP4 behavioural RLS — household_invitations.
-- Owner-readable only, token_hash never exposed, no client writes at all.
begin;
select plan(16);

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

-- Owner ---------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_owner'), 'role', 'authenticated')::text, true);
set local role authenticated;

select is(current_user::text, 'authenticated', 'acting as authenticated');
select is((select count(*) from public.household_invitations), 2::bigint,
  'an owner lists the invitations of their own household');
select is((select count(*) from public.household_invitations
           where household_id = 'bbbb0000-0000-4000-8000-000000000001'), 0::bigint,
  'an owner cannot see invitations of another household');

select throws_ok($$ select token_hash from public.household_invitations $$,
  '42501', null, 'token_hash cannot be selected by any client');
select throws_ok($$ select created_by from public.household_invitations $$,
  '42501', null, 'invitation created_by is not exposed to clients');

select throws_ok($$ insert into public.household_invitations
                    (household_id, role, token_hash, expires_at)
                    values ('aaaa0000-0000-4000-8000-000000000001', 'adult',
                            '\xdead', now() + interval '1 day') $$,
  '42501', null, 'clients cannot create invitations — token entropy must be server-side');
select throws_ok($$ update public.household_invitations set revoked_at = now() $$,
  '42501', null, 'clients cannot revoke invitations directly — revocation is an RPC (WP4.5)');
select throws_ok($$ update public.household_invitations set used_count = 0 $$,
  '42501', null, 'clients cannot reset an invitation use counter');
select throws_ok($$ delete from public.household_invitations $$,
  '42501', null, 'clients cannot delete invitations — revocation preserves the record');

reset role;

-- Every other role sees nothing ---------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_adult'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is(current_user::text, 'authenticated', 'adult block acts as authenticated');
select is((select count(*) from public.household_invitations), 0::bigint,
  'an adult cannot list invitations in WP4 — owner only');
reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_guest'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.household_invitations), 0::bigint,
  'a guest cannot list invitations');
reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_sp'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.household_invitations), 0::bigint,
  'a service provider cannot list invitations');
reset role;

select set_config('request.jwt.claims', '', true);
set local role authenticated;
select is((select count(*) from public.household_invitations), 0::bigint,
  'an authenticated caller with no resolvable uid sees no invitations');
reset role;

set local role anon;
select is(current_user::text, 'anon', 'acting as the anonymous role');
select throws_ok($$ select count(*) from public.household_invitations $$,
  '42501', null, 'anon cannot read invitations at all');
reset role;

select * from finish();
rollback;
