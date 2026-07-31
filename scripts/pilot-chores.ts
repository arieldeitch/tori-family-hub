// Family Pilot — load the approved chores into the LOCAL Supabase stack.
//
// Reuses the existing local guard verbatim (`assertLocalPilotEnvironment`), so
// this command inherits the same refusal rules as every other pilot write: it
// runs only when TORI_PILOT_MODE=local AND the Supabase target independently
// proves to be the CLI stack on this machine. A hosted URL is refused outright.
//
// There is deliberately NO hosted counterpart yet. The hosted project is still
// two migrations behind, and loading chores into it is a separate, approval-
// gated step (ADR-034 keeps the data out of migrations and seed.sql either way).
//
// Usage: bun run pilot:chores
import { assertLocalPilotEnvironment } from "./_pilot";
import { ensureApprovedChores, readChoreState, APPROVED_CHORES } from "./_pilot-chores";

async function main(): Promise<void> {
  const { admin, config } = assertLocalPilotEnvironment();

  const before = await readChoreState(admin, config);
  const result = await ensureApprovedChores(admin, config);
  const after = await readChoreState(admin, config);

  // Counts and shape only — no chore is ever printed next to a person's name.
  console.log(
    `[pilot:chores] converged — ${result.templates} templates, ${result.rules} rotation rules, ` +
      `${result.members} participants`,
  );
  console.log(
    `[pilot:chores] household totals: templates ${before.templates} -> ${after.templates}, ` +
      `rules ${before.rules} -> ${after.rules}, members ${before.members} -> ${after.members}`,
  );
  if (!after.converged) {
    console.error(
      `[pilot:chores] FAILED — expected at least ${APPROVED_CHORES.length} templates and rules`,
    );
    process.exit(1);
  }
  console.log("[pilot:chores] OK — the approved chores are in place and the command is idempotent");
}

main().catch((err: unknown) => {
  console.error(`[pilot:chores] FAILED: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
