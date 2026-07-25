// Family Pilot — privacy guard (WP5A).
//
// Fails if anything from the local pilot configuration has leaked into a file
// Git would track: a migration, the shared seed, a committed fixture, a source
// constant, documentation, or a test name (ADR-034).
//
// Also proves the local configuration file itself is ignored by Git.
//
// Skips cleanly when no local configuration exists (that is the normal CI case),
// so CI never needs — and never sees — personal data.
//
// Usage: bun run check:pilot-privacy
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { DEFAULT_CONFIG_PATH } from "./_pilot";

function git(args: string[]): string {
  const result = spawnSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`git ${args[0]} failed: ${result.stderr || result.error}`);
  }
  return result.stdout ?? "";
}

function main(): void {
  // 1. The local file must be ignored, whether or not it exists right now.
  const ignored = spawnSync("git", ["check-ignore", "-q", DEFAULT_CONFIG_PATH]);
  if (ignored.status !== 0) {
    console.error(
      `[check:pilot-privacy] FAILED: ${DEFAULT_CONFIG_PATH} is not ignored by Git. ` +
        "Real household data must never be committable.",
    );
    process.exit(1);
  }

  // 2. It must not be tracked (a stale entry from before the ignore rule).
  if (git(["ls-files", DEFAULT_CONFIG_PATH]).trim() !== "") {
    console.error(
      `[check:pilot-privacy] FAILED: ${DEFAULT_CONFIG_PATH} is TRACKED by Git. ` +
        "Remove it from the index immediately: git rm --cached " +
        DEFAULT_CONFIG_PATH,
    );
    process.exit(1);
  }

  if (!existsSync(DEFAULT_CONFIG_PATH)) {
    console.log(
      "[check:pilot-privacy] OK — no local pilot configuration present " +
        `(${DEFAULT_CONFIG_PATH} is ignored and untracked); nothing to leak.`,
    );
    return;
  }

  // 3. Nothing from the local configuration may appear in a tracked file.
  const config = JSON.parse(readFileSync(DEFAULT_CONFIG_PATH, "utf8")) as {
    household?: { name?: string };
    adultPilotIdentity?: { email?: string };
    profiles?: Array<{ displayName?: string }>;
  };

  const needles = [config.household?.name, ...(config.profiles ?? []).map((p) => p.displayName)]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 1)
    .map((value) => value.trim());

  if (needles.length === 0) {
    console.log("[check:pilot-privacy] OK — local configuration holds no personal strings.");
    return;
  }

  const tracked = git(["ls-files"]).split("\n").filter(Boolean);
  const violations: string[] = [];

  for (const file of tracked) {
    let content: string;
    try {
      if (statSync(file).size > 8 * 1024 * 1024) continue;
      content = readFileSync(file, "utf8");
    } catch {
      continue; // binary or unreadable — nothing to match
    }
    for (const needle of needles) {
      if (content.includes(needle)) {
        // Report the FILE only. Never echo the personal value itself.
        violations.push(file);
        break;
      }
    }
  }

  if (violations.length > 0) {
    console.error("[check:pilot-privacy] FAILED — pilot household data appears in tracked files:");
    for (const file of violations) console.error(`  - ${file}`);
    console.error(
      "Remove it. Personal pilot data belongs only in the ignored local configuration (ADR-034).",
    );
    process.exit(1);
  }

  console.log(
    `[check:pilot-privacy] OK — scanned ${tracked.length} tracked files; ` +
      `none contain any of the ${needles.length} personal strings from the local configuration.`,
  );
}

main();
