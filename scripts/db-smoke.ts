// Local Supabase connection smoke test.
//
// Performs a REAL network request against the local stack using ONLY the public
// URL + publishable (anon) key — no service role, no business table query. Bun
// auto-loads .env.local, so the values come from process.env. Proves that the
// API gateway + PostgREST are reachable and accept the publishable key.
//
// Usage: bun run db:smoke  (requires `bun run supabase:start` first)
import { readSupabasePublicEnv } from "../src/infrastructure/supabase/env";

async function main(): Promise<void> {
  const env = readSupabasePublicEnv(process.env as unknown as Record<string, unknown>);
  const base = env.VITE_SUPABASE_URL.replace(/\/+$/, "");
  const url = `${base}/rest/v1/`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
    });
  } catch (err) {
    console.error(
      `[db:smoke] FAILED: could not reach ${url}. Is the stack running (bun run supabase:start)?`,
    );
    console.error(String(err));
    process.exit(1);
    return;
  }

  if (!res.ok) {
    console.error(`[db:smoke] FAILED: ${res.status} ${res.statusText} at ${url}`);
    process.exit(1);
    return;
  }

  console.log(
    `[db:smoke] OK: PostgREST reachable at ${base} (HTTP ${res.status}); publishable key accepted.`,
  );
}

main();
