// Generate the dated chore week on the HOSTED pilot project.
//
// Reuses assertHostedPilotEnvironment verbatim, so it inherits the full hosted
// guard: the URL must resolve to an allowlisted project ref AND agree with the
// separately declared one. Shares its generation logic with the local command.
//
// Usage: bun run pilot:week:hosted [weeksAhead]
import { assertHostedPilotEnvironment } from "./_pilot-hosted";
import { generateWeek, readWeekState, rollingWindow } from "./_pilot-week";

async function main(): Promise<void> {
  const { admin, config, projectRef } = assertHostedPilotEnvironment();
  console.log(`[pilot:week:hosted] target project ref: ${projectRef}`);
  const weeksAhead = Number(process.argv[2] ?? 3);
  const today = new Date().toISOString().slice(0, 10);
  const window = rollingWindow(today, Number.isFinite(weeksAhead) ? weeksAhead : 3);

  const before = await readWeekState(admin, config, window);
  const result = await generateWeek(admin, config, window);
  const after = await readWeekState(admin, config, window);

  console.log(
    `[pilot:week:hosted] window ${window.from} … ${window.to} (${result.daysConsidered} days)`,
  );
  console.log(
    `[pilot:week:hosted] created  — occurrences ${result.occurrencesCreated}, ` +
      `assignments ${result.assignmentsCreated}, decisions ${result.decisionsCreated}`,
  );
  console.log(
    `[pilot:week:hosted] existing — occurrences ${result.occurrencesExisting}, ` +
      `assignments ${result.assignmentsExisting}, decisions ${result.decisionsExisting}`,
  );
  console.log(
    `[pilot:week:hosted] totals   — occurrences ${before.occurrences} -> ${after.occurrences}, ` +
      `assignments ${before.assignments} -> ${after.assignments}, ` +
      `decisions ${before.decisions} -> ${after.decisions}`,
  );

  if (after.occurrences === 0) {
    console.error("[pilot:week:hosted] FAILED — the window produced no occurrences");
    process.exit(1);
  }
  console.log("[pilot:week:hosted] OK — the week is generated and this command is idempotent");
}

main().catch((err: unknown) => {
  console.error(`[pilot:week:hosted] FAILED: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
