// WP4 Auth-backed database suite orchestrator.
//
// Runs, in the order the approved plan requires:
//   1. create deterministic Auth + domain fixtures
//   2. behavioural pgTAP RLS tests (supabase/tests/rls only)
//   3. publishable-key Auth-backed integration tests
//   4. cleanup, in a finally block, on both passing and failing paths
//
// The structural pgTAP suite deliberately runs BEFORE this script (it asserts
// the shared seed is business-empty, which is only true without fixtures).
//
// A throwaway password is generated per run and passed to the child processes
// through the environment. It is never written to disk, never logged, and never
// committed.
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const password = `Tori-${randomUUID()}-Wp4!`;

function run(label: string, args: string[]): void {
  console.log(`[db:auth-suite] ${label}`);
  const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
    env: { ...process.env, TORI_TEST_PASSWORD: password },
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed (exit ${result.status ?? "null"})`);
  }
}

function main(): void {
  let failure: unknown = null;
  try {
    run("setup fixtures (Auth admin API + service_role domain rows)", [
      "scripts/db-auth-fixtures.ts",
      "setup",
    ]);
    run("behavioural RLS pgTAP tests", [
      "x",
      "supabase",
      "test",
      "db",
      "--local",
      "supabase/tests/rls",
    ]);
    run("publishable-key Auth-backed integration tests", ["scripts/db-auth-tests.ts"]);
  } catch (err) {
    failure = err;
  } finally {
    // Cleanup must run on both the passing and failing path, so a red test can
    // never leave fixture identities or domain rows behind.
    try {
      run("cleanup fixtures", ["scripts/db-auth-fixtures.ts", "cleanup"]);
    } catch (cleanupErr) {
      console.error(
        `[db:auth-suite] cleanup FAILED: ${
          cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr)
        }`,
      );
      if (!failure) failure = cleanupErr;
    }
  }

  if (failure) {
    console.error(
      `[db:auth-suite] FAILED: ${failure instanceof Error ? failure.message : String(failure)}`,
    );
    process.exit(1);
  }
  console.log(
    "[db:auth-suite] OK — fixtures created, RLS + integration tests passed, cleanup done",
  );
}

main();
