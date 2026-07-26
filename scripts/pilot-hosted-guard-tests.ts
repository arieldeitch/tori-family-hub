// Family Pilot — hosted guard tests (WP5A hosted conversion).
//
// Proves the hosted pathway refuses everything it should. Every case below is
// rejected BEFORE any network call, so this suite needs no hosted credentials,
// contacts no Supabase project, and is safe to run in CI.
//
// Usage: bun run pilot:test:hosted-guard
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  APPROVED_HOSTED_PROJECT_REFS,
  findForbiddenClientEnvNames,
  isApprovedHostedRef,
  isLoopbackUrl,
  projectRefFromUrl,
} from "./_pilot-hosted";

let passed = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail?: string): void => {
  if (ok) passed += 1;
  else failures.push(detail ? `${name} — ${detail}` : name);
};

const APPROVED_REF = APPROVED_HOSTED_PROJECT_REFS[0];
const APPROVED_URL = `https://${APPROVED_REF}.supabase.co`;
const OTHER_REF = "zzzzzzzzzzzzzzzzzzzz";

// --- Pure helpers ----------------------------------------------------------
check("exactly one approved hosted project reference", APPROVED_HOSTED_PROJECT_REFS.length === 1);
check("approved ref is recognised", isApprovedHostedRef(APPROVED_REF));
check("an unknown ref is rejected", !isApprovedHostedRef(OTHER_REF));
check("an empty ref is rejected", !isApprovedHostedRef(""));
check("a hosted URL resolves to its ref", projectRefFromUrl(APPROVED_URL) === APPROVED_REF);
check("a loopback URL resolves to no ref", projectRefFromUrl("http://127.0.0.1:55321") === null);
check(
  "a lookalike domain resolves to no ref",
  projectRefFromUrl(`https://${APPROVED_REF}.supabase.evil.com`) === null,
);
check(
  "loopback detection",
  isLoopbackUrl("http://127.0.0.1:55321") && isLoopbackUrl("http://localhost:8080"),
);
check("hosted URL is not loopback", !isLoopbackUrl(APPROVED_URL));
check(
  "client-exposed secrets are detected",
  findForbiddenClientEnvNames({
    VITE_SUPABASE_SERVICE_ROLE_KEY: "x",
    VITE_PILOT_PASSWORD: "x",
    VITE_SUPABASE_ACCESS_TOKEN: "x",
    VITE_SUPABASE_URL: "ok",
  }).length === 3,
);

// --- Guard rejection paths, exercised through the real script --------------
const dir = mkdtempSync(join(tmpdir(), "tori-hosted-guard-"));
const configFile = join(dir, "pilot-household.local.json");
writeFileSync(
  configFile,
  JSON.stringify({
    household: {
      id: "0f110700-0000-4000-8000-00000000e001",
      name: "Placeholder",
      timezone: "Asia/Jerusalem",
      locale: "he-IL",
      weekStartsOn: 0,
    },
    adultPilotIdentity: { email: "guard-placeholder@tori.local", linkedProfileKey: "adult-owner" },
    profiles: [
      {
        key: "adult-owner",
        id: "0f110700-0000-4000-8000-00000000e101",
        displayName: "A",
        isChild: false,
        role: "owner",
      },
      {
        key: "adult-second",
        id: "0f110700-0000-4000-8000-00000000e102",
        displayName: "B",
        isChild: false,
        role: "adult",
      },
      {
        key: "child-first",
        id: "0f110700-0000-4000-8000-00000000e103",
        displayName: "C",
        isChild: true,
        role: "child",
      },
      {
        key: "child-second",
        id: "0f110700-0000-4000-8000-00000000e104",
        displayName: "D",
        isChild: true,
        role: "child",
      },
    ],
  }),
  "utf8",
);

// A syntactically valid but entirely fake key: every case here must be refused
// before it is ever used, so nothing can be authenticated with it.
const FAKE_KEY = "x".repeat(40);
const VALID_ENV: Record<string, string> = {
  TORI_PILOT_MODE: "hosted-preview",
  TORI_HOSTED_PROJECT_REF: APPROVED_REF,
  TORI_HOSTED_SUPABASE_URL: APPROVED_URL,
  TORI_HOSTED_SERVICE_ROLE_KEY: FAKE_KEY,
  TORI_HOSTED_PILOT_PASSWORD: "placeholder-password-1234",
  TORI_PILOT_CONFIG: configFile,
};

function runGuard(overrides: Record<string, string | undefined>): { status: number; out: string } {
  const env: Record<string, string | undefined> = { ...process.env, ...VALID_ENV, ...overrides };
  // Never let a real hosted secret leak in from the ambient environment.
  delete env.SUPABASE_ACCESS_TOKEN;
  const r = spawnSync(process.execPath, ["scripts/pilot-status-hosted.ts"], {
    encoding: "utf8",
    env,
  });
  return { status: r.status ?? -1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

const cases: Array<[string, Record<string, string | undefined>, RegExp]> = [
  ["refuses without the hosted mode flag", { TORI_PILOT_MODE: undefined }, /REFUSED/],
  ["refuses the LOCAL mode value", { TORI_PILOT_MODE: "local" }, /REFUSED/],
  ["refuses an unknown project reference", { TORI_HOSTED_PROJECT_REF: OTHER_REF }, /allowlist/i],
  ["refuses a loopback URL", { TORI_HOSTED_SUPABASE_URL: "http://127.0.0.1:55321" }, /loopback/i],
  [
    "refuses a non-https URL",
    { TORI_HOSTED_SUPABASE_URL: `http://${APPROVED_REF}.supabase.co` },
    /https/i,
  ],
  [
    "refuses a URL for a different project",
    { TORI_HOSTED_SUPABASE_URL: `https://${OTHER_REF}.supabase.co` },
    /approved project reference/i,
  ],
  [
    "refuses when URL and declared ref disagree",
    {
      TORI_HOSTED_PROJECT_REF: APPROVED_REF,
      TORI_HOSTED_SUPABASE_URL: "https://aaaaaaaaaaaaaaaaaaaa.supabase.co",
    },
    /approved project reference|disagree/i,
  ],
  [
    "refuses without a service-role key",
    { TORI_HOSTED_SERVICE_ROLE_KEY: undefined },
    /SERVICE_ROLE_KEY/,
  ],
  [
    "refuses without a hosted password",
    { TORI_HOSTED_PILOT_PASSWORD: undefined },
    /PILOT_PASSWORD/,
  ],
  [
    "refuses a too-short hosted password",
    { TORI_HOSTED_PILOT_PASSWORD: "short" },
    /PILOT_PASSWORD/,
  ],
  [
    "refuses a VITE_-prefixed service-role variable",
    { VITE_SUPABASE_SERVICE_ROLE_KEY: "nope" },
    /VITE_/,
  ],
  ["refuses a VITE_-prefixed password variable", { VITE_PILOT_PASSWORD: "nope" }, /VITE_/],
  ["refuses NODE_ENV=production", { NODE_ENV: "production" }, /REFUSED/],
  ["refuses TORI_ENV=production", { TORI_ENV: "production" }, /REFUSED/],
  [
    "refuses a missing pilot configuration",
    { TORI_PILOT_CONFIG: join(dir, "missing.json") },
    /not found/i,
  ],
];

for (const [name, overrides, pattern] of cases) {
  const r = runGuard(overrides);
  check(name, r.status !== 0 && pattern.test(r.out), r.out.slice(0, 140).replace(/\s+/g, " "));
}

// The local guard must not accept hosted variables, and vice versa: the two
// pathways stay separate (the local script requires TORI_PILOT_MODE=local).
{
  const r = spawnSync(process.execPath, ["scripts/pilot-status.ts"], {
    encoding: "utf8",
    env: { ...process.env, ...VALID_ENV },
  });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  check(
    "the LOCAL guard rejects hosted-preview mode",
    (r.status ?? -1) !== 0 && /REFUSED/.test(out),
  );
}

rmSync(dir, { recursive: true, force: true });

if (failures.length > 0) {
  console.error(
    `[pilot:test:hosted-guard] FAILED — ${failures.length} of ${passed + failures.length}:`,
  );
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`[pilot:test:hosted-guard] OK — ${passed}/${passed} hosted guard assertions passed`);
