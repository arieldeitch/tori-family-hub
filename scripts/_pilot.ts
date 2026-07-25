// Family Pilot — shared server-only helpers (WP5A).
//
// SERVER ONLY. Nothing here may ever be imported from browser code: it reads the
// service-role key and the pilot password from the environment. `bun run
// check:client-secrets` fails the build if any of that reaches src/ or a bundle.
//
// The environment guard fails CLOSED. It is not satisfied by the caller-supplied
// flag alone — the Supabase target must independently prove it is the local CLI
// stack (ADR-034, ADR-035).
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readLocalSupabaseConfig } from "./_supabase-local";

export const PILOT_MODE_ENV = "TORI_PILOT_MODE";
export const PILOT_PASSWORD_ENV = "TORI_PILOT_PASSWORD";
export const PILOT_CONFIG_ENV = "TORI_PILOT_CONFIG";
export const DEFAULT_CONFIG_PATH = "pilot-household.local.json";

export type PilotRole = "owner" | "adult" | "child";

export interface PilotProfile {
  key: string;
  id: string;
  displayName: string;
  isChild: boolean;
  role: PilotRole;
}

export interface PilotConfig {
  household: {
    id: string;
    name: string;
    timezone: string;
    locale: string;
    weekStartsOn: number;
  };
  adultPilotIdentity: { email: string; linkedProfileKey: string };
  profiles: PilotProfile[];
}

export class PilotGuardError extends Error {}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

function fail(message: string): never {
  throw new PilotGuardError(message);
}

/** True only for a loopback Supabase URL. Never matches a remote project. */
export function isLocalSupabaseUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return LOCAL_HOSTS.has(host);
  } catch {
    return false;
  }
}

/** Env var names that must never exist: a client-exposed secret or password. */
export function findForbiddenClientEnvNames(env: Record<string, string | undefined>): string[] {
  return Object.keys(env).filter((name) =>
    /^VITE_.*(SERVICE_ROLE|SECRET|PILOT_PASSWORD|PASSWORD)/i.test(name),
  );
}

export function configPath(): string {
  return resolve(process.cwd(), process.env[PILOT_CONFIG_ENV] ?? DEFAULT_CONFIG_PATH);
}

export function loadPilotConfig(path = configPath()): PilotConfig {
  if (!existsSync(path)) {
    fail(
      `pilot configuration not found at ${path}. Copy pilot-household.example.json to ` +
        `${DEFAULT_CONFIG_PATH} (it is git-ignored) and fill it in.`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    fail(`pilot configuration at ${path} is not valid JSON: ${(err as Error).message}`);
  }

  const config = parsed as PilotConfig;
  if (!config.household?.id || !UUID_RE.test(config.household.id)) {
    fail("pilot configuration: household.id must be a UUID");
  }
  if (!config.household.name?.trim()) fail("pilot configuration: household.name is required");
  if (!config.adultPilotIdentity?.email?.trim()) {
    fail("pilot configuration: adultPilotIdentity.email is required");
  }
  if (!Array.isArray(config.profiles) || config.profiles.length !== 4) {
    fail("pilot configuration: exactly four profiles are required for the pilot household");
  }
  for (const profile of config.profiles) {
    if (!profile.id || !UUID_RE.test(profile.id)) {
      fail(`pilot configuration: profile "${profile.key}" needs a UUID id`);
    }
    if (!profile.displayName?.trim()) {
      fail(`pilot configuration: profile "${profile.key}" needs a displayName`);
    }
    if (!["owner", "adult", "child"].includes(profile.role)) {
      fail(`pilot configuration: profile "${profile.key}" has an unsupported role`);
    }
  }
  if (config.profiles.filter((p) => p.role === "owner").length !== 1) {
    fail("pilot configuration: exactly one profile must have role 'owner'");
  }
  if (!config.profiles.some((p) => p.key === config.adultPilotIdentity.linkedProfileKey)) {
    fail("pilot configuration: adultPilotIdentity.linkedProfileKey does not match any profile");
  }
  // Anything that looks like a stored credential is a hard error: the password
  // belongs in TORI_PILOT_PASSWORD, never in this file.
  if (/"(password|pass|secret|token)"\s*:/i.test(readFileSync(path, "utf8"))) {
    fail(
      "pilot configuration must not contain a password, secret or token. " +
        `Supply the password through ${PILOT_PASSWORD_ENV} instead.`,
    );
  }
  return config;
}

export interface PilotContext {
  config: PilotConfig;
  password: string;
  url: string;
  admin: SupabaseClient;
}

/**
 * Fail-closed environment guard. Every check must pass before any write.
 *
 * The caller-supplied TORI_PILOT_MODE flag is necessary but NOT sufficient: the
 * Supabase target is independently confirmed to be the local CLI stack, so a
 * stray flag in the wrong shell cannot reach a remote project.
 */
export function assertLocalPilotEnvironment(): PilotContext {
  if (process.env[PILOT_MODE_ENV] !== "local") {
    fail(
      `${PILOT_MODE_ENV} must be exactly "local" to run a pilot command. ` +
        "This is a non-production, local-only workflow (ADR-033).",
    );
  }
  if (process.env.NODE_ENV === "production") {
    fail("refusing to run a pilot command with NODE_ENV=production");
  }
  for (const marker of ["CI_ENVIRONMENT", "TORI_ENV", "VERCEL_ENV"]) {
    if ((process.env[marker] ?? "").toLowerCase() === "production") {
      fail(`refusing to run a pilot command with ${marker}=production`);
    }
  }

  const forbidden = findForbiddenClientEnvNames(process.env);
  if (forbidden.length > 0) {
    // Names only — never values.
    fail(
      `client-exposed secret variables are set: ${forbidden.join(", ")}. ` +
        "A service-role key or password must never be VITE_-prefixed.",
    );
  }

  const password = process.env[PILOT_PASSWORD_ENV];
  if (!password || password.length < 8) {
    fail(
      `${PILOT_PASSWORD_ENV} must be set (at least 8 characters). ` +
        "It is never committed and never written into the pilot configuration file.",
    );
  }

  const config = loadPilotConfig();

  // Independent proof of a local target: the CLI's own reported API URL.
  let local;
  try {
    local = readLocalSupabaseConfig();
  } catch {
    fail(
      "could not identify the local Supabase project. Start it with `bun run supabase:start` " +
        "— pilot commands never target a remote project.",
    );
  }
  if (!isLocalSupabaseUrl(local.url)) {
    fail(
      "the resolved Supabase URL is not a loopback address. Pilot commands refuse to run " +
        "against a remote or hosted Supabase project.",
    );
  }

  const admin = createClient(local.url, local.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  return { config, password, url: local.url, admin };
}

/** Resolve the Auth user id for the pilot email, or null when absent. */
export async function findPilotAuthUserId(
  admin: SupabaseClient,
  email: string,
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`listUsers failed: ${error.message}`);
  const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return match?.id ?? null;
}
