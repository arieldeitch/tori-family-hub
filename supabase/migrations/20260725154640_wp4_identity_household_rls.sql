-- WP4 — Identity & Household RLS, grants and authorization helpers.
--
-- Opens the WP3 tables by the MINIMUM necessary amount. Grants and policies
-- ship together in this one migration (ADR-023).
--
-- Shape of the opening:
--   * READ is granted to `authenticated` at column level, scoped by policy to
--     the caller's own household and filtered for soft-deleted / inactive rows.
--   * WRITE is granted only for household settings (owner) and profile
--     presentation fields (owner/adult for the household, everyone else for
--     themselves).
--   * EVERY membership and invitation mutation stays unreachable: no INSERT,
--     UPDATE or DELETE grant and no write policy exists on household_members or
--     household_invitations. Those become authorized RPCs in WP4.5.
--   * `anon` receives nothing at all — no schema, no function, no table.
--
-- NOT in this migration (WP4.5 / WP4.6 / WP5): household creation RPC,
-- invitation create/revoke/accept RPC, role-change RPC, suspend/revoke RPC,
-- owner-transfer RPC, account-deletion workflow, Auth UI, app wiring,
-- onboarding persistence, child PIN, device sessions, business-module schema.
--
-- auth.users is still REFERENCED ONLY. This migration never writes to it.

-- ---------------------------------------------------------------------------
-- private schema — authorization helpers only
--
-- `private` is deliberately NOT in the Data API exposed schemas
-- (supabase/config.toml `api.schemas = ["public", "graphql_public"]`), so
-- nothing in here is reachable as a PostgREST RPC endpoint. Helpers live here
-- rather than in `public` so that a SECURITY DEFINER function can never be
-- called directly by a client over HTTP (ADR-027).
-- ---------------------------------------------------------------------------

create schema if not exists private;

comment on schema private is
  'Non-exposed schema for authorization helpers. Never added to the Data API exposed schemas; contains no tables.';

revoke all on schema private from public;
revoke all on schema private from anon;

-- USAGE only — required so that policy expressions running as the calling role
-- can resolve the helper functions. No table privileges are ever granted here.
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Authorization helpers
--
-- All three share one authorization lookup, which is the single definition of
-- "this caller currently has standing in this household". A caller has standing
-- only when ALL of the following hold:
--
--   * a membership row exists whose auth_user_id = auth.uid()
--   * membership status = 'active'          (invited/suspended/revoked deny)
--   * access_expires_at IS NULL or > now()  (expired guest access denies)
--   * the household is not soft-deleted
--   * the caller's own member profile is active and not soft-deleted
--
-- Properties enforced on every helper (asserted by tests):
--   * SECURITY DEFINER, owned by the migration owner (postgres), which has
--     BYPASSRLS — this is what prevents infinite recursion when a policy on
--     household_members needs to consult household_members.
--   * STABLE — auth.uid() and now() are stable within a statement.
--   * SET search_path = '' with every object fully schema-qualified.
--   * No dynamic SQL.
--   * NO user-id parameter. A caller can only ever ask about itself, so these
--     can never be used to probe another account's memberships.
--
-- auth.uid() is wrapped in a scalar subselect so the planner evaluates it once
-- per query rather than once per row.
-- ---------------------------------------------------------------------------

create or replace function private.is_active_household_member(p_household_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members m
    join public.households h
      on h.id = m.household_id
    join public.member_profiles p
      on p.id = m.profile_id
     and p.household_id = m.household_id
    where m.household_id = p_household_id
      and m.auth_user_id = (select auth.uid())
      and m.status = 'active'
      and (m.access_expires_at is null or m.access_expires_at > now())
      and h.deleted_at is null
      and p.is_active
      and p.deleted_at is null
  );
$$;

comment on function private.is_active_household_member(uuid) is
  'True when the CALLER (auth.uid()) holds active, unexpired membership of the given household, the household is live, and the caller profile is active and live. Takes no user id: it can only answer for the caller.';

create or replace function private.has_household_role(
  p_household_id uuid,
  p_roles public.household_role[]
)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members m
    join public.households h
      on h.id = m.household_id
    join public.member_profiles p
      on p.id = m.profile_id
     and p.household_id = m.household_id
    where m.household_id = p_household_id
      and m.auth_user_id = (select auth.uid())
      and m.status = 'active'
      and (m.access_expires_at is null or m.access_expires_at > now())
      and m.role = any (p_roles)
      and h.deleted_at is null
      and p.is_active
      and p.deleted_at is null
  );
$$;

comment on function private.has_household_role(uuid, public.household_role[]) is
  'True when the CALLER holds active, unexpired membership of the given household with one of the given roles. Takes no user id.';

create or replace function private.current_profile_id(p_household_id uuid)
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select m.profile_id
  from public.household_members m
  join public.households h
    on h.id = m.household_id
  join public.member_profiles p
    on p.id = m.profile_id
   and p.household_id = m.household_id
  where m.household_id = p_household_id
    and m.auth_user_id = (select auth.uid())
    and m.status = 'active'
    and (m.access_expires_at is null or m.access_expires_at > now())
    and h.deleted_at is null
    and p.is_active
    and p.deleted_at is null
  limit 1;
$$;

comment on function private.current_profile_id(uuid) is
  'The CALLER''s own member_profiles.id within the given household, or NULL when the caller has no active standing there. Takes no user id.';

-- Function privileges: nothing for PUBLIC or anon.
revoke all on function private.is_active_household_member(uuid) from public, anon;
revoke all on function private.has_household_role(uuid, public.household_role[]) from public, anon;
revoke all on function private.current_profile_id(uuid) from public, anon;

grant execute on function private.is_active_household_member(uuid) to authenticated, service_role;
grant execute on function private.has_household_role(uuid, public.household_role[]) to authenticated, service_role;
grant execute on function private.current_profile_id(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Column-level grants for `authenticated`
--
-- RLS is row-level only, so column-level grants carry everything RLS cannot:
--   * households.created_by / deleted_at / deleted_by  — never readable
--   * member_profiles.date_of_birth                    — never readable OR
--                                                        writable (D3: deferred
--                                                        to a sensitive-profile
--                                                        permission model)
--   * household_members.auth_user_id                   — never readable
--   * household_invitations.token_hash / created_by     — never readable
-- ---------------------------------------------------------------------------

grant select (
  id, name, timezone, locale, week_starts_on,
  quiet_hours_start, quiet_hours_end, created_at, updated_at
) on public.households to authenticated;

grant update (
  name, timezone, locale, week_starts_on, quiet_hours_start, quiet_hours_end
) on public.households to authenticated;

grant select (
  id, household_id, display_name, avatar_path, color_token,
  is_child, is_active, pin_auth_enabled, created_at, updated_at
) on public.member_profiles to authenticated;

grant update (
  display_name, avatar_path, color_token
) on public.member_profiles to authenticated;

grant select (
  id, household_id, profile_id, role, status,
  joined_at, access_expires_at, created_at, updated_at
) on public.household_members to authenticated;

grant select (
  id, household_id, role, invited_email, expires_at,
  max_uses, used_count, revoked_at, created_at, updated_at
) on public.household_invitations to authenticated;

-- Server-side administration and deterministic test fixtures only (ADR-030).
-- service_role already carries BYPASSRLS; its key is server-only and must never
-- appear in VITE_* variables, client code or build output.
grant select, insert, update, delete on public.households to service_role;
grant select, insert, update, delete on public.member_profiles to service_role;
grant select, insert, update, delete on public.household_members to service_role;
grant select, insert, update, delete on public.household_invitations to service_role;

-- ---------------------------------------------------------------------------
-- Policies
--
-- Every policy derives identity solely from auth.uid() via the private helpers,
-- never from a client-supplied household_id. Every policy filters soft-deleted
-- rows. Non-members match zero rows rather than raising, so a policy can never
-- reveal whether another household exists.
-- ---------------------------------------------------------------------------

-- households --------------------------------------------------------------

create policy households_select_active_member
  on public.households
  for select
  to authenticated
  using (
    deleted_at is null
    and private.is_active_household_member(id)
  );

comment on policy households_select_active_member on public.households is
  'Any active, unexpired member may read their own live household. Non-members match no rows, so the existence of other households is never revealed.';

create policy households_update_owner
  on public.households
  for update
  to authenticated
  using (
    deleted_at is null
    and private.has_household_role(id, array['owner']::public.household_role[])
  )
  with check (
    deleted_at is null
    and private.has_household_role(id, array['owner']::public.household_role[])
  );

comment on policy households_update_owner on public.households is
  'Only an active owner may change household settings, and only on a live household. The grantable column list excludes id, created_by and the soft-delete fields, so ownership and audit fields cannot be touched.';

-- No INSERT or DELETE policy: household creation and deletion are RPC-only
-- future work (WP4.5/WP5).

-- member_profiles ---------------------------------------------------------

create policy member_profiles_select_household
  on public.member_profiles
  for select
  to authenticated
  using (
    is_active
    and deleted_at is null
    and (
      private.has_household_role(
        household_id, array['owner', 'adult', 'child']::public.household_role[]
      )
      or id = private.current_profile_id(household_id)
    )
  );

comment on policy member_profiles_select_household on public.member_profiles is
  'Owner/adult/child read the active, live profiles of their own household. Guest and service_provider read only their own profile and cannot enumerate the family. date_of_birth is withheld by the column grant for every role.';

create policy member_profiles_update_permitted
  on public.member_profiles
  for update
  to authenticated
  using (
    is_active
    and deleted_at is null
    and (
      private.has_household_role(
        household_id, array['owner', 'adult']::public.household_role[]
      )
      or id = private.current_profile_id(household_id)
    )
  )
  with check (
    is_active
    and deleted_at is null
    and (
      private.has_household_role(
        household_id, array['owner', 'adult']::public.household_role[]
      )
      or id = private.current_profile_id(household_id)
    )
  );

comment on policy member_profiles_update_permitted on public.member_profiles is
  'Owner/adult may edit presentation fields of any active profile in their household; every other role only its own. The grantable column list is display_name, avatar_path and color_token — is_child, is_active, pin_auth_enabled, date_of_birth and the soft-delete fields are unwritable.';

-- No INSERT or DELETE policy: profile creation and soft delete are RPC-only.

-- household_members -------------------------------------------------------

create policy household_members_select_permitted
  on public.household_members
  for select
  to authenticated
  using (
    private.is_active_household_member(household_id)
    and (
      private.has_household_role(
        household_id, array['owner', 'adult']::public.household_role[]
      )
      or profile_id = private.current_profile_id(household_id)
    )
  );

comment on policy household_members_select_permitted on public.household_members is
  'Owner/adult may read the membership rows of their household; child, guest and service_provider read only their own row. auth_user_id is excluded from the column grant, so no client can read account identifiers. member_profiles, not this table, is the ordinary family-display roster.';

-- No INSERT/UPDATE/DELETE policy and no such grant. Self-insertion, role
-- changes, status changes and changes to household_id / auth_user_id /
-- profile_id are therefore unreachable for every client. WP4.5 RPCs own them.

-- household_invitations ---------------------------------------------------

create policy household_invitations_select_owner
  on public.household_invitations
  for select
  to authenticated
  using (
    private.has_household_role(
      household_id, array['owner']::public.household_role[]
    )
  );

comment on policy household_invitations_select_owner on public.household_invitations is
  'Only an active owner may list invitations. token_hash and created_by are excluded from the column grant. Creation, revocation and acceptance are RPC-only (WP4.5) so they can be atomic, authorized and audited.';

-- No INSERT/UPDATE/DELETE policy and no such grant.
