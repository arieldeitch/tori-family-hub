-- WP3 — RLS is enabled on every identity table, and no client role ever
-- receives blanket table privileges.
--
-- SUPERSEDED IN PART BY WP4: this file originally also asserted zero policies
-- and zero privileges for `authenticated`. WP4 deliberately opened the minimum
-- necessary access (ADR-023), so those assertions now live in
-- 070_wp4_policies_and_grants.sql, which pins the exact policy set and the exact
-- column-level GRANT matrix. What remains here is the part that must hold
-- forever: RLS on, `anon` with nothing, PUBLIC with nothing.
begin;
select plan(13);

-- RLS enabled on all four tables. If a future migration ever creates one of
-- these without RLS, this fails.
select is((select relrowsecurity from pg_class where oid = 'public.households'::regclass),
  true, 'RLS is enabled on households');
select is((select relrowsecurity from pg_class where oid = 'public.member_profiles'::regclass),
  true, 'RLS is enabled on member_profiles');
select is((select relrowsecurity from pg_class where oid = 'public.household_members'::regclass),
  true, 'RLS is enabled on household_members');
select is((select relrowsecurity from pg_class where oid = 'public.household_invitations'::regclass),
  true, 'RLS is enabled on household_invitations');

-- `anon` is never granted anything on the identity tables. There is no
-- unauthenticated surface in this domain, in WP3 or WP4.
select table_privs_are('public', 'households', 'anon', array[]::text[],
  'anon has no privileges on households');
select table_privs_are('public', 'member_profiles', 'anon', array[]::text[],
  'anon has no privileges on member_profiles');
select table_privs_are('public', 'household_members', 'anon', array[]::text[],
  'anon has no privileges on household_members');
select table_privs_are('public', 'household_invitations', 'anon', array[]::text[],
  'anon has no privileges on household_invitations');

-- No blanket table-level privileges for `authenticated`: access is granted at
-- column level only, so a column added later is unreadable until deliberately
-- granted (fail closed). The exact matrix is asserted in 070.
select table_privs_are('public', 'households', 'authenticated', array[]::text[],
  'authenticated holds no table-wide privileges on households — column-level only');
select table_privs_are('public', 'member_profiles', 'authenticated', array[]::text[],
  'authenticated holds no table-wide privileges on member_profiles — column-level only');
select table_privs_are('public', 'household_members', 'authenticated', array[]::text[],
  'authenticated holds no table-wide privileges on household_members — column-level only');
select table_privs_are('public', 'household_invitations', 'authenticated', array[]::text[],
  'authenticated holds no table-wide privileges on household_invitations — column-level only');

-- PUBLIC (grantee oid 0) holds no privileges on any WP3 table.
select is(
  (select count(*)
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     cross join lateral aclexplode(c.relacl) a
    where n.nspname = 'public'
      and c.relname in ('households', 'member_profiles', 'household_members', 'household_invitations')
      and a.grantee = 0),
  0::bigint,
  'PUBLIC holds no privileges on any WP3 table');

select * from finish();
rollback;
