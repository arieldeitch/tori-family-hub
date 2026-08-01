// Generate the dated chore week on the LOCAL Supabase stack.
//
// Reuses the existing local guard verbatim, so it inherits the same refusal
// rules as every other pilot write. The hosted counterpart is pilot-week-hosted.
//
// Usage: bun run pilot:week [weeksAhead]
import { assertLocalPilotEnvironment } from "./_pilot";
import { generateWeek, readWeekState, rollingWindow } from "./_pilot-week";

async function main(): Promise<void> {
  const { admin, config } = assertLocalPilotEnvironment();
  const weeksAhead = Number(process.argv[2] ?? 3);
  const today = new Date().toISOString().slice(0, 10);
  const window = rollingWindow(today, Number.isFinite(weeksAhead) ? weeksAhead : 3);

  const before = await readWeekState(admin, config, window);
  const result = await generateWeek(admin, config, window);
  const after = await readWeekState(admin, config, window);

  console.log(`[pilot:week] window ${window.from} … ${window.to} (${result.daysConsidered} days)`);
  console.log(
    `[pilot:week] created  — occurrences ${result.occurrencesCreated}, ` +
      `assignments ${result.assignmentsCreated}, decisions ${result.decisionsCreated}`,
  );
  console.log(
    `[pilot:week] existing — occurrences ${result.occurrencesExisting}, ` +
      `assignments ${result.assignmentsExisting}, decisions ${result.decisionsExisting}`,
  );
  console.log(
    `[pilot:week] totals   — occurrences ${before.occurrences} -> ${after.occurrences}, ` +
      `assignments ${before.assignments} -> ${after.assignments}, ` +
      `decisions ${before.decisions} -> ${after.decisions}`,
  );

  if (after.occurrences === 0) {
    console.error("[pilot:week] FAILED — the window produced no occurrences");
    process.exit(1);
  }
  console.log("[pilot:week] OK — the week is generated and this command is idempotent");
}

main().catch((err: unknown) => {
  console.error(`[pilot:week] FAILED: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
