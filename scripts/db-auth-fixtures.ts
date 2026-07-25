// Deterministic Auth-backed fixtures for the WP4 RLS test suite.
//
// Auth identities are created through the Auth admin API — never by inserting
// into auth.users with SQL. Domain rows are created with the service-role key
// through PostgREST, which is why WP4 grants service_role DML (ADR-030).
//
// Idempotent: `setup` always tears down first, so repeated local runs converge.
// Nothing here prints a password, token or key.
//
// Usage: bun scripts/db-auth-fixtures.ts setup|cleanup
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFixturePassword, readLocalSupabaseConfig } from "./_supabase-local";

const EMAIL_DOMAIN = "@tori.invalid";

export const HOUSEHOLD = {
  a: "aaaa0000-0000-4000-8000-000000000001",
  b: "bbbb0000-0000-4000-8000-000000000001",
  deleted: "dddd0000-0000-4000-8000-000000000001",
} as const;

export const PROFILE = {
  aOwner: "aaaa0000-0000-4000-8000-000000000101",
  aAdult: "aaaa0000-0000-4000-8000-000000000102",
  aChild: "aaaa0000-0000-4000-8000-000000000103",
  aGuest: "aaaa0000-0000-4000-8000-000000000104",
  aServiceProvider: "aaaa0000-0000-4000-8000-000000000105",
  aSuspended: "aaaa0000-0000-4000-8000-000000000106",
  aRevoked: "aaaa0000-0000-4000-8000-000000000107",
  aExpired: "aaaa0000-0000-4000-8000-000000000108",
  aInactive: "aaaa0000-0000-4000-8000-000000000109",
  aMulti: "aaaa0000-0000-4000-8000-000000000110",
  bOwner: "bbbb0000-0000-4000-8000-000000000101",
  bAdult: "bbbb0000-0000-4000-8000-000000000102",
  bMulti: "bbbb0000-0000-4000-8000-000000000103",
  deletedOwner: "dddd0000-0000-4000-8000-000000000101",
} as const;

export const INVITATION = {
  aActive: "aaaa0000-0000-4000-8000-000000000201",
  aRevoked: "aaaa0000-0000-4000-8000-000000000202",
  bActive: "bbbb0000-0000-4000-8000-000000000201",
} as const;

/** Every fixture Auth identity. The child deliberately has none (ADR-013). */
export const USER_KEYS = [
  "a-owner",
  "a-adult",
  "a-guest",
  "a-service-provider",
  "a-suspended",
  "a-revoked",
  "a-expired",
  "a-inactive",
  "b-owner",
  "b-adult",
  "multi",
  "unrelated",
] as const;

export type UserKey = (typeof USER_KEYS)[number];

export function emailFor(key: UserKey): string {
  return `tori-wp4-${key}${EMAIL_DOMAIN}`;
}

function adminClient(): SupabaseClient {
  const config = readLocalSupabaseConfig();
  // A dedicated service-role client. signIn is NEVER called on this client.
  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function deleteFixtureUsers(admin: SupabaseClient): Promise<number> {
  let removed = 0;
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`listUsers failed: ${error.message}`);
  for (const user of data.users) {
    if (user.email && user.email.endsWith(EMAIL_DOMAIN)) {
      const { error: delError } = await admin.auth.admin.deleteUser(user.id);
      if (delError) throw new Error(`deleteUser failed for ${user.email}: ${delError.message}`);
      removed += 1;
    }
  }
  return removed;
}

async function deleteFixtureHouseholds(admin: SupabaseClient): Promise<void> {
  // Deleting the household cascades to profiles, memberships and invitations.
  const { error } = await admin
    .from("households")
    .delete()
    .in("id", [HOUSEHOLD.a, HOUSEHOLD.b, HOUSEHOLD.deleted]);
  if (error) throw new Error(`household cleanup failed: ${error.message}`);
}

export async function cleanup(): Promise<void> {
  const admin = adminClient();
  // Domain rows first: memberships reference auth.users ON DELETE CASCADE, so
  // removing them first keeps the teardown order explicit rather than implicit.
  await deleteFixtureHouseholds(admin);
  const removed = await deleteFixtureUsers(admin);
  console.log(`[db:fixtures] cleanup complete — removed ${removed} fixture Auth identities`);
}

export async function setup(): Promise<Record<UserKey, string>> {
  const password = readFixturePassword();
  const admin = adminClient();

  // Idempotency: always start from a clean slate.
  await deleteFixtureHouseholds(admin);
  await deleteFixtureUsers(admin);

  const ids = {} as Record<UserKey, string>;
  for (const key of USER_KEYS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: emailFor(key),
      password,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(`createUser failed for ${emailFor(key)}: ${error?.message ?? "no user"}`);
    }
    ids[key] = data.user.id;
  }

  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // `defaultToNull: false` sends Prefer: missing=default, so a key omitted from
  // one row of a multi-row insert takes the column DEFAULT instead of NULL.
  // Without it, PostgREST unions the keys across rows and nulls the gaps, which
  // trips the NOT NULL columns that WP3 deliberately defined.
  const insert = async (table: string, rows: Record<string, unknown>[]): Promise<void> => {
    const { error } = await admin.from(table).insert(rows, { defaultToNull: false });
    if (error) throw new Error(`insert into ${table} failed: ${error.message}`);
  };

  await insert("households", [
    { id: HOUSEHOLD.a, name: "WP4 Household A" },
    { id: HOUSEHOLD.b, name: "WP4 Household B" },
    // Soft-deleted from the start: proves a deleted household is invisible even
    // to a member who otherwise has standing.
    { id: HOUSEHOLD.deleted, name: "WP4 Household D (soft-deleted)", deleted_at: past },
  ]);

  await insert("member_profiles", [
    { id: PROFILE.aOwner, household_id: HOUSEHOLD.a, display_name: "A Owner" },
    { id: PROFILE.aAdult, household_id: HOUSEHOLD.a, display_name: "A Adult" },
    { id: PROFILE.aChild, household_id: HOUSEHOLD.a, display_name: "A Child", is_child: true },
    { id: PROFILE.aGuest, household_id: HOUSEHOLD.a, display_name: "A Guest" },
    { id: PROFILE.aServiceProvider, household_id: HOUSEHOLD.a, display_name: "A Service Provider" },
    { id: PROFILE.aSuspended, household_id: HOUSEHOLD.a, display_name: "A Suspended" },
    { id: PROFILE.aRevoked, household_id: HOUSEHOLD.a, display_name: "A Revoked" },
    { id: PROFILE.aExpired, household_id: HOUSEHOLD.a, display_name: "A Expired Guest" },
    // Active membership but a deactivated profile: access must still fail.
    {
      id: PROFILE.aInactive,
      household_id: HOUSEHOLD.a,
      display_name: "A Inactive Profile",
      is_active: false,
    },
    { id: PROFILE.aMulti, household_id: HOUSEHOLD.a, display_name: "A Multi" },
    { id: PROFILE.bOwner, household_id: HOUSEHOLD.b, display_name: "B Owner" },
    { id: PROFILE.bAdult, household_id: HOUSEHOLD.b, display_name: "B Adult" },
    { id: PROFILE.bMulti, household_id: HOUSEHOLD.b, display_name: "B Multi" },
    { id: PROFILE.deletedOwner, household_id: HOUSEHOLD.deleted, display_name: "D Owner" },
  ]);

  await insert("household_members", [
    {
      household_id: HOUSEHOLD.a,
      profile_id: PROFILE.aOwner,
      auth_user_id: ids["a-owner"],
      role: "owner",
      status: "active",
    },
    {
      household_id: HOUSEHOLD.a,
      profile_id: PROFILE.aAdult,
      auth_user_id: ids["a-adult"],
      role: "adult",
      status: "active",
    },
    // The child has no Auth identity at all.
    {
      household_id: HOUSEHOLD.a,
      profile_id: PROFILE.aChild,
      auth_user_id: null,
      role: "child",
      status: "active",
    },
    {
      household_id: HOUSEHOLD.a,
      profile_id: PROFILE.aGuest,
      auth_user_id: ids["a-guest"],
      role: "guest",
      status: "active",
      access_expires_at: future,
    },
    {
      household_id: HOUSEHOLD.a,
      profile_id: PROFILE.aServiceProvider,
      auth_user_id: ids["a-service-provider"],
      role: "service_provider",
      status: "active",
    },
    {
      household_id: HOUSEHOLD.a,
      profile_id: PROFILE.aSuspended,
      auth_user_id: ids["a-suspended"],
      role: "adult",
      status: "suspended",
    },
    {
      household_id: HOUSEHOLD.a,
      profile_id: PROFILE.aRevoked,
      auth_user_id: ids["a-revoked"],
      role: "adult",
      status: "revoked",
    },
    {
      household_id: HOUSEHOLD.a,
      profile_id: PROFILE.aExpired,
      auth_user_id: ids["a-expired"],
      role: "guest",
      status: "active",
      access_expires_at: past,
    },
    {
      household_id: HOUSEHOLD.a,
      profile_id: PROFILE.aInactive,
      auth_user_id: ids["a-inactive"],
      role: "adult",
      status: "active",
    },
    {
      household_id: HOUSEHOLD.a,
      profile_id: PROFILE.aMulti,
      auth_user_id: ids["multi"],
      role: "adult",
      status: "active",
    },
    {
      household_id: HOUSEHOLD.b,
      profile_id: PROFILE.bOwner,
      auth_user_id: ids["b-owner"],
      role: "owner",
      status: "active",
    },
    {
      household_id: HOUSEHOLD.b,
      profile_id: PROFILE.bAdult,
      auth_user_id: ids["b-adult"],
      role: "adult",
      status: "active",
    },
    // Same Auth identity, second household — legal, and scoped separately.
    {
      household_id: HOUSEHOLD.b,
      profile_id: PROFILE.bMulti,
      auth_user_id: ids["multi"],
      role: "adult",
      status: "active",
    },
    // Owner of a soft-deleted household.
    {
      household_id: HOUSEHOLD.deleted,
      profile_id: PROFILE.deletedOwner,
      auth_user_id: ids["a-owner"],
      role: "owner",
      status: "active",
    },
  ]);

  // token_hash values are arbitrary local test bytes; no raw token exists.
  await insert("household_invitations", [
    {
      id: INVITATION.aActive,
      household_id: HOUSEHOLD.a,
      role: "adult",
      token_hash: "\\xa1a1",
      expires_at: future,
    },
    {
      id: INVITATION.aRevoked,
      household_id: HOUSEHOLD.a,
      role: "guest",
      token_hash: "\\xa2a2",
      expires_at: future,
      revoked_at: past,
    },
    {
      id: INVITATION.bActive,
      household_id: HOUSEHOLD.b,
      role: "adult",
      token_hash: "\\xb1b1",
      expires_at: future,
    },
  ]);

  console.log(
    `[db:fixtures] setup complete — ${USER_KEYS.length} Auth identities, 3 households, ` +
      `14 profiles, 14 memberships, 3 invitations`,
  );
  return ids;
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command === "setup") {
    await setup();
  } else if (command === "cleanup") {
    await cleanup();
  } else {
    console.error("[db:fixtures] usage: bun scripts/db-auth-fixtures.ts setup|cleanup");
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((err: unknown) => {
    console.error(`[db:fixtures] FAILED: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
