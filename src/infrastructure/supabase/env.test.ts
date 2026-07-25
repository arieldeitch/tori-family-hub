import { describe, it, expect } from "vitest";
import { readSupabasePublicEnv } from "./env";

const VALID = {
  VITE_SUPABASE_URL: "http://127.0.0.1:55321",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_localdevkey_example",
};

describe("readSupabasePublicEnv", () => {
  it("accepts a valid public env and returns the parsed values", () => {
    const env = readSupabasePublicEnv(VALID);
    expect(env.VITE_SUPABASE_URL).toBe(VALID.VITE_SUPABASE_URL);
    expect(env.VITE_SUPABASE_PUBLISHABLE_KEY).toBe(VALID.VITE_SUPABASE_PUBLISHABLE_KEY);
  });

  it("rejects a missing/invalid URL", () => {
    expect(() => readSupabasePublicEnv({ ...VALID, VITE_SUPABASE_URL: "not-a-url" })).toThrow(
      /VITE_SUPABASE_URL must be a valid URL/,
    );
    expect(() =>
      readSupabasePublicEnv({ VITE_SUPABASE_PUBLISHABLE_KEY: VALID.VITE_SUPABASE_PUBLISHABLE_KEY }),
    ).toThrow(/VITE_SUPABASE_URL/);
  });

  it("rejects an empty publishable key", () => {
    expect(() => readSupabasePublicEnv({ ...VALID, VITE_SUPABASE_PUBLISHABLE_KEY: "" })).toThrow(
      /VITE_SUPABASE_PUBLISHABLE_KEY must not be empty/,
    );
  });

  it("never leaks the key value in the error message", () => {
    const secretish = "sb_publishable_SHOULD_NOT_APPEAR_IN_ERROR";
    try {
      // invalid URL so it throws, while a (valid) key is present
      readSupabasePublicEnv({
        VITE_SUPABASE_URL: "",
        VITE_SUPABASE_PUBLISHABLE_KEY: secretish,
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(String(err)).not.toContain(secretish);
    }
  });
});
