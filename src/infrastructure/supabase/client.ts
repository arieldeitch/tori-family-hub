// Supabase browser client — INFRASTRUCTURE SCAFFOLD ONLY.
//
// This client is not connected to any business module. All modules still read
// and write in-memory mock repositories (see docs/project-status.md). There is
// no Auth flow, no session UI, and no RLS yet. Do NOT use this client for
// business reads/writes until a later work package wires it up.
//
// The service role key is never used here — only the public URL + publishable
// (anon) key from `getSupabasePublicEnv()`.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabasePublicEnv } from "./env";

// Cache the client on globalThis so Vite HMR does not create a new client on
// every hot reload (which would leak connections / duplicate listeners).
const CACHE_KEY = "__tori_supabase_client__";
type ClientCache = { [CACHE_KEY]?: SupabaseClient<Database> };
const globalCache = globalThis as unknown as ClientCache;

/**
 * Lazily create (once) and return the scaffold Supabase browser client.
 * Auth is intentionally inert: no session persistence, no auto-refresh, no URL
 * session detection — nothing should create hidden auth state before Auth lands.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  const existing = globalCache[CACHE_KEY];
  if (existing) return existing;

  const env = getSupabasePublicEnv();
  const client = createClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  globalCache[CACHE_KEY] = client;
  return client;
}
