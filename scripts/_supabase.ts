// Shared helpers for the DB scripts. Cross-platform (Windows/macOS/Linux).
import { spawnSync } from "node:child_process";

/**
 * Generate the Database TypeScript types from the LOCAL Supabase stack and
 * return the full file content (with a generated-file header).
 *
 * Invokes the locked Supabase CLI via `<runtime> x supabase …` (bunx) using the
 * current runtime executable and an args array — no shell — so a repository path
 * containing spaces (or a Windows `.cmd` shim) never breaks the invocation.
 */
export function generateDatabaseTypes(): string {
  const result = spawnSync(
    process.execPath,
    ["x", "supabase", "gen", "types", "typescript", "--local"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    throw new Error(
      `supabase gen types failed (exit ${result.status ?? "null"}): ${result.stderr || result.error}`,
    );
  }
  const header =
    "// GENERATED FILE — do not edit by hand.\n" +
    "// Regenerate with `bun run db:types` from the local Supabase stack.\n" +
    "// Reflects the Identity & Household foundation (WP3). RLS is enabled with\n" +
    "// no policies and no client grants, so these tables are not reachable from\n" +
    "// the browser yet — see docs/decisions.md (ADR-023).\n\n";
  // Normalize to LF so the file matches the repo's .gitattributes policy.
  return (header + result.stdout).replace(/\r\n/g, "\n");
}
