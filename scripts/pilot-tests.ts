// Family Pilot — bootstrap guard and idempotency tests (WP5A).
//
// Runs against a PLACEHOLDER pilot configuration written to a temp directory,
// never the owner's real `pilot-household.local.json`. That keeps personal data
// out of CI logs entirely while still exercising the real mechanism.
//
// SERVER ONLY. Usage: bun run pilot:test
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { readLocalSupabaseConfig } from "./_supabase-local";

let passed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) passed += 1;
  else failures.push(detail ? `${name} — ${detail}` : name);
}

const HOUSEHOLD_ID = "0f110700-0000-4000-8000-00000000f001";
const PROFILE_IDS = [
  "0f110700-0000-4000-8000-00000000f101",
  "0f110700-0000-4000-8000-00000000f102",
  "0f110700-0000-4000-8000-00000000f103",
  "0f110700-0000-4000-8000-00000000f104",
];

// Placeholder household — deliberately generic. No real person appears here.
const PLACEHOLDER_CONFIG = {
  household: {
    id: HOUSEHOLD_ID,
    name: "WP5A Placeholder Household",
    timezone: "Asia/Jerusalem",
    locale: "he-IL",
    weekStartsOn: 0,
  },
  adultPilotIdentity: {
    email: "wp5a-placeholder-owner@tori.local",
    linkedProfileKey: "adult-owner",
  },
  profiles: [
    {
      key: "adult-owner",
      id: PROFILE_IDS[0],
      displayName: "Adult One",
      isChild: false,
      role: "owner",
    },
    {
      key: "adult-second",
      id: PROFILE_IDS[1],
      displayName: "Adult Two",
      isChild: false,
      role: "adult",
    },
    {
      key: "child-first",
      id: PROFILE_IDS[2],
      displayName: "Child One",
      isChild: true,
      role: "child",
    },
    {
      key: "child-second",
      id: PROFILE_IDS[3],
      displayName: "Child Two",
      isChild: true,
      role: "child",
    },
  ],
};

const PASSWORD = `Wp5a-${Math.abs(HOUSEHOLD_ID.split("").reduce((a, c) => a + c.charCodeAt(0), 0))}-Local!`;

const dir = mkdtempSync(join(tmpdir(), "tori-pilot-"));
const configFile = join(dir, "pilot-household.local.json");
writeFileSync(configFile, JSON.stringify(PLACEHOLDER_CONFIG, null, 2), "utf8");

interface RunResult {
  status: number;
  output: string;
}

function run(script: string, env: Record<string, string | undefined>): RunResult {
  const result = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: { ...process.env, TORI_PILOT_CONFIG: configFile, ...env },
  });
  return {
    status: result.status ?? -1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

const OK_ENV = { TORI_PILOT_MODE: "local", TORI_PILOT_PASSWORD: PASSWORD };

async function main(): Promise<void> {
  const local = readLocalSupabaseConfig();
  const admin = createClient(local.url, local.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // --- Guard: every rejection path -----------------------------------------
  {
    const r = run("scripts/pilot-bootstrap.ts", {
      ...OK_ENV,
      TORI_PILOT_MODE: undefined,
    });
    check("refuses without TORI_PILOT_MODE=local", r.status !== 0 && r.output.includes("REFUSED"));
  }
  {
    const r = run("scripts/pilot-bootstrap.ts", { ...OK_ENV, TORI_PILOT_MODE: "production" });
    check("refuses when TORI_PILOT_MODE is not 'local'", r.status !== 0);
  }
  {
    // A remote-looking target must be rejected even with the flag set.
    const r = run("scripts/pilot-bootstrap.ts", {
      ...OK_ENV,
      VITE_SUPABASE_URL: "https://abcdefghijkl.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "placeholder",
      SUPABASE_SERVICE_ROLE_KEY: "placeholder",
    });
    check(
      "refuses against a non-local Supabase target",
      r.status !== 0 && /loopback|remote/i.test(r.output),
      r.output.slice(0, 160),
    );
  }
  {
    const r = run("scripts/pilot-bootstrap.ts", {
      ...OK_ENV,
      TORI_PILOT_CONFIG: join(dir, "missing.json"),
    });
    check("refuses without pilot configuration", r.status !== 0 && /not found/i.test(r.output));
  }
  {
    const r = run("scripts/pilot-bootstrap.ts", { ...OK_ENV, TORI_PILOT_PASSWORD: undefined });
    check("refuses without a password", r.status !== 0 && r.output.includes("TORI_PILOT_PASSWORD"));
  }
  {
    const r = run("scripts/pilot-bootstrap.ts", {
      ...OK_ENV,
      VITE_SUPABASE_SERVICE_ROLE_KEY: "should-not-exist",
    });
    check(
      "refuses when a VITE_-prefixed service-role variable exists",
      r.status !== 0 && /VITE_/.test(r.output),
    );
  }
  {
    const r = run("scripts/pilot-bootstrap.ts", { ...OK_ENV, NODE_ENV: "production" });
    check("refuses with NODE_ENV=production", r.status !== 0);
  }
  {
    // A config carrying a credential must be rejected outright.
    const bad = join(dir, "with-password.json");
    writeFileSync(
      bad,
      JSON.stringify({ ...PLACEHOLDER_CONFIG, password: "nope" }, null, 2),
      "utf8",
    );
    const r = run("scripts/pilot-bootstrap.ts", { ...OK_ENV, TORI_PILOT_CONFIG: bad });
    check("refuses a configuration containing a password", r.status !== 0);
  }

  // Nothing above may have written anything.
  {
    const { data } = await admin.from("households").select("id").eq("id", HOUSEHOLD_ID);
    check("no rejected run created any data", (data?.length ?? 0) === 0);
  }

  // --- Bootstrap converges ---------------------------------------------------
  const first = run("scripts/pilot-bootstrap.ts", OK_ENV);
  check(
    "bootstrap succeeds with a valid local environment",
    first.status === 0,
    first.output.slice(0, 200),
  );

  const counts = async () => {
    const [h, p, m] = await Promise.all([
      admin.from("households").select("id").eq("id", HOUSEHOLD_ID),
      admin.from("member_profiles").select("id, is_child").eq("household_id", HOUSEHOLD_ID),
      admin
        .from("household_members")
        .select("profile_id, role, status, auth_user_id")
        .eq("household_id", HOUSEHOLD_ID),
    ]);
    return { households: h.data ?? [], profiles: p.data ?? [], members: m.data ?? [] };
  };

  let state = await counts();
  check("bootstrap creates exactly one household", state.households.length === 1);
  check("bootstrap creates exactly four profiles", state.profiles.length === 4);
  check("bootstrap creates exactly four memberships", state.members.length === 4);
  check(
    "roles are one owner, one adult and two children",
    state.members.filter((m) => m.role === "owner").length === 1 &&
      state.members.filter((m) => m.role === "adult").length === 1 &&
      state.members.filter((m) => m.role === "child").length === 2,
  );
  check(
    "exactly one membership is linked to the Auth identity",
    state.members.filter((m) => m.auth_user_id !== null).length === 1,
  );
  check(
    "the linked membership is the owner",
    state.members.find((m) => m.auth_user_id !== null)?.role === "owner",
  );
  check(
    "both child memberships have a null auth_user_id",
    state.members.filter((m) => m.role === "child").every((m) => m.auth_user_id === null),
  );
  check(
    "every membership is active",
    state.members.every((m) => m.status === "active"),
  );

  // --- Idempotency ------------------------------------------------------------
  const second = run("scripts/pilot-bootstrap.ts", OK_ENV);
  check("bootstrap runs a second time cleanly", second.status === 0);
  state = await counts();
  check(
    "running bootstrap twice creates no duplicates",
    state.households.length === 1 && state.profiles.length === 4 && state.members.length === 4,
  );

  // --- Status -----------------------------------------------------------------
  {
    const r = run("scripts/pilot-status.ts", OK_ENV);
    check("status reports the converged state", r.status === 0 && r.output.includes("CONVERGED"));
  }

  // --- Cleanup ----------------------------------------------------------------
  {
    const refused = run("scripts/pilot-cleanup.ts", { ...OK_ENV, TORI_PILOT_MODE: undefined });
    check("cleanup refuses without the environment guard", refused.status !== 0);
  }
  {
    const r = run("scripts/pilot-cleanup.ts", OK_ENV);
    check("cleanup succeeds", r.status === 0, r.output.slice(0, 200));
    state = await counts();
    check(
      "cleanup removes the pilot household, profiles and memberships",
      state.households.length === 0 && state.profiles.length === 0 && state.members.length === 0,
    );
  }
  {
    const r = run("scripts/pilot-status.ts", OK_ENV);
    check(
      "status reports NOT CONVERGED after cleanup",
      r.status !== 0 && r.output.includes("NOT CONVERGED"),
    );
  }
  {
    const again = run("scripts/pilot-bootstrap.ts", OK_ENV);
    check("bootstrap works again after cleanup", again.status === 0);
    state = await counts();
    check(
      "re-bootstrap converges to one household and four profiles",
      state.households.length === 1 && state.profiles.length === 4,
    );
  }

  // Leave the database as we found it. Scoped to the placeholder household —
  // a developer's own local pilot household must survive this suite untouched.
  run("scripts/pilot-cleanup.ts", OK_ENV);
  {
    const { data } = await admin.from("households").select("id").eq("id", HOUSEHOLD_ID);
    check("no placeholder residue remains in the database", (data ?? []).length === 0);
  }
  {
    const { data } = await admin.from("member_profiles").select("id").in("id", PROFILE_IDS);
    check("no placeholder profiles remain", (data ?? []).length === 0);
  }

  // --- Report -----------------------------------------------------------------
  rmSync(dir, { recursive: true, force: true });
  if (failures.length > 0) {
    console.error(`[pilot:test] FAILED — ${failures.length} of ${passed + failures.length}:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`[pilot:test] OK — ${passed}/${passed} pilot bootstrap assertions passed`);
}

main().catch((err: unknown) => {
  rmSync(dir, { recursive: true, force: true });
  console.error(`[pilot:test] FAILED: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
