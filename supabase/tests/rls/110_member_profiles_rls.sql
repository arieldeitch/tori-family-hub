-- WP4 behavioural RLS — member_profiles.
-- Requires the Auth-backed fixtures. Transactional; rolls back.
begin;
select plan(24);

select set_config('tori.a_owner', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Owner'), true);
select set_config('tori.a_child', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Child'), true);
select set_config('tori.a_guest', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Guest'), true);
select set_config('tori.a_sp', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Service Provider'), true);

-- The child profile has no Auth identity at all (ADR-013).
select is(current_setting('tori.a_child', true), '',
  'the child profile has no auth_user_id — a child cannot authenticate');

-- Owner ---------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_owner'), 'role', 'authenticated')::text, true);
set local role authenticated;

select is(current_user::text, 'authenticated', 'acting as authenticated');
select is((select count(*) from public.member_profiles), 9::bigint,
  'owner sees the nine active, live profiles of household A — the deactivated profile is hidden');
select is((select count(*) from public.member_profiles
           where household_id = 'bbbb0000-0000-4000-8000-000000000001'), 0::bigint,
  'owner cannot read any profile of household B');
select is((select count(*) from public.member_profiles
           where display_name = 'A Inactive Profile'), 0::bigint,
  'a deactivated profile is invisible');

select throws_ok($$ select date_of_birth from public.member_profiles $$,
  '42501', null, 'date_of_birth is not readable by any client (D3)');
select throws_ok($$ update public.member_profiles set date_of_birth = '2015-01-01'
                    where id = 'aaaa0000-0000-4000-8000-000000000103' $$,
  '42501', null, 'date_of_birth is not writable by any client (D3)');
select throws_ok($$ update public.member_profiles set pin_auth_enabled = true
                    where id = 'aaaa0000-0000-4000-8000-000000000103' $$,
  '42501', null, 'pin_auth_enabled is not writable (ADR-025)');
select throws_ok($$ update public.member_profiles set is_child = false
                    where id = 'aaaa0000-0000-4000-8000-000000000103' $$,
  '42501', null, 'is_child is not writable — a child cannot be reclassified');
select throws_ok($$ update public.member_profiles set is_active = false
                    where id = 'aaaa0000-0000-4000-8000-000000000102' $$,
  '42501', null, 'is_active is not writable');
select throws_ok($$ update public.member_profiles
                    set household_id = 'bbbb0000-0000-4000-8000-000000000001'
                    where id = 'aaaa0000-0000-4000-8000-000000000102' $$,
  '42501', null, 'household_id is not writable — a profile cannot be re-homed');
select throws_ok($$ insert into public.member_profiles (household_id, display_name)
                    values ('aaaa0000-0000-4000-8000-000000000001', 'Rogue') $$,
  '42501', null, 'clients cannot INSERT profiles');
select throws_ok($$ delete from public.member_profiles
                    where id = 'aaaa0000-0000-4000-8000-000000000103' $$,
  '42501', null, 'clients cannot DELETE profiles');

-- Owner may curate another profile in their own household.
update public.member_profiles set display_name = 'Child renamed by owner'
  where id = 'aaaa0000-0000-4000-8000-000000000103';
-- ...but not one in another household.
update public.member_profiles set display_name = 'B hijacked'
  where id = 'bbbb0000-0000-4000-8000-000000000102';

reset role;

select is((select display_name from public.member_profiles
           where id = 'aaaa0000-0000-4000-8000-000000000103'), 'Child renamed by owner',
  'owner may update presentation fields of a profile in their household');
select is((select display_name from public.member_profiles
           where id = 'bbbb0000-0000-4000-8000-000000000102'), 'B Adult',
  'owner cannot touch a profile in another household');

-- Guest: own profile only ---------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_guest'), 'role', 'authenticated')::text, true);
set local role authenticated;

select is(current_user::text, 'authenticated', 'guest block acts as authenticated');
select is((select count(*) from public.member_profiles), 1::bigint,
  'a guest sees only their own profile and cannot enumerate the family');
select is((select display_name from public.member_profiles), 'A Guest',
  'the single visible profile is the guest''s own');

update public.member_profiles set display_name = 'Guest self-rename'
  where id = 'aaaa0000-0000-4000-8000-000000000104';
update public.member_profiles set display_name = 'Guest touched the owner'
  where id = 'aaaa0000-0000-4000-8000-000000000101';

reset role;

select is((select display_name from public.member_profiles
           where id = 'aaaa0000-0000-4000-8000-000000000104'), 'Guest self-rename',
  'a guest may update their own presentation fields');
select is((select display_name from public.member_profiles
           where id = 'aaaa0000-0000-4000-8000-000000000101'), 'A Owner',
  'a guest cannot update another profile even knowing its id');

-- Service provider: own profile only ---------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_sp'), 'role', 'authenticated')::text, true);
set local role authenticated;

select is((select count(*) from public.member_profiles), 1::bigint,
  'a service provider sees only their own profile');
select is((select display_name from public.member_profiles), 'A Service Provider',
  'the single visible profile is the service provider''s own');

update public.member_profiles set display_name = 'SP touched a child'
  where id = 'aaaa0000-0000-4000-8000-000000000103';

reset role;

select is((select display_name from public.member_profiles
           where id = 'aaaa0000-0000-4000-8000-000000000103'), 'Child renamed by owner',
  'a service provider cannot update another profile');

-- Anonymous -----------------------------------------------------------------
set local role anon;
select throws_ok($$ select count(*) from public.member_profiles $$,
  '42501', null, 'anon cannot read member_profiles at all');
reset role;

select * from finish();
rollback;
