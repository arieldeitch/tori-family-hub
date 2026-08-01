// Family Pilot — load the approved chores into the HOSTED pilot project.
//
// Reuses `assertHostedPilotEnvironment` verbatim, so this inherits the full
// hosted guard unchanged (ADR-037): a declared mode is never sufficient — the
// URL must itself resolve to an allowlisted project reference AND agree with the
// separately declared one, and a loopback URL is refused outright. The local
// guard grants no hosted access and is untouched.
//
// The convergence logic is shared with the local command (`_pilot-chores.ts`),
// so "converged" cannot mean two different things in two environments.
//
// ADR-034 still holds: no pilot data enters a migration or the shared seed.
//
// Usage:
//   TORI_PILOT_MODE=hosted-preview \
//   TORI_HOSTED_PROJECT_REF=... TORI_HOSTED_SUPABASE_URL=... \
//   TORI_HOSTED_SERVICE_ROLE_KEY=... TORI_HOSTED_PILOT_PASSWORD=... \
//   bun run pilot:chores:hosted
import { assertHostedPilotEnvironment } from "./_pilot-hosted";
import { ensureApprovedChores, readChoreState, APPROVED_CHORES } from "./_pilot-chores";

async function main(): Promise<void> {
  const { admin, config, projectRef } = assertHostedPilotEnvironment();

  // Project reference only — it is public, appears in every API URL, and is the
  // one thing worth echoing so the operator can see WHICH project was written to.
  console.log(`[pilot:chores:hosted] target project ref: ${projectRef}`);

  const before = await readChoreState(admin, config);
  const result = await ensureApprovedChores(admin, config);
  const after = await readChoreState(admin, config);

  // Counts and shape only — no chore is ever printed beside a person's name.
  console.log(
    `[pilot:chores:hosted] converged — ${result.templates} templates, ` +
      `${result.rules} rotation rules, ${result.members} participants`,
  );
  console.log(
    `[pilot:chores:hosted] household totals: templates ${before.templates} -> ${after.templates}, ` +
      `rules ${before.rules} -> ${after.rules}, members ${before.members} -> ${after.members}`,
  );

  if (!after.converged) {
    console.error(
      `[pilot:chores:hosted] FAILED — expected at least ${APPROVED_CHORES.length} templates and rules`,
    );
    process.exit(1);
  }
  console.log(
    "[pilot:chores:hosted] OK — the approved chores are in place and this command is idempotent",
  );
}

main().catch((err: unknown) => {
  console.error(
    `[pilot:chores:hosted] FAILED: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
});
