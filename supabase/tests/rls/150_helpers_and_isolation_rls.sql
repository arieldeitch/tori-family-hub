-- WP4 behavioural RLS — helper behaviour and multi-household isolation.
begin;
select plan(18);

select set_config('tori.a_owner', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Owner'), true);
select set_config('tori.a_adult', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Adult'), true);
select set_config('tori.multi', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Multi'), true);
select set_config('tori.unrelated', (
  select id::text from auth.users where email = 'tori-wp4-unrelated@tori.invalid'), true);

select is(
  (select count(distinct household_id) from public.household_members
    where auth_user_id::text = current_setting('tori.multi')),
  2::bigint,
  'the multi-household fixture identity holds membership in two households');

-- Helper answers only for the caller ----------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_owner'), 'role', 'authenticated')::text, true);
set local role authenticated;

select is(current_user::text, 'authenticated', 'acting as authenticated');
select ok(private.is_active_household_member('aaaa0000-0000-4000-8000-000000000001'),
  'helper confirms standing in the caller''s own household');
select ok(not private.is_active_household_member('bbbb0000-0000-4000-8000-000000000001'),
  'helper denies standing in another household — no membership is leaked');
select ok(not private.is_active_household_member('00000000-0000-4000-8000-0000000000ff'),
  'a household that does not exist is indistinguishable from one the caller cannot see');
select ok(not private.is_active_household_member('dddd0000-0000-4000-8000-000000000001'),
  'a soft-deleted household grants no standing');

select ok(private.has_household_role('aaaa0000-0000-4000-8000-000000000001',
            array['owner']::public.household_role[]),
  'owner satisfies the owner role check');
select ok(not private.has_household_role('bbbb0000-0000-4000-8000-000000000001',
            array['owner']::public.household_role[]),
  'owner of A is not an owner of B');

select is(private.current_profile_id('aaaa0000-0000-4000-8000-000000000001'),
  'aaaa0000-0000-4000-8000-000000000101'::uuid,
  'current_profile_id returns the caller''s own profile in their household');
select is(private.current_profile_id('bbbb0000-0000-4000-8000-000000000001'), null,
  'current_profile_id returns NULL for a household the caller does not belong to');

reset role;

-- Role sensitivity -----------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_adult'), 'role', 'authenticated')::text, true);
set local role authenticated;
select ok(not private.has_household_role('aaaa0000-0000-4000-8000-000000000001',
            array['owner']::public.household_role[]),
  'an adult does not satisfy the owner role check');
select ok(private.has_household_role('aaaa0000-0000-4000-8000-000000000001',
            array['owner', 'adult']::public.household_role[]),
  'an adult satisfies an owner-or-adult check');
reset role;

-- No standing at all ---------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.unrelated'), 'role', 'authenticated')::text, true);
set local role authenticated;
select ok(not private.is_active_household_member('aaaa0000-0000-4000-8000-000000000001'),
  'an unrelated authenticated user has no standing anywhere');
reset role;

select set_config('request.jwt.claims', '', true);
set local role authenticated;
select ok(not private.is_active_household_member('aaaa0000-0000-4000-8000-000000000001'),
  'a NULL auth.uid() yields false — the helper fails closed');
reset role;

-- One Auth identity, two households -----------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.multi'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.households), 2::bigint,
  'one Auth identity may safely read both of its households');
select is((select count(*) from public.member_profiles
           where household_id = 'aaaa0000-0000-4000-8000-000000000001'), 9::bigint,
  'the multi-household user sees household A''s roster');
select is((select count(*) from public.member_profiles
           where household_id = 'bbbb0000-0000-4000-8000-000000000001'), 3::bigint,
  'and household B''s roster, each scoped independently');
reset role;

-- anon cannot reach the private schema at all --------------------------------
set local role anon;
select throws_ok(
  $$ select private.is_active_household_member('aaaa0000-0000-4000-8000-000000000001') $$,
  '42501', null, 'anon cannot execute the authorization helpers');
reset role;

select * from finish();
rollback;
