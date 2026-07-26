// Family Pilot — hosted-preview guard (WP5A hosted conversion).
//
// A SEPARATE pathway from the local guard in _pilot.ts. The local guard still
// means "the Supabase CLI stack on this machine" and is not weakened, widened or
// reused here. This one means "the one approved, non-production hosted project".
//
// SERVER ONLY. Reads the hosted service-role key from the process environment
// and never logs it. The browser never imports this module — `check:client-secrets`
// fails the build if anything from it reaches a bundle.
//
// It refuses to run on a generic mode flag alone: the hosted URL must itself
// resolve to an allowlisted project reference.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadPilotConfig, PilotGuardError, type PilotConfig } from "./_pilot";

/**
 * Exact allowlist of hosted project references this repository may write to.
 *
 * A project ref is public information — it appears in every API URL the browser
 * calls — so keeping it in source is safe, and it is the whole point of the
 * guard: an allowlist that could be overridden by an environment variable would
 * not be an allowlist. Adding an entry must be a reviewed code change.
 */
export const APPROVED_HOSTED_PROJECT_REFS: ReadonlyArray<string> = ["nrfelnchbmofwrfajfai"];

export const HOSTED_MODE_ENV = "TORI_PILOT_MODE";
export const HOSTED_MODE_VALUE = "hosted-preview";
export const HOSTED_REF_ENV = "TORI_HOSTED_PROJECT_REF";
export const HOSTED_URL_ENV = "TORI_HOSTED_SUPABASE_URL";
export const HOSTED_SERVICE_KEY_ENV = "TORI_HOSTED_SERVICE_ROLE_KEY";
export const HOSTED_PASSWORD_ENV = "TORI_HOSTED_PILOT_PASSWORD";

function fail(message: string): never {
  throw new PilotGuardError(message);
}

/** The project reference a hosted Supabase URL points at, or null. */
export function projectRefFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const match = /^([a-z0-9]{20})\.supabase\.(co|in|red)$/.exec(host);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function isLoopbackUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return ["127.0.0.1", "localhost", "::1", "[::1]", "0.0.0.0"].includes(host);
  } catch {
    return false;
  }
}

export function isApprovedHostedRef(ref: string | null | undefined): boolean {
  return Boolean(ref) && APPROVED_HOSTED_PROJECT_REFS.includes(ref as string);
}

/** Client-exposed secret variable names that must never exist. */
export function findForbiddenClientEnvNames(env: Record<string, string | undefined>): string[] {
  return Object.keys(env).filter((name) =>
    /^VITE_.*(SERVICE_ROLE|SECRET|PILOT_PASSWORD|PASSWORD|ACCESS_TOKEN)/i.test(name),
  );
}

export interface HostedPilotContext {
  config: PilotConfig;
  password: string;
  url: string;
  projectRef: string;
  admin: SupabaseClient;
}

/**
 * Fail-closed hosted guard. Every check must pass before any remote write.
 *
 * The declared mode is necessary but never sufficient: the URL must resolve to
 * an allowlisted project reference AND match the separately declared reference,
 * so a copy-pasted URL from another project cannot be reached even with the
 * right flag set.
 */
export function assertHostedPilotEnvironment(): HostedPilotContext {
  if (process.env[HOSTED_MODE_ENV] !== HOSTED_MODE_VALUE) {
    fail(
      `${HOSTED_MODE_ENV} must be exactly "${HOSTED_MODE_VALUE}" for a hosted pilot command. ` +
        "The local value 'local' deliberately does not grant hosted access.",
    );
  }

  if (process.env.NODE_ENV === "production") {
    fail("refusing to run a hosted pilot command with NODE_ENV=production");
  }
  for (const marker of ["CI_ENVIRONMENT", "TORI_ENV", "VERCEL_ENV"]) {
    if ((process.env[marker] ?? "").toLowerCase() === "production") {
      fail(`refusing to run a hosted pilot command with ${marker}=production`);
    }
  }

  const forbidden = findForbiddenClientEnvNames(process.env);
  if (forbidden.length > 0) {
    // Names only — never values.
    fail(
      `client-exposed secret variables are set: ${forbidden.join(", ")}. ` +
        "A service-role key, access token or password must never be VITE_-prefixed.",
    );
  }

  const declaredRef = process.env[HOSTED_REF_ENV];
  if (!declaredRef) fail(`${HOSTED_REF_ENV} must be set to the approved hosted project reference.`);
  if (!isApprovedHostedRef(declaredRef)) {
    fail(
      `project reference "${declaredRef}" is not in the approved allowlist. ` +
        "Hosted pilot commands refuse to touch any other Supabase project.",
    );
  }

  const url = process.env[HOSTED_URL_ENV];
  if (!url) fail(`${HOSTED_URL_ENV} must be set.`);
  if (isLoopbackUrl(url)) {
    fail(
      "the hosted pilot commands refuse a loopback URL. Use `bun run pilot:bootstrap` for the " +
        "local Supabase stack.",
    );
  }
  if (!url.startsWith("https://")) fail("the hosted Supabase URL must use https.");

  const urlRef = projectRefFromUrl(url);
  if (!isApprovedHostedRef(urlRef)) {
    fail("the hosted Supabase URL does not resolve to an approved project reference.");
  }
  if (urlRef !== declaredRef) {
    fail(
      "the hosted Supabase URL and the declared project reference disagree. " +
        "Refusing to act on an ambiguous target.",
    );
  }

  const serviceRoleKey = process.env[HOSTED_SERVICE_KEY_ENV];
  if (!serviceRoleKey || serviceRoleKey.length < 20) {
    fail(`${HOSTED_SERVICE_KEY_ENV} must be set. It is server-side only and is never committed.`);
  }

  const password = process.env[HOSTED_PASSWORD_ENV];
  if (!password || password.length < 12) {
    fail(
      `${HOSTED_PASSWORD_ENV} must be set (at least 12 characters). The hosted password is ` +
        "distinct from the local one and is never written into the pilot configuration file.",
    );
  }

  const config = loadPilotConfig();

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  return { config, password, url, projectRef: declaredRef, admin };
}
