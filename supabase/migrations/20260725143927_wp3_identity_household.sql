-- WP3 — Identity & Household schema foundation.
--
-- Creates the Identity/Household foundation only: two enums, four tables,
-- constraints, household-consistency foreign keys, indexes, timestamp handling
-- and soft-delete fields. Row Level Security is ENABLED on every table with
-- ZERO policies, and all table privileges are revoked from PUBLIC, anon and
-- authenticated — the tables are deliberately unreachable by any client role
-- until WP4 adds the minimum GRANTs together with the complete policy set and
-- positive/negative tests. See docs/decisions.md (ADR-023) and
-- docs/06-security-and-permissions.md.
--
-- NOT in this migration (WP4+): RLS policies, GRANTs, membership helper
-- functions (has_household_role), invitation-acceptance RPC, owner-transfer
-- RPC, Auth flow, PIN credentials, any business-module schema.
--
-- auth.users is REFERENCED ONLY (foreign keys on id). This migration never
-- inserts, updates, deletes or triggers on auth.users.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Roles from docs/01-product-requirements.md §4. Household-scoped: the role
-- lives on the membership row (household_members), never on a profile row and
-- never in a separate global user_roles table (ADR-024, decision D2).
create type public.household_role as enum (
  'owner',
  'adult',
  'child',
  'guest',
  'service_provider'
);

-- Membership lifecycle from docs/05-data-model.md.
--   invited -> active ; active <-> suspended ; any -> revoked (terminal).
-- Transition legality is enforced by the WP4/WP5 RPCs, not declaratively here;
-- this migration only restricts the value domain.
create type public.household_membership_status as enum (
  'invited',
  'active',
  'suspended',
  'revoked'
);

-- ---------------------------------------------------------------------------
-- Shared trigger functions
--
-- Both are SECURITY INVOKER with a fixed, empty search_path so they can never
-- be hijacked by a mutable search_path. pg_catalog is always implicitly
-- searched, so now() and the error-raising machinery still resolve.
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Maintains updated_at on every UPDATE. updated_at doubles as the optimistic-concurrency token for later writers.';

-- household_id is immutable: a row must never migrate between households.
-- This is enforced in the database rather than left to future RLS, so that no
-- ordinary client operation (and no accidental bulk UPDATE) can re-home a row.
-- A future privileged transfer, if one is ever justified, must arrive as its
-- own migration that deliberately relaxes this rule.
create or replace function public.prevent_household_id_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.household_id is distinct from old.household_id then
    raise exception 'household_id is immutable on %.%',
      tg_table_schema, tg_table_name
      using errcode = '23514';
  end if;
  return new;
end;
$$;

comment on function public.prevent_household_id_change() is
  'Rejects any UPDATE that changes household_id, keeping household ownership of a row immutable.';

-- ---------------------------------------------------------------------------
-- households
-- ---------------------------------------------------------------------------

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null
    constraint households_name_length check (length(btrim(name)) between 1 and 80),
  -- Hebrew-first defaults (ADR-008).
  timezone text not null default 'Asia/Jerusalem'
    constraint households_timezone_not_blank check (length(btrim(timezone)) > 0),
  locale text not null default 'he-IL'
    constraint households_locale_not_blank check (length(btrim(locale)) > 0),
  week_starts_on smallint not null default 0
    constraint households_week_starts_on_range check (week_starts_on between 0 and 6),
  quiet_hours_start time not null default '21:00',
  quiet_hours_end time not null default '07:00',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Soft delete with a restore window (ADR-007). The 48h window and the purge
  -- job are enforced above the database, in a later work package.
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id) on delete set null
);

comment on table public.households is
  'A family household. Root of every household-scoped relation. RLS enabled, no policies until WP4.';
comment on column public.households.created_by is
  'auth.users.id of the creator. ON DELETE SET NULL: deleting an account must not delete the family household.';
comment on column public.households.deleted_at is
  'Soft delete (ADR-007). NULL means live. Restore window and purge are handled outside the database.';

-- ---------------------------------------------------------------------------
-- member_profiles
--
-- The person, independent of any login. A child has a profile but no account
-- (ADR-013), so profiles carry no auth linkage at all — that lives on
-- household_members.
--
-- Deliberately NO pin_hash column (ADR-025, decision D3): PIN credential
-- material must never sit on a row that household members will eventually be
-- able to read. pin_auth_enabled below is non-sensitive configuration metadata
-- only; it does not authenticate anything and no PIN is verified in WP3.
-- ---------------------------------------------------------------------------

create table public.member_profiles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  display_name text not null
    constraint member_profiles_display_name_length check (length(btrim(display_name)) between 1 and 60),
  avatar_path text,
  color_token text,
  date_of_birth date,
  is_child boolean not null default false,
  is_active boolean not null default true,
  -- Non-sensitive flag only. Enabling PIN for real must later be atomic with
  -- creating a credential in private.member_pin_credentials (ADR-025).
  pin_auth_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id) on delete set null,
  -- Composite-FK target: lets household_members prove, structurally, that a
  -- profile belongs to the same household as the membership.
  constraint member_profiles_id_household_key unique (id, household_id),
  -- PIN is a child-access mechanism; enabling it on an adult profile is a
  -- modelling error rather than a supported configuration.
  constraint member_profiles_pin_requires_child check (not pin_auth_enabled or is_child)
);

comment on table public.member_profiles is
  'A person in a household, independent of any auth account. Children have profiles but no login (ADR-013). No PIN material is stored here (ADR-025).';
comment on column public.member_profiles.pin_auth_enabled is
  'Non-sensitive metadata only. No PIN hash, no verification in WP3. Future credentials live in private.member_pin_credentials behind an RPC boundary (ADR-025).';
comment on constraint member_profiles_id_household_key on public.member_profiles is
  'Composite unique key so household_members can enforce same-household membership via a composite foreign key.';

-- ---------------------------------------------------------------------------
-- household_members
--
-- The membership/authorization row: which auth user (if any) acts as which
-- profile, in which household, with which role and status. This IS the
-- dedicated authorization table (ADR-024) — there is no user_roles table.
-- ---------------------------------------------------------------------------

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  -- Nullable: child and other non-login profiles have no account (ADR-013).
  -- ON DELETE CASCADE: when an account is deleted the membership linkage is
  -- meaningless and must not survive as a dangling 'active' row. The person's
  -- identity and history survive on member_profiles, which is untouched.
  auth_user_id uuid references auth.users (id) on delete cascade,
  profile_id uuid not null,
  role public.household_role not null,
  status public.household_membership_status not null default 'invited',
  joined_at timestamptz,
  access_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Household consistency, enforced structurally rather than by RLS: the
  -- referenced profile must belong to the SAME household as this membership.
  constraint household_members_profile_same_household_fkey
    foreign key (profile_id, household_id)
    references public.member_profiles (id, household_id)
    on delete cascade
);

comment on table public.household_members is
  'Membership and authorization row. Role lives here, never on a profile and never in a global user_roles table (ADR-024). Multiple active owners per household are legal (ADR-026).';
comment on column public.household_members.auth_user_id is
  'auth.users.id, NULL for child/non-login profiles. ON DELETE CASCADE: deleting the account removes the linkage; member_profiles keeps the person and their history.';
comment on column public.household_members.status is
  'invited -> active ; active <-> suspended ; any -> revoked (terminal). Transition legality is enforced by the WP4/WP5 RPCs.';
comment on constraint household_members_profile_same_household_fkey on public.household_members is
  'Composite FK: a membership can only reference a profile from its own household. Cross-household attachment is structurally impossible.';

-- One live membership per profile, and one live membership per auth user, per
-- household. 'revoked' rows are excluded so a revoked member can be re-invited
-- while the revoked row survives for audit. Partial unique indexes rather than
-- table constraints, because the predicate is required.
create unique index household_members_unique_live_profile
  on public.household_members (household_id, profile_id)
  where status <> 'revoked';

create unique index household_members_unique_live_auth_user
  on public.household_members (household_id, auth_user_id)
  where auth_user_id is not null and status <> 'revoked';

comment on index public.household_members_unique_live_auth_user is
  'Prevents duplicate live membership for one auth user within a household, while allowing that user to belong to many households.';

-- ---------------------------------------------------------------------------
-- household_invitations
--
-- Only a hash of the invitation token is ever stored. The raw token is
-- generated with high entropy, returned exactly once by the (future) creating
-- RPC, and never persisted in any column, log or seed.
-- ---------------------------------------------------------------------------

create table public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  -- An invitation must never be able to mint an owner: ownership is granted by
  -- an explicit, audited owner-transfer RPC in a later work package.
  role public.household_role not null
    constraint household_invitations_role_not_owner check (role <> 'owner'),
  token_hash bytea not null,
  invited_email text
    constraint household_invitations_invited_email_not_blank
      check (invited_email is null or length(btrim(invited_email)) > 0),
  expires_at timestamptz not null,
  max_uses integer not null default 1
    constraint household_invitations_max_uses_positive check (max_uses > 0),
  used_count integer not null default 0
    constraint household_invitations_used_count_within_bounds
      check (used_count >= 0 and used_count <= max_uses),
  revoked_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.household_invitations is
  'Pending invitations. Stores only a hash of the token — the raw token is returned once by the future creating RPC and never persisted.';
comment on column public.household_invitations.token_hash is
  'Hash of a high-entropy single-use token. The raw token is NEVER stored. Unique, so a replayed hash cannot address two invitations.';
comment on column public.household_invitations.used_count is
  'Consumed atomically by the future acceptance RPC via a conditional UPDATE (... WHERE used_count < max_uses), so concurrent redemptions cannot over-consume.';

create unique index household_invitations_token_hash_key
  on public.household_invitations (token_hash);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index household_members_household_status_idx
  on public.household_members (household_id, status);

create index household_members_auth_user_idx
  on public.household_members (auth_user_id)
  where auth_user_id is not null;

create index household_members_profile_idx
  on public.household_members (profile_id);

create index member_profiles_household_live_idx
  on public.member_profiles (household_id)
  where deleted_at is null;

create index households_created_by_idx
  on public.households (created_by)
  where created_by is not null;

-- now() is not immutable, so an "unexpired" predicate cannot be indexed;
-- filtering on expires_at at query time is enough at this scale.
create index household_invitations_household_expires_idx
  on public.household_invitations (household_id, expires_at)
  where revoked_at is null;

-- ---------------------------------------------------------------------------
-- Timestamp + immutability triggers
-- ---------------------------------------------------------------------------

create trigger households_set_updated_at
  before update on public.households
  for each row execute function public.set_updated_at();

create trigger member_profiles_set_updated_at
  before update on public.member_profiles
  for each row execute function public.set_updated_at();

create trigger household_members_set_updated_at
  before update on public.household_members
  for each row execute function public.set_updated_at();

create trigger household_invitations_set_updated_at
  before update on public.household_invitations
  for each row execute function public.set_updated_at();

create trigger member_profiles_household_id_immutable
  before update on public.member_profiles
  for each row execute function public.prevent_household_id_change();

create trigger household_members_household_id_immutable
  before update on public.household_members
  for each row execute function public.prevent_household_id_change();

create trigger household_invitations_household_id_immutable
  before update on public.household_invitations
  for each row execute function public.prevent_household_id_change();

-- ---------------------------------------------------------------------------
-- Row Level Security and privileges (decision D1)
--
-- Deliberate locked-down WP3 state:
--   * RLS is ENABLED on all four tables.
--   * ZERO policies exist, so with RLS enabled every row is denied to any
--     non-bypassing role — fail closed.
--   * All table privileges are revoked from PUBLIC, anon and authenticated,
--     which also strips the Supabase default privileges that would otherwise
--     expose these tables through the Data API.
--
-- Privileges of postgres, the table owner, service_role and other Supabase
-- infrastructure roles are deliberately left untouched — migrations, the CLI,
-- type generation and pgTAP must keep working.
--
-- WP4 opens this up: it adds the MINIMUM required GRANTs together with the
-- complete RLS policy set and positive/negative tests, in one migration.
-- ---------------------------------------------------------------------------

alter table public.households enable row level security;
alter table public.member_profiles enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invitations enable row level security;

revoke all on table public.households from public, anon, authenticated;
revoke all on table public.member_profiles from public, anon, authenticated;
revoke all on table public.household_members from public, anon, authenticated;
revoke all on table public.household_invitations from public, anon, authenticated;
