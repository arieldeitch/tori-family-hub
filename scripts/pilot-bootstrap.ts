// Family Pilot — idempotent local bootstrap (WP5A).
//
// Converges the LOCAL database on exactly one pilot household, four member
// profiles and four memberships, with a single Auth identity attached to the
// owner profile. Running it repeatedly produces the same state — it never
// duplicates.
//
// SERVER ONLY. Auth identities are created through the Auth admin API, never by
// SQL against auth.users. Domain rows are written with a service-role client
// that exists only in this process. No secret is ever logged.
//
// Usage: TORI_PILOT_MODE=local TORI_PILOT_PASSWORD=… bun run pilot:bootstrap
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertLocalPilotEnvironment,
  findPilotAuthUserId,
  PilotGuardError,
  type PilotConfig,
} from "./_pilot";

async function ensureAuthIdentity(
  admin: SupabaseClient,
  email: string,
  password: string,
): Promise<string> {
  const existing = await findPilotAuthUserId(admin, email);
  if (existing) {
    // Converge the password so a changed TORI_PILOT_PASSWORD takes effect.
    const { error } = await admin.auth.admin.updateUserById(existing, {
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`updateUserById failed: ${error.message}`);
    return existing;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`createUser failed: ${error?.message ?? "no user returned"}`);
  }
  return data.user.id;
}

async function ensureHousehold(admin: SupabaseClient, config: PilotConfig): Promise<void> {
  const { error } = await admin.from("households").upsert(
    {
      id: config.household.id,
      name: config.household.name,
      timezone: config.household.timezone,
      locale: config.household.locale,
      week_starts_on: config.household.weekStartsOn,
      deleted_at: null,
      deleted_by: null,
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`household upsert failed: ${error.message}`);
}

async function ensureProfiles(admin: SupabaseClient, config: PilotConfig): Promise<void> {
  const rows = config.profiles.map((profile) => ({
    id: profile.id,
    household_id: config.household.id,
    display_name: profile.displayName,
    is_child: profile.isChild,
    is_active: true,
    deleted_at: null,
    deleted_by: null,
  }));
  const { error } = await admin.from("member_profiles").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`member_profiles upsert failed: ${error.message}`);
}

/**
 * Reconcile memberships by reading first, then inserting what is missing and
 * updating what differs. Live-membership uniqueness is enforced by a PARTIAL
 * unique index (WP3), which is not usable as an upsert conflict target, so an
 * explicit reconcile is both correct and provably idempotent.
 */
async function ensureMemberships(
  admin: SupabaseClient,
  config: PilotConfig,
  authUserId: string,
): Promise<{ inserted: number; updated: number }> {
  const linkedKey = config.adultPilotIdentity.linkedProfileKey;

  const { data: existing, error: readError } = await admin
    .from("household_members")
    .select("id, profile_id, role, status, auth_user_id")
    .eq("household_id", config.household.id);
  if (readError) throw new Error(`membership read failed: ${readError.message}`);

  const byProfile = new Map((existing ?? []).map((row) => [row.profile_id as string, row]));
  let inserted = 0;
  let updated = 0;

  for (const profile of config.profiles) {
    // ONLY the linked adult carries an Auth identity. Children never do
    // (ADR-013) and the second adult does not in the pilot.
    const desired = {
      household_id: config.household.id,
      profile_id: profile.id,
      role: profile.role,
      status: "active" as const,
      auth_user_id: profile.key === linkedKey ? authUserId : null,
    };

    const current = byProfile.get(profile.id);
    if (!current) {
      const { error } = await admin.from("household_members").insert(desired);
      if (error) throw new Error(`membership insert failed for ${profile.key}: ${error.message}`);
      inserted += 1;
      continue;
    }

    const drifted =
      current.role !== desired.role ||
      current.status !== desired.status ||
      (current.auth_user_id ?? null) !== desired.auth_user_id;
    if (drifted) {
      const { error } = await admin
        .from("household_members")
        .update({
          role: desired.role,
          status: desired.status,
          auth_user_id: desired.auth_user_id,
        })
        .eq("id", current.id as string);
      if (error) throw new Error(`membership update failed for ${profile.key}: ${error.message}`);
      updated += 1;
    }
  }

  // Anything else in this household is not part of the pilot definition.
  const configured = new Set(config.profiles.map((p) => p.id));
  const strays = (existing ?? []).filter((row) => !configured.has(row.profile_id as string));
  for (const stray of strays) {
    const { error } = await admin
      .from("household_members")
      .delete()
      .eq("id", stray.id as string);
    if (error) throw new Error(`stray membership cleanup failed: ${error.message}`);
  }

  return { inserted, updated };
}

async function main(): Promise<void> {
  const { config, password, admin, url } = assertLocalPilotEnvironment();

  const authUserId = await ensureAuthIdentity(admin, config.adultPilotIdentity.email, password);
  await ensureHousehold(admin, config);
  await ensureProfiles(admin, config);
  const { inserted, updated } = await ensureMemberships(admin, config, authUserId);

  // Counts and roles only — never a name, never a secret.
  console.log(
    `[pilot:bootstrap] converged against ${url}\n` +
      `  household: 1 (id ${config.household.id})\n` +
      `  profiles:  ${config.profiles.length}\n` +
      `  memberships: ${inserted} inserted, ${updated} updated, ` +
      `${config.profiles.length - inserted - updated} already correct\n` +
      `  auth identity: 1 (linked to the '${config.adultPilotIdentity.linkedProfileKey}' profile)\n` +
      `  sign in at /pilot/signin with ${config.adultPilotIdentity.email}`,
  );
}

main().catch((err: unknown) => {
  const guard = err instanceof PilotGuardError;
  console.error(
    `[pilot:bootstrap] ${guard ? "REFUSED" : "FAILED"}: ${
      err instanceof Error ? err.message : String(err)
    }`,
  );
  process.exit(1);
});
