// Family Pilot — idempotent LOCAL bootstrap (WP5A).
//
// Converges the LOCAL Supabase CLI stack on exactly one pilot household, four
// member profiles and four memberships, with a single Auth identity attached to
// the owner profile. Running it repeatedly produces the same state.
//
// The convergence logic itself lives in _pilot-converge.ts and is shared with
// the hosted bootstrap, so "converged" can never mean two different things in
// the two environments. Only the guard differs: this entry point accepts the
// local Supabase stack and nothing else.
//
// SERVER ONLY. Auth identities are created through the Auth admin API, never by
// SQL against auth.users. Domain rows are written with a service-role client
// that exists only in this process. No secret is ever logged.
//
// Usage: TORI_PILOT_MODE=local TORI_PILOT_PASSWORD=… bun run pilot:bootstrap
import { assertLocalPilotEnvironment, PilotGuardError } from "./_pilot";
import {
  ensureAuthIdentity,
  ensureHousehold,
  ensureMemberships,
  ensureProfiles,
} from "./_pilot-converge";

async function main(): Promise<void> {
  const { config, password, admin, url } = assertLocalPilotEnvironment();

  const authUserId = await ensureAuthIdentity(admin, config.adultPilotIdentity.email, password);
  await ensureHousehold(admin, config);
  await ensureProfiles(admin, config);
  const { inserted, updated, unchanged } = await ensureMemberships(admin, config, authUserId);

  // Counts and roles only — never a name, never a secret.
  console.log(
    `[pilot:bootstrap] converged against ${url}\n` +
      `  household: 1 (id ${config.household.id})\n` +
      `  profiles:  ${config.profiles.length}\n` +
      `  memberships: ${inserted} inserted, ${updated} updated, ${unchanged} already correct\n` +
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
