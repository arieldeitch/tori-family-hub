import { describe, it, expect } from "vitest";
import {
  findForbiddenBrowserVars,
  isLoopbackUrl,
  KEY_VAR,
  readPilotRuntimeConfig,
  URL_VAR,
} from "./runtimeConfig";

const LOCAL = { [URL_VAR]: "http://127.0.0.1:55321", [KEY_VAR]: "sb_publishable_local" };
const HOSTED = {
  [URL_VAR]: "https://examplerefexampleref.supabase.co",
  [KEY_VAR]: "sb_publishable_hosted",
};

describe("readPilotRuntimeConfig", () => {
  it("accepts a local Supabase stack and marks it local", () => {
    const config = readPilotRuntimeConfig(LOCAL);
    expect(config.ok).toBe(true);
    if (config.ok) {
      expect(config.isLocal).toBe(true);
      expect(config.url).toBe(LOCAL[URL_VAR]);
    }
  });

  it("accepts a hosted project and does not mark it local", () => {
    const config = readPilotRuntimeConfig(HOSTED);
    expect(config.ok).toBe(true);
    if (config.ok) expect(config.isLocal).toBe(false);
  });

  it("reports both variables when nothing is configured", () => {
    const config = readPilotRuntimeConfig({});
    expect(config.ok).toBe(false);
    if (!config.ok) {
      expect(config.missing).toEqual([URL_VAR, KEY_VAR]);
      // A missing configuration must explain itself, never blank the page.
      expect(config.message.length).toBeGreaterThan(20);
    }
  });

  it("reports a missing key on its own", () => {
    const config = readPilotRuntimeConfig({ [URL_VAR]: HOSTED[URL_VAR] });
    expect(config.ok).toBe(false);
    if (!config.ok) expect(config.missing).toEqual([KEY_VAR]);
  });

  it("treats blank values as missing", () => {
    const config = readPilotRuntimeConfig({ [URL_VAR]: "   ", [KEY_VAR]: "" });
    expect(config.ok).toBe(false);
    if (!config.ok) expect(config.missing).toEqual([URL_VAR, KEY_VAR]);
  });

  it("rejects a malformed URL", () => {
    const config = readPilotRuntimeConfig({ [URL_VAR]: "not-a-url", [KEY_VAR]: "k" });
    expect(config.ok).toBe(false);
    if (!config.ok) expect(config.missing).toEqual([URL_VAR]);
  });

  it("refuses to run when a server-side secret is exposed as a browser variable", () => {
    const config = readPilotRuntimeConfig({
      ...HOSTED,
      VITE_SUPABASE_SERVICE_ROLE_KEY: "must-never-exist",
    });
    expect(config.ok).toBe(false);
    if (!config.ok) {
      expect(config.missing).toContain("VITE_SUPABASE_SERVICE_ROLE_KEY");
      expect(config.message).toMatch(/never be VITE_/);
    }
  });

  it("never returns a secret value in the error payload", () => {
    const config = readPilotRuntimeConfig({ ...HOSTED, VITE_PILOT_PASSWORD: "super-secret-value" });
    expect(config.ok).toBe(false);
    if (!config.ok) {
      expect(JSON.stringify(config)).not.toContain("super-secret-value");
    }
  });
});

describe("findForbiddenBrowserVars", () => {
  it("flags service-role, secret, password and access-token variables", () => {
    const flagged = findForbiddenBrowserVars({
      VITE_SUPABASE_SERVICE_ROLE_KEY: "x",
      VITE_SUPABASE_SECRET: "x",
      VITE_PILOT_PASSWORD: "x",
      VITE_SUPABASE_ACCESS_TOKEN: "x",
      VITE_SUPABASE_URL: "ok",
      VITE_SUPABASE_PUBLISHABLE_KEY: "ok",
    });
    expect(flagged).toHaveLength(4);
    expect(flagged).not.toContain("VITE_SUPABASE_URL");
    expect(flagged).not.toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
  });
});

describe("isLoopbackUrl", () => {
  it("recognises loopback hosts and rejects hosted ones", () => {
    expect(isLoopbackUrl("http://127.0.0.1:55321")).toBe(true);
    expect(isLoopbackUrl("http://localhost:8080")).toBe(true);
    expect(isLoopbackUrl("https://examplerefexampleref.supabase.co")).toBe(false);
    expect(isLoopbackUrl("nonsense")).toBe(false);
  });
});
