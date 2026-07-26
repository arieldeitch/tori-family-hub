// Family Pilot — hosted-preview status (WP5A hosted conversion).
//
// Read-only. Prints counts and shape only — never a display name, never a key.
// SERVER ONLY. Same fail-closed guard as the hosted bootstrap.
//
// Usage: bun run pilot:status:hosted
import { PilotGuardError } from "./_pilot";
import { assertHostedPilotEnvironment } from "./_pilot-hosted";
import { readConvergedState } from "./_pilot-converge";

async function main(): Promise<void> {
  const { config, admin, projectRef } = assertHostedPilotEnvironment();
  const state = await readConvergedState(admin, config);

  console.log(
    `[pilot:status:hosted] project ${projectRef}\n` +
      `  household:     ${state.households} (expected 1)\n` +
      `  profiles:      ${state.profiles} (expected ${config.profiles.length}; ${state.children} child)\n` +
      `  memberships:   ${state.memberships} (expected ${config.profiles.length}), all active: ${state.allActive}\n` +
      `  linked memberships: ${state.linkedMemberships} (expected 1, owner: ${state.linkedIsOwner})\n` +
      `  auth identity: ${state.authIdentityPresent ? "present" : "missing"}\n` +
      `  state: ${state.converged ? "CONVERGED" : "NOT CONVERGED — run `bun run pilot:bootstrap:hosted`"}`,
  );

  if (!state.converged) process.exit(1);
}

main().catch((err: unknown) => {
  const guard = err instanceof PilotGuardError;
  console.error(
    `[pilot:status:hosted] ${guard ? "REFUSED" : "FAILED"}: ${
      err instanceof Error ? err.message : String(err)
    }`,
  );
  process.exit(1);
});
