-- WP4 ג€” authorization helper properties.
-- Structural only: needs no fixtures.
begin;
select plan(40);

-- The helpers live in a non-exposed schema ---------------------------------
select has_schema('private', 'the private schema exists');
select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'private' and c.relkind in ('r', 'p', 'v', 'm', 'f')),
  0::bigint,
  'private contains no tables or views ג€” nothing there could ever be exposed as a Data API resource');

-- ...and nowhere else. No equivalent helper may exist in public, where
-- PostgREST would expose it as an RPC endpoint.
select hasnt_function('public', 'is_active_household_member',
  'no is_active_household_member in public');
select hasnt_function('public', 'has_household_role',
  'no has_household_role in public');
select hasnt_function('public', 'current_profile_id',
  'no current_profile_id in public');
select hasnt_function('public', 'can_manage_household',
  'no can_manage_household anywhere ג€” redundant wrapper not created');
select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname not in ('set_updated_at', 'prevent_household_id_change')),
  0::bigint,
  'no unexpected SECURITY DEFINER function exists in the exposed public schema');

-- Exactly the approved helpers exist ---------------------------------------
-- Three from WP4 (identity) and four from WP5B (task scope, ADR-040). Every one
-- of them is held to the same contract by the property assertions below.
select has_function('private', 'is_active_household_member', array['uuid'],
  'private.is_active_household_member(uuid) exists');
select has_function('private', 'has_household_role', array['uuid', 'public.household_role[]'],
  'private.has_household_role(uuid, household_role[]) exists');
select has_function('private', 'current_profile_id', array['uuid'],
  'private.current_profile_id(uuid) exists');
select has_function('private', 'is_assigned_to_task_instance', array['uuid'],
  'private.is_assigned_to_task_instance(uuid) exists');
select has_function('private', 'is_assigned_to_task_template', array['uuid'],
  'private.is_assigned_to_task_template(uuid) exists');
select has_function('private', 'is_task_template_adult_only', array['uuid'],
  'private.is_task_template_adult_only(uuid) exists');
select has_function('private', 'is_task_instance_adult_only', array['uuid'],
  'private.is_task_instance_adult_only(uuid) exists');
select has_function('private', 'is_rotation_rule_adult_only', array['uuid'],
  'private.is_rotation_rule_adult_only(uuid) exists');
select has_function('private', 'is_assigned_to_rotation_rule', array['uuid'],
  'private.is_assigned_to_rotation_rule(uuid) exists');
select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'),
  9::bigint,
  'private contains exactly nine functions ג€” three identity, four task scope, two rotation scope');

-- None of the task helpers may leak into the exposed schema either.
select hasnt_function('public', 'is_assigned_to_task_instance',
  'no is_assigned_to_task_instance in public');
select hasnt_function('public', 'is_task_template_adult_only',
  'no is_task_template_adult_only in public');

-- No helper accepts a user id ----------------------------------------------
-- Every argument must be either the household uuid or the role array. A second
-- uuid argument would make the helper an oracle for probing other accounts.
select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and (select count(*) from unnest(p.proargtypes) t where t = 'uuid'::regtype) > 1),
  0::bigint,
  'no private helper takes more than one uuid argument ג€” none can accept a user id');
select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and coalesce(array_to_string(p.proargnames, ','), '') ~* '(user|uid|actor|account)'),
  0::bigint,
  'no private helper has a user-identifying parameter name');

-- Security properties ------------------------------------------------------
select ok((select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private' and p.proname = 'is_active_household_member'),
  'is_active_household_member is SECURITY DEFINER');
select ok((select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private' and p.proname = 'has_household_role'),
  'has_household_role is SECURITY DEFINER');
select ok((select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private' and p.proname = 'current_profile_id'),
  'current_profile_id is SECURITY DEFINER');

select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.provolatile <> 's'),
  0::bigint,
  'every private helper is STABLE');

select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and not coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=%'),
  0::bigint,
  'every private helper pins search_path');
select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and coalesce(array_to_string(p.proconfig, ','), '') <> 'search_path=""'),
  0::bigint,
  'every private helper pins search_path to the EMPTY string');

select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and pg_get_userbyid(p.proowner) <> 'postgres'),
  0::bigint,
  'every private helper is owned by the migration owner (postgres, which has BYPASSRLS)');

-- No dynamic SQL, and each helper checks the full authorization predicate.
select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.prosrc ~* '(execute\s+format|execute\s+'')'),
  0::bigint,
  'no private helper uses dynamic SQL');
select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and not (p.prosrc like '%auth.uid()%'
           and p.prosrc like '%access_expires_at%'
           and p.prosrc like '%deleted_at is null%'
           and p.prosrc like '%is_active%'
           and p.prosrc like '%''active''%')),
  0::bigint,
  'every helper derives from auth.uid() and checks status, expiry, soft delete and profile activity');

-- Privileges on the private schema and its functions ------------------------
select ok(not has_schema_privilege('anon', 'private', 'USAGE'),
  'anon has no USAGE on the private schema');
select ok(has_schema_privilege('authenticated', 'private', 'USAGE'),
  'authenticated has USAGE on private so policies can resolve the helpers');
select ok(has_schema_privilege('service_role', 'private', 'USAGE'),
  'service_role has USAGE on private');

select ok(not has_function_privilege('anon', 'private.is_active_household_member(uuid)', 'EXECUTE'),
  'anon cannot execute is_active_household_member');
select ok(not has_function_privilege('anon', 'private.has_household_role(uuid, public.household_role[])', 'EXECUTE'),
  'anon cannot execute has_household_role');
select ok(not has_function_privilege('anon', 'private.current_profile_id(uuid)', 'EXECUTE'),
  'anon cannot execute current_profile_id');
select ok(has_function_privilege('authenticated', 'private.is_active_household_member(uuid)', 'EXECUTE'),
  'authenticated can execute is_active_household_member');

-- The WP5B task helpers are held to the same privilege contract.
select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and has_function_privilege('anon', p.oid, 'EXECUTE')),
  0::bigint,
  'anon can execute no private helper at all, task helpers included');
select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and not has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  0::bigint,
  'authenticated can execute every private helper, so no policy fails to resolve one');

-- PUBLIC holds no EXECUTE on any helper.
select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     cross join lateral aclexplode(p.proacl) a
    where n.nspname = 'private' and a.grantee = 0),
  0::bigint,
  'PUBLIC holds no EXECUTE on any private helper');

select * from finish();
rollback;
