// Family Pilot — shared convergence logic for the local and hosted bootstraps.
//
// One implementation, two guarded entry points. The local bootstrap targets the
// Supabase CLI stack; the hosted bootstrap targets the approved non-production
// hosted project. Neither may diverge in what "converged" means.
//
// SERVER ONLY. Callers pass an already-guarded service-role client; nothing here
// reads credentials or decides whether an environment is safe to write to.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PilotConfig } from "./_pilot";

/** Create the Auth identity, or converge its password if it already exists. */
export async function ensureAuthIdentity(
  admin: SupabaseClient,
  email: string,
  password: string,
): Promise<string> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`listUsers failed: ${error.message}`);
  const existing = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (existing) {
    const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (updateError) throw new Error(`updateUserById failed: ${updateError.message}`);
    return existing.id;
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    throw new Error(`createUser failed: ${createError?.message ?? "no user returned"}`);
  }
  return created.user.id;
}

export async function ensureHousehold(admin: SupabaseClient, config: PilotConfig): Promise<void> {
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

export async function ensureProfiles(admin: SupabaseClient, config: PilotConfig): Promise<void> {
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
 * Reconcile memberships read-first: insert what is missing, update what drifted,
 * remove strays. Live-membership uniqueness is a PARTIAL unique index (WP3), so
 * it cannot be an upsert conflict target — an explicit reconcile is both correct
 * and provably idempotent.
 */
export async function ensureMemberships(
  admin: SupabaseClient,
  config: PilotConfig,
  authUserId: string,
): Promise<{ inserted: number; updated: number; unchanged: number }> {
  const linkedKey = config.adultPilotIdentity.linkedProfileKey;

  const { data: existing, error: readError } = await admin
    .from("household_members")
    .select("id, profile_id, role, status, auth_user_id")
    .eq("household_id", config.household.id);
  if (readError) throw new Error(`membership read failed: ${readError.message}`);

  const byProfile = new Map((existing ?? []).map((row) => [row.profile_id as string, row]));
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  for (const profile of config.profiles) {
    // Only the linked adult carries an Auth identity. Children never do
    // (ADR-013), and the second adult does not in the pilot.
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
    } else {
      unchanged += 1;
    }
  }

  // Anything else in this household is not part of the pilot definition.
  const configured = new Set(config.profiles.map((p) => p.id));
  for (const stray of (existing ?? []).filter((row) => !configured.has(row.profile_id as string))) {
    const { error } = await admin
      .from("household_members")
      .delete()
      .eq("id", stray.id as string);
    if (error) throw new Error(`stray membership cleanup failed: ${error.message}`);
  }

  return { inserted, updated, unchanged };
}

export interface ConvergedState {
  households: number;
  profiles: number;
  children: number;
  memberships: number;
  linkedMemberships: number;
  linkedIsOwner: boolean;
  allActive: boolean;
  authIdentityPresent: boolean;
  converged: boolean;
}

/** Read the current state. Counts and shape only — never a display name. */
export async function readConvergedState(
  admin: SupabaseClient,
  config: PilotConfig,
): Promise<ConvergedState> {
  const [households, profiles, members, users] = await Promise.all([
    admin.from("households").select("id").eq("id", config.household.id),
    admin.from("member_profiles").select("id, is_child").eq("household_id", config.household.id),
    admin
      .from("household_members")
      .select("role, status, auth_user_id")
      .eq("household_id", config.household.id),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const memberRows = members.data ?? [];
  const linked = memberRows.filter((m) => m.auth_user_id !== null);
  const authIdentityPresent = Boolean(
    users.data?.users.some(
      (u) => u.email?.toLowerCase() === config.adultPilotIdentity.email.toLowerCase(),
    ),
  );

  const state: ConvergedState = {
    households: (households.data ?? []).length,
    profiles: (profiles.data ?? []).length,
    children: (profiles.data ?? []).filter((p) => p.is_child).length,
    memberships: memberRows.length,
    linkedMemberships: linked.length,
    linkedIsOwner: linked[0]?.role === "owner",
    allActive: memberRows.length > 0 && memberRows.every((m) => m.status === "active"),
    authIdentityPresent,
    converged: false,
  };

  state.converged =
    state.households === 1 &&
    state.profiles === config.profiles.length &&
    state.memberships === config.profiles.length &&
    state.linkedMemberships === 1 &&
    state.linkedIsOwner &&
    state.allActive &&
    state.authIdentityPresent;

  return state;
}
