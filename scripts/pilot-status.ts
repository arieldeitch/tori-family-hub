// Family Pilot — report the converged local state (WP5A).
//
// Read-only. Prints counts, roles and structural facts — never a display name,
// never a secret. SERVER ONLY.
//
// Usage: TORI_PILOT_MODE=local TORI_PILOT_PASSWORD=… bun run pilot:status
import { assertLocalPilotEnvironment, findPilotAuthUserId, PilotGuardError } from "./_pilot";

async function main(): Promise<void> {
  const { config, admin, url } = assertLocalPilotEnvironment();

  const { data: households, error: hErr } = await admin
    .from("households")
    .select("id, name, timezone, locale, week_starts_on, deleted_at")
    .eq("id", config.household.id);
  if (hErr) throw new Error(`household read failed: ${hErr.message}`);

  const { data: profiles, error: pErr } = await admin
    .from("member_profiles")
    .select("id, is_child, is_active, deleted_at")
    .eq("household_id", config.household.id);
  if (pErr) throw new Error(`profile read failed: ${pErr.message}`);

  const { data: members, error: mErr } = await admin
    .from("household_members")
    .select("profile_id, role, status, auth_user_id")
    .eq("household_id", config.household.id);
  if (mErr) throw new Error(`membership read failed: ${mErr.message}`);

  const authUserId = await findPilotAuthUserId(admin, config.adultPilotIdentity.email);
  const linked = (members ?? []).filter((m) => m.auth_user_id !== null);
  const children = (profiles ?? []).filter((p) => p.is_child);
  const roles = (members ?? [])
    .map((m) => m.role as string)
    .sort()
    .join(", ");

  const converged =
    (households?.length ?? 0) === 1 &&
    (profiles?.length ?? 0) === 4 &&
    (members?.length ?? 0) === 4 &&
    linked.length === 1 &&
    authUserId !== null &&
    linked[0]?.auth_user_id === authUserId;

  console.log(
    `[pilot:status] target ${url}\n` +
      `  household:     ${households?.length ?? 0} (expected 1)\n` +
      `  profiles:      ${profiles?.length ?? 0} (expected 4; ${children.length} child)\n` +
      `  memberships:   ${members?.length ?? 0} (expected 4) — roles: ${roles || "none"}\n` +
      `  auth identity: ${authUserId ? "present" : "missing"} (expected present)\n` +
      `  linked memberships: ${linked.length} (expected exactly 1 — the owner)\n` +
      `  children without Auth: ${children.length} of ${children.length} (expected all)\n` +
      `  state: ${converged ? "CONVERGED" : "NOT CONVERGED — run `bun run pilot:bootstrap`"}`,
  );

  if (!converged) process.exit(1);
}

main().catch((err: unknown) => {
  const guard = err instanceof PilotGuardError;
  console.error(
    `[pilot:status] ${guard ? "REFUSED" : "FAILED"}: ${
      err instanceof Error ? err.message : String(err)
    }`,
  );
  process.exit(1);
});
