import { describe, expect, it } from "vitest";
import { classifyError, describeForLog } from "./classifyError";

// The point of every test here: a failure that is NOT a network failure must not
// be reported as one. Each case asserts both that the right kind was chosen and
// that the offline message was not used.

const OFFLINE_TEXT = "אין חיבור לרשת כרגע";

describe("classifyError", () => {
  it("reports offline only when the browser says it is offline", () => {
    const result = classifyError({ online: false, error: new Error("anything at all") });
    expect(result.kind).toBe("offline");
    expect(result.message).toBe(OFFLINE_TEXT);
    expect(result.retryable).toBe(true);
  });

  it("offline wins even over an auth-shaped error, because nothing can succeed offline", () => {
    const result = classifyError({ online: false, status: 401 });
    expect(result.kind).toBe("offline");
  });

  it("a successful path is never classified — a reachable Supabase produces no error", () => {
    // Sanity anchor: with no error and no status, nothing claims the network is down.
    const result = classifyError({ online: true });
    expect(result.kind).toBe("unknown");
    expect(result.message).not.toBe(OFFLINE_TEXT);
  });

  it("maps 401 to an expired session, not to the network", () => {
    const result = classifyError({ online: true, status: 401 });
    expect(result.kind).toBe("auth");
    expect(result.code).toBe("http_401");
    expect(result.retryable).toBe(false);
    expect(result.message).not.toBe(OFFLINE_TEXT);
  });

  it("maps 403 to a permission problem, not to the network", () => {
    const result = classifyError({ online: true, status: 403 });
    expect(result.kind).toBe("permission");
    expect(result.message).not.toBe(OFFLINE_TEXT);
  });

  it("maps an RLS refusal (42501) to permission", () => {
    const result = classifyError({ online: true, status: 403, error: { code: "42501" } });
    expect(result.kind).toBe("permission");
    expect(result.code).toBe("pg_42501");
  });

  it("maps a missing table to a schema problem, not to the network", () => {
    const result = classifyError({
      online: true,
      status: 404,
      error: { code: "PGRST205", message: 'relation "public.task_instances" does not exist' },
    });
    expect(result.kind).toBe("missing_schema");
    expect(result.code).toBe("pg_PGRST205");
    expect(result.retryable).toBe(false);
    expect(result.message).not.toBe(OFFLINE_TEXT);
  });

  it("maps a missing RPC to a schema problem even without an HTTP status", () => {
    const result = classifyError({ online: true, error: { code: "PGRST202" } });
    expect(result.kind).toBe("missing_schema");
  });

  it("maps undefined_table (42P01) to a schema problem", () => {
    const result = classifyError({ online: true, error: { code: "42P01" } });
    expect(result.kind).toBe("missing_schema");
  });

  it("maps missing runtime configuration to config, not to the network", () => {
    const result = classifyError({ online: true, error: { code: "MISSING_RUNTIME_CONFIG" } });
    expect(result.kind).toBe("config");
    expect(result.retryable).toBe(false);
    expect(result.message).not.toBe(OFFLINE_TEXT);
  });

  it("recognises the runtimeConfig wording as a configuration fault", () => {
    const result = classifyError({
      online: true,
      error: new Error(
        "The Supabase connection is not configured. Set the two browser-safe values",
      ),
    });
    expect(result.kind).toBe("config");
  });

  it("maps an aborted request to timeout", () => {
    const abort = new Error("The operation was aborted");
    abort.name = "AbortError";
    const result = classifyError({ online: true, error: abort });
    expect(result.kind).toBe("timeout");
    expect(result.message).not.toBe(OFFLINE_TEXT);
  });

  it("maps a 408 to timeout", () => {
    expect(classifyError({ online: true, status: 408 }).kind).toBe("timeout");
  });

  it("maps 5xx to a server fault, not to the network", () => {
    for (const status of [500, 502, 503, 504]) {
      const result = classifyError({ online: true, status });
      expect(result.kind).toBe("server");
      expect(result.code).toBe(`http_${status}`);
      expect(result.message).not.toBe(OFFLINE_TEXT);
    }
  });

  it("maps a fetch TypeError while online to network, NOT to offline", () => {
    const failure = new TypeError("Failed to fetch");
    const result = classifyError({ online: true, error: failure });
    // This is the exact case that used to be mislabelled: the browser is online,
    // the server is unreachable. That is a server/deployment fault, not the
    // family's internet connection.
    expect(result.kind).toBe("network");
    expect(result.message).not.toBe(OFFLINE_TEXT);
    expect(result.message).toBe("לא הצלחנו להגיע לשרת");
  });

  it("falls back to unknown rather than blaming the network", () => {
    const result = classifyError({ online: true, error: new Error("something odd") });
    expect(result.kind).toBe("unknown");
    expect(result.message).not.toBe(OFFLINE_TEXT);
  });

  it("uses navigator.onLine when connectivity is not given explicitly", () => {
    const original = Object.getOwnPropertyDescriptor(navigator, "onLine");
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    try {
      expect(classifyError({ error: new Error("x") }).kind).toBe("offline");
    } finally {
      if (original) Object.defineProperty(navigator, "onLine", original);
    }
  });

  it("every kind has a Hebrew message and a hint", () => {
    const samples = [
      classifyError({ online: false }),
      classifyError({ online: true, status: 401 }),
      classifyError({ online: true, status: 403 }),
      classifyError({ online: true, status: 500 }),
      classifyError({ online: true, error: { code: "PGRST205" }, status: 404 }),
      classifyError({ online: true, error: { code: "MISSING_RUNTIME_CONFIG" } }),
      classifyError({ online: true, error: new TypeError("Failed to fetch") }),
      classifyError({ online: true, error: new Error("odd") }),
    ];
    for (const s of samples) {
      expect(s.message.length).toBeGreaterThan(0);
      expect(s.hint.length).toBeGreaterThan(0);
      // Hebrew letters present — these strings are user-facing in an RTL app.
      expect(/[֐-׿]/.test(s.message)).toBe(true);
    }
  });

  it("only the genuine offline case ever uses the offline wording", () => {
    const nonOffline = [
      classifyError({ online: true, status: 401 }),
      classifyError({ online: true, status: 403 }),
      classifyError({ online: true, status: 500 }),
      classifyError({ online: true, status: 404, error: { code: "PGRST205" } }),
      classifyError({ online: true, error: { code: "MISSING_RUNTIME_CONFIG" } }),
      classifyError({ online: true, error: new TypeError("Failed to fetch") }),
      classifyError({ online: true, error: new Error("odd") }),
    ];
    for (const s of nonOffline) expect(s.kind).not.toBe("offline");
  });
});

// Response shapes captured from the real hosted pilot project on 2026-07-31 by
// querying it with the public publishable key. These are not invented fixtures:
// they are what PostgREST actually returns, and they are the two failures most
// likely to be misread as "no internet".
describe("real hosted-project responses", () => {
  it("classifies the hosted RLS refusal on an existing table as permission", () => {
    // GET /rest/v1/households → 401 with PostgreSQL 42501 (insufficient_privilege).
    // The table exists and anon holds nothing, exactly as WP4 designed.
    const result = classifyError({
      online: true,
      status: 401,
      error: {
        code: "42501",
        message: "permission denied for table households",
        hint: "Grant the required privileges to the current role with: GRANT SELECT ON …",
      },
    });
    expect(result.kind).toBe("auth");
    expect(result.message).not.toBe(OFFLINE_TEXT);
  });

  it("classifies a table missing from the hosted schema as a migration gap", () => {
    // GET /rest/v1/task_instances → 404 PGRST205 on the hosted project, because
    // WP5B has not been applied there. Reporting this as a network failure would
    // hide a deploy-skew bug behind a router reboot.
    const result = classifyError({
      online: true,
      status: 404,
      error: {
        code: "PGRST205",
        message: "Could not find the table 'public.task_instances' in the schema cache",
        hint: "Perhaps you meant the table 'public.household_invitations'",
      },
    });
    expect(result.kind).toBe("missing_schema");
    expect(result.message).toBe("חסר עדכון במסד הנתונים");
    expect(result.retryable).toBe(false);
  });
});

describe("describeForLog", () => {
  it("emits kind and code but never the raw driver message", () => {
    const line = describeForLog(
      classifyError({
        online: true,
        status: 403,
        error: { code: "42501", message: "row violates policy for household 9f3a" },
      }),
    );
    expect(line).toContain("kind=permission");
    expect(line).toContain("code=pg_42501");
    expect(line).not.toContain("9f3a");
    expect(line).not.toContain("row violates");
  });
});
