-- WP3 — updated_at maintenance, household_id immutability and the expected
-- indexes.
begin;
select plan(12);

insert into public.households (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Household A'),
  ('22222222-2222-2222-2222-222222222222', 'Household B');

insert into public.member_profiles (id, household_id, display_name) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Parent A');

insert into public.household_members (id, household_id, profile_id, role, status) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner', 'active');

-- updated_at is maintained on UPDATE. The trigger sets it to now(), which is
-- fixed for the whole transaction, so compare against a value forced into the
-- past rather than against the transaction clock.
update public.households
   set updated_at = now() - interval '1 hour'
 where id = '11111111-1111-1111-1111-111111111111';

update public.households
   set name = 'Household A renamed'
 where id = '11111111-1111-1111-1111-111111111111';

select ok(
  (select updated_at from public.households where id = '11111111-1111-1111-1111-111111111111') = now(),
  'households.updated_at is refreshed by the trigger on UPDATE'
);

update public.member_profiles set updated_at = now() - interval '1 hour'
 where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
update public.member_profiles set display_name = 'Parent A renamed'
 where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select ok(
  (select updated_at from public.member_profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = now(),
  'member_profiles.updated_at is refreshed by the trigger on UPDATE'
);

update public.household_members set updated_at = now() - interval '1 hour'
 where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
update public.household_members set status = 'suspended'
 where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
select ok(
  (select updated_at from public.household_members where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee') = now(),
  'household_members.updated_at is refreshed by the trigger on UPDATE'
);

-- household_id is immutable: no ordinary operation may re-home a row.
select throws_ok(
  $$ update public.member_profiles
        set household_id = '22222222-2222-2222-2222-222222222222'
      where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '23514',
  null,
  'member_profiles.household_id cannot be changed'
);
select throws_ok(
  $$ update public.household_members
        set household_id = '22222222-2222-2222-2222-222222222222'
      where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' $$,
  '23514',
  null,
  'household_members.household_id cannot be changed'
);

-- Cascade from the household root.
delete from public.households where id = '11111111-1111-1111-1111-111111111111';
select is((select count(*) from public.member_profiles
            where household_id = '11111111-1111-1111-1111-111111111111'),
  0::bigint, 'deleting a household cascades to its profiles');
select is((select count(*) from public.household_members
            where household_id = '11111111-1111-1111-1111-111111111111'),
  0::bigint, 'deleting a household cascades to its memberships');

-- Expected indexes.
select has_index('public', 'household_members', 'household_members_unique_live_profile',
  'partial unique index on live (household_id, profile_id) exists');
select has_index('public', 'household_members', 'household_members_unique_live_auth_user',
  'partial unique index on live (household_id, auth_user_id) exists');
select has_index('public', 'household_members', 'household_members_household_status_idx',
  'lookup index on (household_id, status) exists');
select has_index('public', 'member_profiles', 'member_profiles_household_live_idx',
  'partial index on live profiles per household exists');
select has_index('public', 'household_invitations', 'household_invitations_token_hash_key',
  'unique index on invitation token_hash exists');

select * from finish();
rollback;
