-- WP3 ג€” expected enums, tables, columns, defaults and nullability exist.
begin;
select plan(36);

-- Enums -------------------------------------------------------------------
select has_type('public', 'household_role', 'household_role enum exists');
select enum_has_labels(
  'public', 'household_role',
  array['owner', 'adult', 'child', 'guest', 'service_provider'],
  'household_role has exactly the PRD roles'
);

select has_type('public', 'household_membership_status', 'household_membership_status enum exists');
select enum_has_labels(
  'public', 'household_membership_status',
  array['invited', 'active', 'suspended', 'revoked'],
  'household_membership_status has exactly the documented lifecycle states'
);

-- Tables ------------------------------------------------------------------
select has_table('public', 'households', 'households exists');
select has_table('public', 'member_profiles', 'member_profiles exists');
select has_table('public', 'household_members', 'household_members exists');
select has_table('public', 'household_invitations', 'household_invitations exists');

-- WP3 must not create business-module tables.
select hasnt_table('public', 'user_roles',
  'no user_roles table: role lives on household_members (D2)');
-- The WP5B task tables and the WP5C rotation tables now exist and are asserted
-- in 090 and 100. Scope discipline is kept by proving the NEXT package has not
-- leaked in early: WP5D is UI only and must add no table at all.
select has_table('public', 'rotation_rules', 'rotation_rules exists (WP5C)');
select has_table('public', 'rotation_members', 'rotation_members exists (WP5C)');
select has_table('public', 'rotation_assignment_log', 'rotation_assignment_log exists (WP5C)');

-- WP5D wires the weekly view to the tables that already exist. If any of these
-- appear, a UI package has quietly grown a schema.
select hasnt_table('public', 'task_comments',
  'no task_comments table: WP5D is UI only and introduces no schema');
select hasnt_table('public', 'notifications',
  'no notifications table: delivery is post-pilot work, not WP5D');

-- Columns -----------------------------------------------------------------
select columns_are('public', 'households', array[
  'id', 'name', 'timezone', 'locale', 'week_starts_on',
  'quiet_hours_start', 'quiet_hours_end', 'created_by',
  'created_at', 'updated_at', 'deleted_at', 'deleted_by'
], 'households has exactly the expected columns');

select columns_are('public', 'member_profiles', array[
  'id', 'household_id', 'display_name', 'avatar_path', 'color_token',
  'date_of_birth', 'is_child', 'is_active', 'pin_auth_enabled',
  'created_at', 'updated_at', 'deleted_at', 'deleted_by'
], 'member_profiles has exactly the expected columns');

select columns_are('public', 'household_members', array[
  'id', 'household_id', 'auth_user_id', 'profile_id', 'role', 'status',
  'joined_at', 'access_expires_at', 'created_at', 'updated_at'
], 'household_members has exactly the expected columns');

select columns_are('public', 'household_invitations', array[
  'id', 'household_id', 'role', 'token_hash', 'invited_email', 'expires_at',
  'max_uses', 'used_count', 'revoked_at', 'created_by', 'created_at', 'updated_at'
], 'household_invitations has exactly the expected columns');

-- Decision D3: no PIN credential material anywhere in the public schema.
select hasnt_column('public', 'member_profiles', 'pin_hash',
  'member_profiles stores NO pin_hash (D3 / ADR-025)');
select is(
  (select count(*) from information_schema.columns
    where table_schema = 'public' and column_name in ('pin_hash', 'pin_salt', 'pin')),
  0::bigint,
  'no PIN credential column exists anywhere in the public schema'
);

-- Primary keys
select col_is_pk('public', 'households', 'id', 'households.id is the primary key');
select col_is_pk('public', 'member_profiles', 'id', 'member_profiles.id is the primary key');
select col_is_pk('public', 'household_members', 'id', 'household_members.id is the primary key');
select col_is_pk('public', 'household_invitations', 'id', 'household_invitations.id is the primary key');

-- Nullability -------------------------------------------------------------
select col_not_null('public', 'member_profiles', 'household_id', 'member_profiles.household_id is NOT NULL');
select col_not_null('public', 'household_members', 'household_id', 'household_members.household_id is NOT NULL');
select col_not_null('public', 'household_members', 'profile_id', 'household_members.profile_id is NOT NULL');
select col_not_null('public', 'household_members', 'role', 'household_members.role is NOT NULL');
select col_not_null('public', 'household_members', 'status', 'household_members.status is NOT NULL');
select col_not_null('public', 'household_invitations', 'token_hash', 'invitation token_hash is NOT NULL');
select col_not_null('public', 'household_invitations', 'expires_at', 'invitation expires_at is NOT NULL');

-- auth_user_id must stay nullable: children and other non-login profiles have
-- no account (ADR-013).
select col_is_null('public', 'household_members', 'auth_user_id',
  'household_members.auth_user_id is nullable for child/non-login profiles');

-- Defaults ----------------------------------------------------------------
select col_has_default('public', 'households', 'id', 'households.id has a default (gen_random_uuid)');
select col_default_is('public', 'household_members', 'status', 'invited',
  'membership status defaults to invited');
select col_default_is('public', 'member_profiles', 'pin_auth_enabled', 'false',
  'pin_auth_enabled defaults to false (D3)');
select col_default_is('public', 'household_invitations', 'used_count', '0',
  'invitation used_count defaults to 0');

select * from finish();
rollback;
