// The tracked root `.env` is committed on purpose (ADR-038) so Lovable's
// published builds can configure themselves. That makes it the single most
// likely place for a secret to be added by mistake later, so its contents are
// pinned here as well as in `bun run check:client-secrets`.
//
// Every assertion below compares booleans, never values: a failure message must
// never print the contents of an environment file.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(process.cwd(), ".env");
const ALLOWED = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];

function readEnvPairs(): Array<[string, string]> {
  const content = readFileSync(ENV_PATH, "utf8");
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()] as [string, string];
    });
}

describe("tracked root .env", () => {
  it("exists, because published Lovable builds do not receive ignored files", () => {
    expect(existsSync(ENV_PATH)).toBe(true);
  });

  it("declares exactly the two browser-public variables and nothing else", () => {
    const names = readEnvPairs().map(([name]) => name);
    expect(names.slice().sort()).toEqual(ALLOWED.slice().sort());
  });

  it("gives both variables a non-empty value", () => {
    const pairs = readEnvPairs();
    expect(pairs.every(([, value]) => value.length > 0)).toBe(true);
  });

  it("points at a hosted https Supabase URL, not localhost", () => {
    const url = new Map(readEnvPairs()).get("VITE_SUPABASE_URL") ?? "";
    expect(url.startsWith("https://")).toBe(true);
    expect(url.includes(".supabase.co")).toBe(true);
    expect(/localhost|127\.0\.0\.1/.test(url)).toBe(false);
  });

  it("carries a publishable key, never a secret key or access token", () => {
    const key = new Map(readEnvPairs()).get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? "";
    expect(key.startsWith("sb_publishable_")).toBe(true);
    expect(key.startsWith("sb_secret_")).toBe(false);
    expect(key.startsWith("sbp_")).toBe(false);
  });

  it("contains no credential-shaped value anywhere in the file", () => {
    const content = readFileSync(ENV_PATH, "utf8");
    // A secret key, a personal access token, or a JWT (service-role keys are JWTs).
    expect(/sb_secret_[A-Za-z0-9_-]{10,}/.test(content)).toBe(false);
    expect(/sbp_[A-Za-z0-9]{20,}/.test(content)).toBe(false);
    expect(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(content)).toBe(false);
  });

  it("mentions no password or service-role variable name", () => {
    const content = readFileSync(ENV_PATH, "utf8");
    expect(/^\s*[A-Z_]*(PASSWORD|SERVICE_ROLE|ACCESS_TOKEN)/m.test(content)).toBe(false);
  });
});
