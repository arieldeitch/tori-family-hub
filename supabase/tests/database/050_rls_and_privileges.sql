-- WP3 — the deliberate locked-down state (decision D1 / ADR-023):
-- RLS enabled on every WP3 table, ZERO policies, and no table privileges for
-- PUBLIC, anon or authenticated.
--
-- This does NOT test household isolation. There are no policies yet, so there
-- is no isolation behaviour to test — that is WP4's job.
begin;
select plan(18);

-- RLS enabled on all four tables.
select is((select relrowsecurity from pg_class where oid = 'public.households'::regclass),
  true, 'RLS is enabled on households');
select is((select relrowsecurity from pg_class where oid = 'public.member_profiles'::regclass),
  true, 'RLS is enabled on member_profiles');
select is((select relrowsecurity from pg_class where oid = 'public.household_members'::regclass),
  true, 'RLS is enabled on household_members');
select is((select relrowsecurity from pg_class where oid = 'public.household_invitations'::regclass),
  true, 'RLS is enabled on household_invitations');

-- Zero policies: with RLS enabled this denies every row to any non-bypassing
-- role. WP4 adds the policy set together with the matching GRANTs.
select policies_are('public', 'households', array[]::name[],
  'households has no RLS policies in WP3');
select policies_are('public', 'member_profiles', array[]::name[],
  'member_profiles has no RLS policies in WP3');
select policies_are('public', 'household_members', array[]::name[],
  'household_members has no RLS policies in WP3');
select policies_are('public', 'household_invitations', array[]::name[],
  'household_invitations has no RLS policies in WP3');

select is(
  (select count(*) from pg_policies
    where schemaname = 'public'
      and tablename in ('households', 'member_profiles', 'household_members', 'household_invitations')),
  0::bigint,
  'no RLS policy exists on any WP3 table'
);

-- No client-role privileges. anon and authenticated are the Data API roles;
-- revoking them removes these tables from the Data API entirely.
select table_privs_are('public', 'households', 'anon', array[]::text[],
  'anon has no privileges on households');
select table_privs_are('public', 'member_profiles', 'anon', array[]::text[],
  'anon has no privileges on member_profiles');
select table_privs_are('public', 'household_members', 'anon', array[]::text[],
  'anon has no privileges on household_members');
select table_privs_are('public', 'household_invitations', 'anon', array[]::text[],
  'anon has no privileges on household_invitations');

select table_privs_are('public', 'households', 'authenticated', array[]::text[],
  'authenticated has no privileges on households');
select table_privs_are('public', 'member_profiles', 'authenticated', array[]::text[],
  'authenticated has no privileges on member_profiles');
select table_privs_are('public', 'household_members', 'authenticated', array[]::text[],
  'authenticated has no privileges on household_members');
select table_privs_are('public', 'household_invitations', 'authenticated', array[]::text[],
  'authenticated has no privileges on household_invitations');

-- PUBLIC (grantee oid 0) holds no privileges on any WP3 table either.
select is(
  (select count(*)
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     cross join lateral aclexplode(c.relacl) a
    where n.nspname = 'public'
      and c.relname in ('households', 'member_profiles', 'household_members', 'household_invitations')
      and a.grantee = 0),
  0::bigint,
  'PUBLIC holds no privileges on any WP3 table'
);

select * from finish();
rollback;
