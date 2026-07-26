// Family Pilot — hosted-preview bootstrap (WP5A hosted conversion).
//
// Converges the APPROVED hosted, non-production project on exactly one pilot
// household, four member profiles and four memberships, with a single Auth
// identity linked to the owner profile. Idempotent: running it twice changes
// nothing.
//
// SERVER ONLY. Auth identities are created through the Auth admin API, never by
// SQL. Personal data comes from the git-ignored local pilot configuration and is
// never committed. Nothing here prints a name, password or key.
//
// Usage (all values process-local):
//   TORI_PILOT_MODE=hosted-preview TORI_HOSTED_PROJECT_REF=… \
//   TORI_HOSTED_SUPABASE_URL=… TORI_HOSTED_SERVICE_ROLE_KEY=… \
//   TORI_HOSTED_PILOT_PASSWORD=… bun run pilot:bootstrap:hosted
import { PilotGuardError } from "./_pilot";
import { assertHostedPilotEnvironment } from "./_pilot-hosted";
import {
  ensureAuthIdentity,
  ensureHousehold,
  ensureMemberships,
  ensureProfiles,
  readConvergedState,
} from "./_pilot-converge";

async function main(): Promise<void> {
  const { config, password, admin, projectRef } = assertHostedPilotEnvironment();

  const authUserId = await ensureAuthIdentity(admin, config.adultPilotIdentity.email, password);
  await ensureHousehold(admin, config);
  await ensureProfiles(admin, config);
  const { inserted, updated, unchanged } = await ensureMemberships(admin, config, authUserId);
  const state = await readConvergedState(admin, config);

  console.log(
    `[pilot:bootstrap:hosted] converged against project ${projectRef}\n` +
      `  household:     ${state.households}\n` +
      `  profiles:      ${state.profiles} (${state.children} child)\n` +
      `  memberships:   ${inserted} inserted, ${updated} updated, ${unchanged} already correct\n` +
      `  linked owner:  ${state.linkedMemberships} (owner: ${state.linkedIsOwner})\n` +
      `  auth identity: ${state.authIdentityPresent ? "present" : "missing"}\n` +
      `  state: ${state.converged ? "CONVERGED" : "NOT CONVERGED"}`,
  );

  if (!state.converged) process.exit(1);
}

main().catch((err: unknown) => {
  const guard = err instanceof PilotGuardError;
  console.error(
    `[pilot:bootstrap:hosted] ${guard ? "REFUSED" : "FAILED"}: ${
      err instanceof Error ? err.message : String(err)
    }`,
  );
  process.exit(1);
});
