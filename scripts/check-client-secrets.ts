// Fail if service-role credential material could reach the browser.
//
// Scans the application source and, when present, the build output for the
// service-role key NAME patterns and — when the key is available in the
// environment — its literal VALUE. The publishable key is public by design and
// is not flagged.
//
// Nothing matched is ever echoed: the report prints the file and the pattern
// label only, never the surrounding text.
import { readdirSync, readFileSync, statSync } from "node:fs";
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
  test: (content: string) => boolean;
}

const rules: Rule[] = [
  {
    label: "service-role key env name",
    test: (c) => /SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|service_role_key/.test(c),
  },
  {
    label: "Supabase secret key prefix (sb_secret_)",
    test: (c) => /sb_secret_/.test(c),
  },
  {
    label: "a VITE_-prefixed service role variable",
    test: (c) => /VITE_[A-Z_]*SERVICE_ROLE/.test(c),
  },
];

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (serviceRoleKey && serviceRoleKey.length >= 20) {
  rules.push({
    label: "the literal service-role key value",
    test: (c) => c.includes(serviceRoleKey),
  });
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

  for (const root of ROOTS) {
    for (const file of walk(resolve(cwd, root))) {
      let content: string;
      try {
        content = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      scanned += 1;
      for (const rule of rules) {
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
