// Family Pilot — browser runtime configuration (WP5A hosted conversion).
//
// The same two browser-safe values drive BOTH environments:
//
//   local           VITE_SUPABASE_URL points at the Supabase CLI stack
//   hosted preview  VITE_SUPABASE_URL points at the hosted project
//
// There is deliberately no hard-coded hosted URL and no hard-coded localhost URL
// in committed source: the environment decides, and the app reports clearly when
// it has not been told. A service-role key or password must NEVER appear in a
// VITE_ variable — anything that looks like one is rejected outright rather than
// used (ADR-030).
//
// This never throws. A configuration mistake must render a visible, explanatory
// screen, not a blank page.

export interface PilotRuntimeConfigOk {
  ok: true;
  url: string;
  publishableKey: string;
  /** True when pointed at the local Supabase CLI stack. */
  isLocal: boolean;
}

export interface PilotRuntimeConfigError {
  ok: false;
  /** Variable NAMES only — never values. */
  missing: string[];
  message: string;
}

export type PilotRuntimeConfig = PilotRuntimeConfigOk | PilotRuntimeConfigError;

export const URL_VAR = "VITE_SUPABASE_URL";
export const KEY_VAR = "VITE_SUPABASE_PUBLISHABLE_KEY";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]", "0.0.0.0"]);

export function isLoopbackUrl(url: string): boolean {
  try {
    return LOOPBACK_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** A VITE_ variable that looks like a server-side secret is a configuration bug. */
export function findForbiddenBrowserVars(source: Record<string, unknown>): string[] {
  return Object.keys(source).filter((name) =>
    /^VITE_.*(SERVICE_ROLE|SECRET|PILOT_PASSWORD|PASSWORD|ACCESS_TOKEN)/i.test(name),
  );
}

function readString(source: Record<string, unknown>, name: string): string | null {
  const value = source[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Resolve the browser Supabase configuration. Returns a result rather than
 * throwing, so the caller can render an explanatory state.
 */
export function readPilotRuntimeConfig(
  source: Record<string, unknown> = import.meta.env as unknown as Record<string, unknown>,
): PilotRuntimeConfig {
  const forbidden = findForbiddenBrowserVars(source);
  if (forbidden.length > 0) {
    return {
      ok: false,
      missing: forbidden,
      message:
        "A server-side secret is exposed as a browser variable. Remove it: the service-role key " +
        "and any password must never be VITE_-prefixed.",
    };
  }

  const url = readString(source, URL_VAR);
  const publishableKey = readString(source, KEY_VAR);

  const missing: string[] = [];
  if (!url) missing.push(URL_VAR);
  if (!publishableKey) missing.push(KEY_VAR);

  if (missing.length > 0) {
    return {
      ok: false,
      missing,
      message:
        "The Supabase connection is not configured. Set the two browser-safe values in this " +
        "environment; both are public and neither is a secret.",
    };
  }

  try {
    new URL(url as string);
  } catch {
    return {
      ok: false,
      missing: [URL_VAR],
      message: `${URL_VAR} is not a valid URL.`,
    };
  }

  return {
    ok: true,
    url: url as string,
    publishableKey: publishableKey as string,
    isLocal: isLoopbackUrl(url as string),
  };
}
