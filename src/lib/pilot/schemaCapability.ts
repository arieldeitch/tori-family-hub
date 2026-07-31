// Is the backend this build is talking to new enough to run the weekly view?
//
// WHY THIS EXISTS
//
// The repository is ahead of the hosted pilot project. WP5B (task tables) and
// WP5C (rotation tables) are merged and tested, but applying them to the hosted
// project is a separate, approval-gated step that has not happened. So a build
// from `main` can legitimately meet a backend that has the identity tables and
// nothing else.
//
// Without this check, shipping WP5D would break the live pilot for the family:
// every weekly query would fail with PGRST205 and the screen would show an
// error for a situation that is not an error — the app is simply newer than its
// database, and the fix is a migration, not a retry.
//
// THE THREE RULES THIS FILE OBEYS
//
//   1. A missing table is NOT a failure. It is a known, temporary state with its
//      own calm Hebrew screen ("שדרוג הפיילוט ממתין"), never an error and never
//      the offline screen (ADR-042).
//   2. It must not spam. One probe per session, memoised in module scope and
//      mirrored into sessionStorage so a refresh does not re-probe. A negative
//      result is sticky for the session; only an explicit retry re-checks.
//   3. It must switch itself on. The probe is a runtime question, so the moment
//      the hosted migrations land, the next session activates the real weekly
//      experience with NO code change and NO redeploy.

import { getSupabaseClient } from "@/infrastructure/supabase";
import { classifyError, type ClassifiedError } from "@/lib/errors/classifyError";

export type SchemaCapabilityStatus =
  /** Probing. */
  | "checking"
  /** WP5B/WP5C are present; the real weekly experience is available. */
  | "ready"
  /** The backend predates WP5B/WP5C. Show the upgrade-pending screen. */
  | "upgrade_pending"
  /** The probe itself failed for a reason that is not a missing table. */
  | "error";

export interface SchemaCapability {
  status: SchemaCapabilityStatus;
  /** Present only when status is "error". */
  failure: ClassifiedError | null;
}

/**
 * The table whose presence decides the question.
 *
 * `task_instances` is the one the weekly view cannot function without, and it
 * arrives in the same migration as the rest of WP5B, so probing one table is
 * enough. Probing several would multiply requests for no extra information.
 */
export const CAPABILITY_PROBE_TABLE = "task_instances";

const SESSION_KEY = "tori.pilot.schema-capability";

/** Module-scope memo: one probe per page load, however many components ask. */
let inFlight: Promise<SchemaCapability> | null = null;
let resolved: SchemaCapability | null = null;

type SessionLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function sessionStore(): SessionLike | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    // Private-mode browsers can throw on access; the memo still prevents spam.
    return null;
  }
}

function readCached(store: SessionLike | null): SchemaCapability | null {
  if (!store) return null;
  try {
    const raw = store.getItem(SESSION_KEY);
    if (raw === "ready" || raw === "upgrade_pending") return { status: raw, failure: null };
  } catch {
    /* ignore */
  }
  return null;
}

function writeCached(store: SessionLike | null, status: SchemaCapabilityStatus): void {
  if (!store) return;
  try {
    // Only settled answers are cached. An "error" is transient by definition and
    // must stay retryable.
    if (status === "ready" || status === "upgrade_pending") store.setItem(SESSION_KEY, status);
  } catch {
    /* ignore */
  }
}

/**
 * Forget the cached answer.
 *
 * Called by the explicit "check again" control on the upgrade-pending screen,
 * and after sign-out so a different account re-probes cleanly.
 */
export function resetSchemaCapability(store: SessionLike | null = sessionStore()): void {
  inFlight = null;
  resolved = null;
  try {
    store?.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export interface ProbeDeps {
  /** Injectable for tests. Returns the classified outcome of a 1-row select. */
  probe?: () => Promise<{ error: unknown; status: number | null }>;
  store?: SessionLike | null;
}

async function defaultProbe(): Promise<{ error: unknown; status: number | null }> {
  // `head: true` + `limit(0)`: asks only whether the relation resolves, and
  // transfers no rows. The cheapest possible question.
  const { error, status } = await getSupabaseClient()
    .from(CAPABILITY_PROBE_TABLE)
    .select("id", { head: true, count: undefined })
    .limit(0);
  return { error, status: status ?? null };
}

/**
 * Resolve the backend capability, at most once per session.
 *
 * Concurrent callers share one in-flight promise, so mounting several components
 * at once still produces a single request.
 */
export function detectSchemaCapability(deps: ProbeDeps = {}): Promise<SchemaCapability> {
  const store = deps.store === undefined ? sessionStore() : deps.store;

  if (resolved) return Promise.resolve(resolved);
  const cached = readCached(store);
  if (cached) {
    resolved = cached;
    return Promise.resolve(cached);
  }
  if (inFlight) return inFlight;

  const probe = deps.probe ?? defaultProbe;

  inFlight = probe()
    .then(({ error, status }): SchemaCapability => {
      if (!error) return { status: "ready", failure: null };

      const classified = classifyError({ error, status });

      // The whole point: a missing table means the backend is older than this
      // build. That is not an error the family can act on, and it is emphatically
      // not "you are offline".
      if (classified.kind === "missing_schema") {
        return { status: "upgrade_pending", failure: null };
      }

      // A permission refusal means the table EXISTS and RLS answered — which is
      // exactly what a capable backend does. Capability and authorisation are
      // different questions; do not conflate them.
      if (classified.kind === "permission" || classified.kind === "auth") {
        return { status: "ready", failure: null };
      }

      return { status: "error", failure: classified };
    })
    .catch(
      (err: unknown): SchemaCapability => ({
        status: "error",
        failure: classifyError({ error: err }),
      }),
    )
    .then((result) => {
      resolved = result;
      writeCached(store, result.status);
      inFlight = null;
      return result;
    });

  return inFlight;
}
