import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  detectSchemaCapability,
  resetSchemaCapability,
  CAPABILITY_PROBE_TABLE,
} from "./schemaCapability";

function memoryStore() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    _map: map,
  };
}

// The exact shape PostgREST returns when the relation does not exist. Captured
// from the hosted pilot project, which is genuinely one migration behind.
const MISSING_TABLE = {
  error: {
    code: "PGRST205",
    message: `Could not find the table 'public.${CAPABILITY_PROBE_TABLE}' in the schema cache`,
  },
  status: 404,
};

beforeEach(() => resetSchemaCapability(memoryStore()));

describe("detectSchemaCapability", () => {
  it("reports ready when the probe succeeds", async () => {
    const probe = vi.fn().mockResolvedValue({ error: null, status: 200 });
    const result = await detectSchemaCapability({ probe, store: memoryStore() });
    expect(result.status).toBe("ready");
    expect(result.failure).toBeNull();
  });

  it("reports upgrade_pending — NOT an error — when the table is missing", async () => {
    // This is the entire reason the module exists: a backend older than the
    // build is a known, temporary state, not a failure the family can act on.
    const probe = vi.fn().mockResolvedValue(MISSING_TABLE);
    const result = await detectSchemaCapability({ probe, store: memoryStore() });
    expect(result.status).toBe("upgrade_pending");
    expect(result.failure).toBeNull();
  });

  it("never reports a missing table as offline", async () => {
    const probe = vi.fn().mockResolvedValue(MISSING_TABLE);
    const result = await detectSchemaCapability({ probe, store: memoryStore() });
    expect(result.status).not.toBe("error");
    expect(result.failure?.kind).not.toBe("offline");
  });

  it("treats a permission refusal as READY — the table exists and RLS answered", async () => {
    // Capability and authorisation are different questions. A 403 proves the
    // relation resolves, which is exactly what a capable backend does.
    const probe = vi
      .fn()
      .mockResolvedValue({ error: { code: "42501", message: "permission denied" }, status: 403 });
    const result = await detectSchemaCapability({ probe, store: memoryStore() });
    expect(result.status).toBe("ready");
  });

  it("reports error for a genuine failure, with the fault classified", async () => {
    const probe = vi.fn().mockResolvedValue({ error: { message: "boom" }, status: 500 });
    const result = await detectSchemaCapability({ probe, store: memoryStore() });
    expect(result.status).toBe("error");
    expect(result.failure?.kind).toBe("server");
  });

  it("survives a probe that throws", async () => {
    const probe = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const result = await detectSchemaCapability({ probe, store: memoryStore() });
    expect(result.status).toBe("error");
    expect(result.failure?.kind).toBe("network");
  });

  // ---- no spamming -------------------------------------------------------

  it("probes only ONCE however many callers ask", async () => {
    const probe = vi.fn().mockResolvedValue(MISSING_TABLE);
    const store = memoryStore();
    await detectSchemaCapability({ probe, store });
    await detectSchemaCapability({ probe, store });
    await detectSchemaCapability({ probe, store });
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it("shares one in-flight request between concurrent callers", async () => {
    let release: (v: { error: unknown; status: number | null }) => void = () => {};
    const probe = vi.fn().mockReturnValue(
      new Promise<{ error: unknown; status: number | null }>((r) => {
        release = r;
      }),
    );
    const store = memoryStore();
    const all = Promise.all([
      detectSchemaCapability({ probe, store }),
      detectSchemaCapability({ probe, store }),
      detectSchemaCapability({ probe, store }),
    ]);
    release({ error: null, status: 200 });
    const results = await all;
    expect(probe).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.status === "ready")).toBe(true);
  });

  it("remembers upgrade_pending across a reload via sessionStorage", async () => {
    const store = memoryStore();
    const first = vi.fn().mockResolvedValue(MISSING_TABLE);
    await detectSchemaCapability({ probe: first, store });

    // Simulate a page reload: module memo is gone, the session store is not.
    resetSchemaCapability(null);
    const second = vi.fn().mockResolvedValue(MISSING_TABLE);
    const result = await detectSchemaCapability({ probe: second, store });

    expect(result.status).toBe("upgrade_pending");
    expect(second).not.toHaveBeenCalled();
  });

  it("does NOT cache a transient error, so it stays retryable", async () => {
    const store = memoryStore();
    const failing = vi.fn().mockResolvedValue({ error: { message: "boom" }, status: 503 });
    await detectSchemaCapability({ probe: failing, store });
    expect(store._map.has("tori.pilot.schema-capability")).toBe(false);
  });

  // ---- switches itself on -------------------------------------------------

  it("activates the real experience once the tables appear, with no code change", async () => {
    const store = memoryStore();
    const before = vi.fn().mockResolvedValue(MISSING_TABLE);
    expect((await detectSchemaCapability({ probe: before, store })).status).toBe("upgrade_pending");

    // The hosted migration lands. A new session re-probes and flips.
    resetSchemaCapability(store);
    const after = vi.fn().mockResolvedValue({ error: null, status: 200 });
    expect((await detectSchemaCapability({ probe: after, store })).status).toBe("ready");
    expect(after).toHaveBeenCalledTimes(1);
  });

  it("re-probes after an explicit reset, which is what the retry control does", async () => {
    const store = memoryStore();
    const probe = vi.fn().mockResolvedValue(MISSING_TABLE);
    await detectSchemaCapability({ probe, store });
    resetSchemaCapability(store);
    await detectSchemaCapability({ probe, store });
    expect(probe).toHaveBeenCalledTimes(2);
  });

  it("works when sessionStorage is unavailable, still without spamming", async () => {
    const probe = vi.fn().mockResolvedValue(MISSING_TABLE);
    await detectSchemaCapability({ probe, store: null });
    await detectSchemaCapability({ probe, store: null });
    expect(probe).toHaveBeenCalledTimes(1);
  });
});
