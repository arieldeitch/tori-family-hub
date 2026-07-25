// Public Supabase environment — validation.
//
// ONLY public values live here: the local/remote API URL and the *publishable*
// (anon) client key. The service role key must NEVER be read here or reach the
// browser. Validation is lazy (call `getSupabasePublicEnv()`), so importing this
// module never throws at build time — a server-context import that never calls
// the getter will not crash the build.

import { z } from "zod";

const schema = z.object({
  VITE_SUPABASE_URL: z.string().url("VITE_SUPABASE_URL must be a valid URL"),
  VITE_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, "VITE_SUPABASE_PUBLISHABLE_KEY must not be empty"),
});

export type SupabasePublicEnv = z.infer<typeof schema>;

/**
 * Validate the public Supabase env from an arbitrary source record.
 * `source` defaults to Vite's `import.meta.env`; the DB scripts pass
 * `process.env` instead (they run outside Vite). Never logs key values.
 */
export function readSupabasePublicEnv(
  source: Record<string, unknown> = import.meta.env as unknown as Record<string, unknown>,
): SupabasePublicEnv {
  const result = schema.safeParse({
    VITE_SUPABASE_URL: source.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: source.VITE_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!result.success) {
    // Report field names + messages only — never the key values.
    const issues = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(
      `[supabase] Invalid public environment: ${issues}. ` +
        "Copy .env.example to .env.local and fill the values from `bun run supabase:status`.",
    );
  }
  return result.data;
}

let cached: SupabasePublicEnv | null = null;

/** Lazily validated, cached public Supabase env for browser/client usage. */
export function getSupabasePublicEnv(): SupabasePublicEnv {
  if (!cached) cached = readSupabasePublicEnv();
  return cached;
}
