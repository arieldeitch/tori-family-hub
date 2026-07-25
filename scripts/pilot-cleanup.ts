// Family Pilot — remove the local pilot household and its Auth identity (WP5A).
//
// Targets ONLY the household id named in the pilot configuration, and only the
// single configured pilot email. It never deletes anything else, and it refuses
// to run without the same fail-closed environment guard as bootstrap.
//
// SERVER ONLY. Usage:
//   TORI_PILOT_MODE=local TORI_PILOT_PASSWORD=… bun run pilot:cleanup
import { assertLocalPilotEnvironment, findPilotAuthUserId, PilotGuardError } from "./_pilot";

async function main(): Promise<void> {
  const { config, admin, url } = assertLocalPilotEnvironment();

  // Deleting the household cascades to its profiles and memberships (WP3).
  // Scoped by the configured id — never a blanket delete.
  const { error: hErr } = await admin.from("households").delete().eq("id", config.household.id);
  if (hErr) throw new Error(`household cleanup failed: ${hErr.message}`);

  let removedIdentities = 0;
  const authUserId = await findPilotAuthUserId(admin, config.adultPilotIdentity.email);
  if (authUserId) {
    const { error } = await admin.auth.admin.deleteUser(authUserId);
    if (error) throw new Error(`deleteUser failed: ${error.message}`);
    removedIdentities = 1;
  }

  console.log(
    `[pilot:cleanup] done against ${url}\n` +
      `  household removed: ${config.household.id} (profiles and memberships cascaded)\n` +
      `  auth identities removed: ${removedIdentities}\n` +
      "  the shared seed is untouched and remains business-empty",
  );
}

main().catch((err: unknown) => {
  const guard = err instanceof PilotGuardError;
  console.error(
    `[pilot:cleanup] ${guard ? "REFUSED" : "FAILED"}: ${
      err instanceof Error ? err.message : String(err)
    }`,
  );
  process.exit(1);
});
