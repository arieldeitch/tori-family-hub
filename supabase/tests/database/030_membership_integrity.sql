-- WP3 — household consistency and membership integrity, enforced structurally
-- (composite foreign keys + partial unique indexes), not by future RLS.
--
-- Scope note: assertions that require a real auth.users row are deliberately
-- catalog-level here. auth.users is never written by SQL (global hard rule);
-- behavioural multi-household/auth-user tests arrive in WP4, where users are
-- created through the Auth admin API.
begin;
select plan(14);

-- Fixtures: two separate households, each with its own profile.
insert into public.households (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Household A'),
  ('22222222-2222-2222-2222-222222222222', 'Household B');

insert into public.member_profiles (id, household_id, display_name, is_child) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Parent A', false),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Parent B', false),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Child A', true),
  -- Unused by any membership above, so the auth.users FK check below is the
  -- first constraint the insert can violate.
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'Guest B', false);

-- A membership within its own household is valid.
select lives_ok(
  $$ insert into public.household_members (household_id, profile_id, role, status)
     values ('11111111-1111-1111-1111-111111111111',
             'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner', 'active') $$,
  'a membership referencing a profile from its own household is accepted'
);

-- THE core integrity rule: a membership may not reference a profile that
-- belongs to a different household.
select throws_ok(
  $$ insert into public.household_members (household_id, profile_id, role, status)
     values ('11111111-1111-1111-1111-111111111111',
             'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'active') $$,
  '23503',
  null,
  'a membership cannot reference a profile from another household'
);

-- The same rule from the other direction.
select throws_ok(
  $$ insert into public.household_members (household_id, profile_id, role, status)
     values ('22222222-2222-2222-2222-222222222222',
             'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'active') $$,
  '23503',
  null,
  'a profile cannot be attached to an unrelated household'
);

-- Distinct households may each hold memberships: the schema permits one
-- person-shaped identity to participate in several households.
select lives_ok(
  $$ insert into public.household_members (household_id, profile_id, role, status)
     values ('22222222-2222-2222-2222-222222222222',
             'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'owner', 'active') $$,
  'membership in a second, different household remains possible at the schema level'
);

-- Duplicate live membership for the same profile in the same household fails.
select throws_ok(
  $$ insert into public.household_members (household_id, profile_id, role, status)
     values ('11111111-1111-1111-1111-111111111111',
             'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'active') $$,
  '23505',
  null,
  'duplicate live membership for one profile in one household is rejected'
);

-- ...but a revoked membership does not block re-adding the person later.
update public.household_members
   set status = 'revoked'
 where household_id = '11111111-1111-1111-1111-111111111111'
   and profile_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select lives_ok(
  $$ insert into public.household_members (household_id, profile_id, role, status)
     values ('11111111-1111-1111-1111-111111111111',
             'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adult', 'active') $$,
  'a revoked membership is kept for audit and does not block re-adding the profile'
);

-- Multiple active owners are legal (decision D5 / ADR-026).
select lives_ok(
  $$ insert into public.household_members (household_id, profile_id, role, status)
     values ('11111111-1111-1111-1111-111111111111',
             'cccccccc-cccc-cccc-cccc-cccccccccccc', 'owner', 'active') $$,
  'a household may have more than one active owner (D5)'
);

-- Enum domains are restricted.
select throws_ok(
  $$ insert into public.household_members (household_id, profile_id, role, status)
     values ('22222222-2222-2222-2222-222222222222',
             'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'superuser', 'active') $$,
  '22P02',
  null,
  'an invalid role value is rejected'
);
select throws_ok(
  $$ insert into public.household_members (household_id, profile_id, role, status)
     values ('22222222-2222-2222-2222-222222222222',
             'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adult', 'banished') $$,
  '22P02',
  null,
  'an invalid membership status value is rejected'
);

-- A non-null auth_user_id must reference a real auth.users row.
select throws_ok(
  $$ insert into public.household_members (household_id, profile_id, role, status, auth_user_id)
     values ('22222222-2222-2222-2222-222222222222',
             'dddddddd-dddd-dddd-dddd-dddddddddddd', 'adult', 'active',
             '99999999-9999-9999-9999-999999999999') $$,
  '23503',
  null,
  'a non-null auth_user_id that does not exist in auth.users is rejected'
);

-- A NULL auth_user_id is accepted: child / non-login profiles (ADR-013).
select ok(
  exists (select 1 from public.household_members
           where profile_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
             and auth_user_id is null),
  'a child membership with no auth account is accepted'
);

-- Deliberate ON DELETE behaviour, asserted at catalog level (auth.users is
-- never written by SQL).
select is(
  (select confdeltype from pg_constraint
    where conname = 'household_members_auth_user_id_fkey'
      and conrelid = 'public.household_members'::regclass),
  'c'::"char",
  'household_members.auth_user_id is ON DELETE CASCADE: deleting an account removes only the linkage'
);
select is(
  (select confdeltype from pg_constraint
    where conname = 'households_created_by_fkey'
      and conrelid = 'public.households'::regclass),
  'n'::"char",
  'households.created_by is ON DELETE SET NULL: deleting an account never deletes the household'
);

-- Per-household scoping of the auth-user uniqueness rule.
select ok(
  (select indexdef from pg_indexes
    where schemaname = 'public' and indexname = 'household_members_unique_live_auth_user')
    like 'CREATE UNIQUE INDEX%(household_id, auth_user_id)%',
  'auth-user uniqueness is scoped per household, so one account may join many households'
);

select * from finish();
rollback;
