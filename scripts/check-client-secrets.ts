// Fail if service-role credential material could reach the browser.
//
// Scans the application source and, when present, the build output for the
// service-role key NAME patterns and — when the key is available in the
// environment — its literal VALUE. The publishable key is public by design and
// is not flagged.
//
// Nothing matched is ever echoed: the report prints the file and the pattern
// label only, never the surrounding text.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const ROOTS = ["src", ".output", "dist"];
const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".html",
  ".css",
  ".map",
  ".txt",
  ".webmanifest",
]);

interface Rule {
  label: string;
  /**
   * "name"  - a forbidden variable NAME. Skipped in test files, which must be
   *           able to name a forbidden variable in order to assert it is
   *           rejected. Test files are never bundled into the browser.
   * "value" - actual credential material. Checked EVERYWHERE, including tests:
   *           a real key pasted into a test is still a leak.
   */
  kind: "name" | "value";
  test: (content: string) => boolean;
}

/** Vitest files: present in src/, never shipped to the browser. */
const TEST_FILE = /\.(test|spec)\.[tj]sx?$/;

const rules: Rule[] = [
  {
    kind: "name",
    label: "service-role key env name",
    test: (c) => /SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|service_role_key/.test(c),
  },
  {
    // Require an actual key-shaped value, not the bare prefix: supabase-js
    // itself ships `key.startsWith("sb_secret_")` and a doc comment mentioning
    // the prefix, and flagging the library's own guard would be a false alarm
    // that trains people to ignore this check.
    kind: "value",
    label: "a Supabase secret key value (sb_secret_…)",
    test: (c) => /sb_secret_[A-Za-z0-9_-]{10,}/.test(c),
  },
  {
    kind: "name",
    label: "a VITE_-prefixed service role variable",
    test: (c) => /VITE_[A-Z_]*SERVICE_ROLE/.test(c),
  },
  {
    // The pilot password is server-only: it must never be VITE_-prefixed and
    // must never be read from client code (ADR-034).
    kind: "name",
    label: "a client-exposed pilot password variable",
    test: (c) => /VITE_[A-Z_]*(PILOT_PASSWORD|PASSWORD)/.test(c),
  },
  {
    kind: "name",
    label: "the pilot password env name read from client code",
    test: (c) => /TORI_PILOT_PASSWORD/.test(c),
  },
];

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (serviceRoleKey && serviceRoleKey.length >= 20) {
  rules.push({
    kind: "value",
    label: "the literal service-role key value",
    test: (c) => c.includes(serviceRoleKey),
  });
}

const pilotPassword = process.env.TORI_PILOT_PASSWORD;
if (pilotPassword && pilotPassword.length >= 8) {
  rules.push({
    kind: "value",
    label: "the literal pilot password value",
    test: (c) => c.includes(pilotPassword),
  });
}

/**
 * The ONLY variables permitted in the tracked root `.env` (ADR-038).
 *
 * That file is committed so Lovable's published builds can configure
 * themselves, which makes it the single most likely place for a secret to be
 * added by mistake later. Enforcing an exact allowlist turns a risky pattern
 * into a guarded one: anything unexpected fails the build immediately.
 */
const TRACKED_ENV_FILE = ".env";
const TRACKED_ENV_ALLOWLIST = new Set(["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"]);

/** Parse `KEY=value` lines, ignoring comments and blanks. */
export function parseEnvNames(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => line.split("=", 1)[0]?.trim() ?? "")
    .filter((name) => name.length > 0);
}

/** Violations found in the tracked root .env, if it exists. */
export function checkTrackedEnvFile(cwd: string): string[] {
  const path = resolve(cwd, TRACKED_ENV_FILE);
  if (!existsSync(path)) return [];

  let content: string;
  try {
    content = readFileSync(path, "utf8");
  } catch {
    return [`${TRACKED_ENV_FILE} — could not be read for verification`];
  }

  const problems: string[] = [];
  for (const name of parseEnvNames(content)) {
    if (!TRACKED_ENV_ALLOWLIST.has(name)) {
      // Name only — the value is never echoed, even when rejecting it.
      problems.push(
        `${TRACKED_ENV_FILE} — "${name}" is not permitted in the tracked env file ` +
          `(allowed: ${[...TRACKED_ENV_ALLOWLIST].join(", ")})`,
      );
    }
  }

  // Defence in depth: reject credential-shaped values regardless of the name.
  for (const [label, pattern] of [
    ["a Supabase secret key", /sb_secret_[A-Za-z0-9_-]{10,}/],
    ["a Supabase access token", /sbp_[A-Za-z0-9]{20,}/],
    ["a service-role JWT", /"?eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/],
  ] as const) {
    if (pattern.test(content)) {
      problems.push(`${TRACKED_ENV_FILE} — contains ${label}`);
    }
  }

  return problems;
}

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return; // Root not present (e.g. no build output yet) — nothing to scan.
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let info;
    try {
      info = statSync(full);
    } catch {
      continue;
    }
    if (info.isDirectory()) {
      yield* walk(full);
    } else if (TEXT_EXTENSIONS.has(extname(full))) {
      yield full;
    }
  }
}

function main(): void {
  const cwd = process.cwd();
  const violations: string[] = [];
  let scanned = 0;

  // The tracked root .env is committed on purpose, so it gets its own strict
  // allowlist check in addition to the pattern scan below.
  violations.push(...checkTrackedEnvFile(cwd));

  for (const root of ROOTS) {
    for (const file of walk(resolve(cwd, root))) {
      let content: string;
      try {
        content = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      scanned += 1;
      const isTestFile = TEST_FILE.test(file);
      for (const rule of rules) {
        // Names are allowed in tests; credential VALUES never are.
        if (isTestFile && rule.kind === "name") continue;
        if (rule.test(content)) {
          violations.push(`${relative(cwd, file)} — ${rule.label}`);
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error(
      "[check:client-secrets] FAILED — service-role material in browser-reachable output:",
    );
    for (const violation of violations) console.error(`  - ${violation}`);
    process.exit(1);
  }

  console.log(
    `[check:client-secrets] OK — scanned ${scanned} files across ${ROOTS.join(", ")}; ` +
      `no service-role key name or value found${serviceRoleKey ? " (literal value checked too)" : ""}`,
  );
}

main();
