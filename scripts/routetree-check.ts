// Fail if the committed src/routeTree.gen.ts is out of date vs what the build
// just generated. TanStack Start regenerates the route tree during `vite build`
// (and `vite dev`), so this must run IMMEDIATELY AFTER `bun run build` — on its
// own it only asserts that the build left the tracked file untouched.
//
// The route tree is committed generated runtime source (see docs/decisions.md,
// ADR-022): a clean checkout must build to an identical file. Line endings are
// normalized to LF by .gitattributes, so the comparison is line-ending agnostic.
import { spawnSync } from "node:child_process";

const FILE = "src/routeTree.gen.ts";

function main(): void {
  // Args array, no shell — a repository path containing spaces never breaks the
  // invocation (same convention as the db scripts).
  const result = spawnSync("git", ["diff", "--exit-code", "--", FILE], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.error) {
    console.error(`[routes:check] could not run git: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    if (result.stdout) console.error(result.stdout);
    console.error(
      `[routes:check] ${FILE} is OUT OF DATE.\n` +
        "The build regenerated it with different content than the committed file.\n" +
        "Fix: run `bun run build`, then commit the regenerated file. Do not edit it by hand.",
    );
    process.exit(1);
  }

  console.log(`[routes:check] ${FILE} is up to date.`);
}

main();
