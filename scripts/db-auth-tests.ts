// WP4 Auth-backed integration tests.
//
// Exercises the real client path: a publishable-key browser client, a genuine
// password sign-in, and PostgREST — proving the policies hold end to end and not
// only inside the database session used by pgTAP.
//
// Requires fixtures (bun run db:test:auth-suite). Never logs a password, token
// or key: assertion output carries only table names and PostgREST error codes.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { emailFor, HOUSEHOLD, PROFILE, type UserKey } from "./db-auth-fixtures";
import { readFixturePassword, readLocalSupabaseConfig } from "./_supabase-local";

let passed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    passed += 1;
  } else {
    failures.push(detail ? `${name} — ${detail}` : name);
  }
}

const config = readLocalSupabaseConfig();
const password = readFixturePassword();

/** A separate publishable-key client per identity — never the service client. */
async function signIn(key: UserKey): Promise<SupabaseClient> {
  const client = createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: emailFor(key),
    password,
  });
  if (error) throw new Error(`sign-in failed for ${emailFor(key)}: ${error.message}`);
  return client;
}

async function main(): Promise<void> {
  // --- Reads are scoped to the caller's household --------------------------
  const aOwner = await signIn("a-owner");
  {
    const { data, error } = await aOwner.from("households").select("id,name");
    check("owner reads exactly one household", !error && data?.length === 1, error?.message);
    check("the household is Household A", data?.[0]?.id === HOUSEHOLD.a);
  }
  {
    const { data } = await aOwner.from("households").select("id").eq("id", HOUSEHOLD.b);
    check("owner cannot read household B over the API", data?.length === 0);
  }
  {
    const { data } = await aOwner.from("member_profiles").select("id");
    check("owner sees the nine active profiles of household A", data?.length === 9);
  }
  {
    const { data } = await aOwner.from("household_members").select("id");
    check("owner sees the ten membership rows of household A", data?.length === 10);
  }
  {
    const { data } = await aOwner.from("household_invitations").select("id");
    check("owner lists the two invitations of household A", data?.length === 2);
  }

  // --- Sensitive columns are unreachable over the API ----------------------
  {
    const { error } = await aOwner.from("household_invitations").select("token_hash");
    check("token_hash cannot be selected over the API", Boolean(error));
  }
  {
    const { error } = await aOwner.from("household_members").select("auth_user_id");
    check("auth_user_id cannot be selected over the API", Boolean(error));
  }
  {
    const { error } = await aOwner.from("member_profiles").select("date_of_birth");
    check("date_of_birth cannot be selected over the API", Boolean(error));
  }
  {
    const { data } = await aOwner.from("household_invitations").select("*").limit(1);
    const keys = data?.[0] ? Object.keys(data[0]) : [];
    check("select * on invitations never returns token_hash", !keys.includes("token_hash"));
    check("select * on invitations never returns created_by", !keys.includes("created_by"));
  }
  {
    const { data } = await aOwner.from("household_members").select("*").limit(1);
    const keys = data?.[0] ? Object.keys(data[0]) : [];
    check("select * on memberships never returns auth_user_id", !keys.includes("auth_user_id"));
  }
  {
    const { data } = await aOwner.from("member_profiles").select("*").limit(1);
    const keys = data?.[0] ? Object.keys(data[0]) : [];
    check("select * on profiles never returns date_of_birth", !keys.includes("date_of_birth"));
  }

  // --- Membership authority is unreachable ---------------------------------
  {
    const { error } = await aOwner.from("household_members").insert({
      household_id: HOUSEHOLD.a,
      profile_id: PROFILE.aOwner,
      role: "owner",
      status: "active",
    });
    check("membership cannot be inserted over the API", Boolean(error));
  }
  {
    const { error } = await aOwner
      .from("household_members")
      .update({ role: "owner" })
      .eq("household_id", HOUSEHOLD.a);
    check("membership role cannot be updated over the API", Boolean(error));
  }
  {
    const { error } = await aOwner.from("households").insert({ name: "Rogue household" });
    check("households cannot be created over the API", Boolean(error));
  }
  {
    const { error } = await aOwner.from("household_invitations").insert({
      household_id: HOUSEHOLD.a,
      role: "adult",
      token_hash: "\\xfeed",
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });
    check("invitations cannot be created over the API", Boolean(error));
  }

  // --- The private helpers are not RPC endpoints ---------------------------
  {
    const session = (await aOwner.auth.getSession()).data.session;
    const res = await fetch(`${config.url}/rest/v1/rpc/is_active_household_member`, {
      method: "POST",
      headers: {
        apikey: config.publishableKey,
        authorization: `Bearer ${session?.access_token ?? ""}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ p_household_id: HOUSEHOLD.a }),
    });
    check(
      "authorization helpers are not exposed as Data API RPC endpoints",
      res.status === 404,
      `expected 404, got ${res.status}`,
    );
  }

  // --- Denied identities ---------------------------------------------------
  for (const key of ["a-suspended", "a-revoked", "a-expired", "unrelated"] as const) {
    const client = await signIn(key);
    const { data } = await client.from("households").select("id");
    check(`${key} sees no household over the API`, data?.length === 0);
    const { data: profiles } = await client.from("member_profiles").select("id");
    check(`${key} sees no profile over the API`, profiles?.length === 0);
    await client.auth.signOut();
  }

  // --- Scoped visibility ---------------------------------------------------
  {
    const guest = await signIn("a-guest");
    const { data } = await guest.from("member_profiles").select("id");
    check("a guest sees only their own profile over the API", data?.length === 1);
    const { data: invites } = await guest.from("household_invitations").select("id");
    check("a guest lists no invitations over the API", invites?.length === 0);
    await guest.auth.signOut();
  }
  {
    const adult = await signIn("a-adult");
    const { data } = await adult.from("household_invitations").select("id");
    check("an adult lists no invitations over the API (owner-only in WP4)", data?.length === 0);
    await adult.auth.signOut();
  }
  {
    const multi = await signIn("multi");
    const { data } = await multi.from("households").select("id");
    check("one Auth identity reads both of its households over the API", data?.length === 2);
    await multi.auth.signOut();
  }

  // --- Anonymous (publishable key, no session) -----------------------------
  {
    const anon = createClient(config.url, config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await anon.from("households").select("id");
    check("an unauthenticated client reads nothing", Boolean(error) || data?.length === 0);
  }

  // --- Permitted writes ----------------------------------------------------
  {
    const { error } = await aOwner
      .from("households")
      .update({ name: "Renamed over the API" })
      .eq("id", HOUSEHOLD.a);
    check("owner can update their household over the API", !error, error?.message);
    const { data } = await aOwner.from("households").select("name").eq("id", HOUSEHOLD.a);
    check("the household rename persisted", data?.[0]?.name === "Renamed over the API");
  }
  {
    const adult = await signIn("a-adult");
    await adult.from("households").update({ name: "Adult attempt" }).eq("id", HOUSEHOLD.a);
    const { data } = await adult.from("households").select("name").eq("id", HOUSEHOLD.a);
    check(
      "an adult cannot rename the household over the API",
      data?.[0]?.name === "Renamed over the API",
    );
    await adult.auth.signOut();
  }
  await aOwner.auth.signOut();

  // --- Report --------------------------------------------------------------
  if (failures.length > 0) {
    console.error(`[db:test:auth] FAILED — ${failures.length} of ${passed + failures.length}:`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`[db:test:auth] OK — ${passed}/${passed} Auth-backed integration assertions passed`);
}

main().catch((err: unknown) => {
  console.error(`[db:test:auth] FAILED: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
