-- WP4 — policy catalog and GRANT matrix.
-- Structural only: runs while the business tables are empty, needs no fixtures.
begin;
select plan(54);

-- Exact policy sets -------------------------------------------------------
select policies_are('public', 'households',
  array['households_select_active_member', 'households_update_owner'],
  'households has exactly the two approved policies');
select policies_are('public', 'member_profiles',
  array['member_profiles_select_household', 'member_profiles_update_permitted'],
  'member_profiles has exactly the two approved policies');
select policies_are('public', 'household_members',
  array['household_members_select_permitted'],
  'household_members has exactly one policy — SELECT only');
select policies_are('public', 'household_invitations',
  array['household_invitations_select_owner'],
  'household_invitations has exactly one policy — SELECT only');

-- Commands ----------------------------------------------------------------
select is((select cmd from pg_policies where policyname = 'households_select_active_member'),
  'SELECT', 'households_select_active_member is a SELECT policy');
select is((select cmd from pg_policies where policyname = 'households_update_owner'),
  'UPDATE', 'households_update_owner is an UPDATE policy');
select is((select cmd from pg_policies where policyname = 'household_members_select_permitted'),
  'SELECT', 'the only household_members policy is SELECT');
select is((select cmd from pg_policies where policyname = 'household_invitations_select_owner'),
  'SELECT', 'the only household_invitations policy is SELECT');

-- No write policies exist on the authority tables.
select is(
  (select count(*) from pg_policies
    where schemaname = 'public'
      and tablename in ('household_members', 'household_invitations')
      and cmd <> 'SELECT'),
  0::bigint,
  'no INSERT/UPDATE/DELETE policy exists on household_members or household_invitations');
-- Scoped to the WP3 identity tables. WP5B adds INSERT policies to the task
-- tables by design; identity remains unwritable by clients (ADR-028), and the
-- absence of a DELETE policy anywhere at all is asserted separately below.
select is(
  (select count(*) from pg_policies
    where schemaname = 'public'
      and tablename in ('households', 'member_profiles', 'household_members', 'household_invitations')
      and cmd in ('INSERT', 'DELETE')),
  0::bigint,
  'no INSERT or DELETE policy exists on any WP3 identity table');

-- Nothing in the schema may be physically deleted by a client: every table
-- either soft-deletes or is append-only.
select is(
  (select count(*) from pg_policies where schemaname = 'public' and cmd = 'DELETE'),
  0::bigint,
  'no DELETE policy exists on any public table — clients never hard-delete');

-- Every policy targets `authenticated` only, never PUBLIC or anon.
select is(
  (select count(*) from pg_policies
    where schemaname = 'public' and roles <> array['authenticated']::name[]),
  0::bigint,
  'every policy applies to the authenticated role only');

-- Recursion guard: no policy expression references household_members directly.
-- The helper names are singular (is_active_household_member, has_household_role)
-- so they cannot produce a false match on the plural table name.
select is(
  (select count(*) from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and (coalesce(pg_get_expr(p.polqual, p.polrelid), '') like '%household_members%'
        or coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') like '%household_members%')),
  0::bigint,
  'no policy expression references the household_members table directly — recursion is impossible');

-- Every policy routes through a private helper. An INSERT policy has no USING
-- clause at all (polqual is NULL), so the assertion looks at whichever
-- expressions the policy actually has and requires every one of them to derive
-- standing from auth.uid() through the helpers — never from a client-supplied
-- household_id.
select is(
  (select count(*) from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and (
        (p.polqual is not null
          and pg_get_expr(p.polqual, p.polrelid) not like '%private.%')
        or (p.polwithcheck is not null
          and pg_get_expr(p.polwithcheck, p.polrelid) not like '%private.%')
        -- A policy with neither expression would be unconditional.
        or (p.polqual is null and p.polwithcheck is null)
      )),
  0::bigint,
  'every policy expression — USING and WITH CHECK — calls a private authorization helper');

-- anon gets nothing at all --------------------------------------------------
select table_privs_are('public', 'households', 'anon', array[]::text[],
  'anon has no table privileges on households');
select table_privs_are('public', 'member_profiles', 'anon', array[]::text[],
  'anon has no table privileges on member_profiles');
select table_privs_are('public', 'household_members', 'anon', array[]::text[],
  'anon has no table privileges on household_members');
select table_privs_are('public', 'household_invitations', 'anon', array[]::text[],
  'anon has no table privileges on household_invitations');
select ok(not has_any_column_privilege('anon', 'public.households', 'SELECT'),
  'anon has no column SELECT on households');
select ok(not has_any_column_privilege('anon', 'public.member_profiles', 'SELECT'),
  'anon has no column SELECT on member_profiles');
select ok(not has_any_column_privilege('anon', 'public.household_members', 'SELECT'),
  'anon has no column SELECT on household_members');
select ok(not has_any_column_privilege('anon', 'public.household_invitations', 'SELECT'),
  'anon has no column SELECT on household_invitations');

-- authenticated: reads where designed, writes only where designed -----------
select ok(has_any_column_privilege('authenticated', 'public.households', 'SELECT'),
  'authenticated can read some household columns');
select ok(has_any_column_privilege('authenticated', 'public.households', 'UPDATE'),
  'authenticated can update some household columns');
select ok(not has_any_column_privilege('authenticated', 'public.households', 'INSERT'),
  'authenticated cannot INSERT households');
select ok(not has_table_privilege('authenticated', 'public.households', 'DELETE'),
  'authenticated cannot DELETE households');

select ok(has_any_column_privilege('authenticated', 'public.member_profiles', 'SELECT'),
  'authenticated can read some profile columns');
select ok(has_any_column_privilege('authenticated', 'public.member_profiles', 'UPDATE'),
  'authenticated can update some profile columns');
select ok(not has_any_column_privilege('authenticated', 'public.member_profiles', 'INSERT'),
  'authenticated cannot INSERT member_profiles');
select ok(not has_table_privilege('authenticated', 'public.member_profiles', 'DELETE'),
  'authenticated cannot DELETE member_profiles');

select ok(has_any_column_privilege('authenticated', 'public.household_members', 'SELECT'),
  'authenticated can read some membership columns');
select ok(not has_any_column_privilege('authenticated', 'public.household_members', 'INSERT'),
  'authenticated cannot INSERT household_members — self-assignment is impossible');
select ok(not has_any_column_privilege('authenticated', 'public.household_members', 'UPDATE'),
  'authenticated cannot UPDATE household_members — role/status/auth_user_id/profile_id are unchangeable');
select ok(not has_table_privilege('authenticated', 'public.household_members', 'DELETE'),
  'authenticated cannot DELETE household_members');

select ok(has_any_column_privilege('authenticated', 'public.household_invitations', 'SELECT'),
  'authenticated can read some invitation columns');
select ok(not has_any_column_privilege('authenticated', 'public.household_invitations', 'INSERT'),
  'authenticated cannot INSERT invitations');
select ok(not has_any_column_privilege('authenticated', 'public.household_invitations', 'UPDATE'),
  'authenticated cannot UPDATE invitations — no direct revoked_at write');
select ok(not has_table_privilege('authenticated', 'public.household_invitations', 'DELETE'),
  'authenticated cannot DELETE invitations');

-- Sensitive columns are ungranted ------------------------------------------
select column_privs_are('public', 'member_profiles', 'date_of_birth', 'authenticated',
  array[]::text[], 'date_of_birth is neither readable nor writable by authenticated (D3)');
select column_privs_are('public', 'household_members', 'auth_user_id', 'authenticated',
  array[]::text[], 'auth_user_id is not exposed to authenticated');
select column_privs_are('public', 'household_invitations', 'token_hash', 'authenticated',
  array[]::text[], 'token_hash is not exposed to authenticated');
select column_privs_are('public', 'household_invitations', 'created_by', 'authenticated',
  array[]::text[], 'invitation created_by is not exposed to authenticated');
select column_privs_are('public', 'households', 'created_by', 'authenticated',
  array[]::text[], 'households.created_by is not exposed to authenticated');
select column_privs_are('public', 'households', 'deleted_at', 'authenticated',
  array[]::text[], 'households.deleted_at is not exposed to authenticated');
select column_privs_are('public', 'households', 'deleted_by', 'authenticated',
  array[]::text[], 'households.deleted_by is not exposed to authenticated');
select column_privs_are('public', 'member_profiles', 'deleted_at', 'authenticated',
  array[]::text[], 'member_profiles.deleted_at is not exposed to authenticated');

-- Protected profile columns are readable but never writable.
select column_privs_are('public', 'member_profiles', 'pin_auth_enabled', 'authenticated',
  array['SELECT']::text[], 'pin_auth_enabled is readable but not writable (ADR-025)');
select column_privs_are('public', 'member_profiles', 'is_child', 'authenticated',
  array['SELECT']::text[], 'is_child is readable but not writable');
select column_privs_are('public', 'member_profiles', 'is_active', 'authenticated',
  array['SELECT']::text[], 'is_active is readable but not writable');
select column_privs_are('public', 'household_members', 'role', 'authenticated',
  array['SELECT']::text[], 'membership role is readable but not writable');
select column_privs_are('public', 'household_members', 'status', 'authenticated',
  array['SELECT']::text[], 'membership status is readable but not writable');

-- service_role: server-side administration only (ADR-030) -------------------
select ok(has_table_privilege('service_role', 'public.households', 'INSERT'),
  'service_role can write households for server-side administration and fixtures');
select ok(has_table_privilege('service_role', 'public.household_members', 'INSERT'),
  'service_role can write household_members');

-- PUBLIC holds nothing anywhere.
select is(
  (select count(*) from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     cross join lateral aclexplode(c.relacl) a
    where n.nspname = 'public'
      and c.relname in ('households', 'member_profiles', 'household_members', 'household_invitations')
      and a.grantee = 0),
  0::bigint,
  'PUBLIC holds no privileges on any WP3 table');

select * from finish();
rollback;
