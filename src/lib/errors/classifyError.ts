// Turn an arbitrary failure into an honest, specific message.
//
// The rule: "אין חיבור לרשת" is a CLAIM ABOUT THE NETWORK. Making it the generic
// fallback for every failure is not a harmless simplification — it sends the
// family to reboot a working router while the real fault (an expired session, a
// missing migration, a misconfigured deployment) stays invisible. A wrong
// diagnosis is worse than a vague one.
//
// So `offline` is returned only when the browser itself reports being offline,
// or when a request failed at the transport layer while the browser has no
// opinion. Everything else gets its own kind.

export type ErrorKind =
  | "offline" // the browser is genuinely offline
  | "network" // transport-level failure while apparently online
  | "timeout" // the request took too long
  | "auth" // not signed in / session expired (401)
  | "invalid_credentials" // the email or password really is wrong
  | "auth_disabled" // the server has the sign-in method switched OFF
  | "permission" // signed in, but not allowed (403 / RLS)
  | "missing_schema" // table, view or RPC does not exist (deploy skew)
  | "config" // the app was not given its runtime configuration
  | "server" // 5xx
  | "unknown";

export interface ClassifiedError {
  kind: ErrorKind;
  /** Hebrew, user-facing. Never contains a raw driver message. */
  message: string;
  /** Hebrew, user-facing next step. */
  hint: string;
  /** Whether retrying the same action could plausibly succeed. */
  retryable: boolean;
  /**
   * Short non-sensitive technical tag for logs and support, e.g. "http_401" or
   * "pg_42P01". Never a token, key, household id or personal name.
   */
  code: string;
}

const MESSAGES: Record<ErrorKind, { message: string; hint: string; retryable: boolean }> = {
  offline: {
    message: "אין חיבור לרשת כרגע",
    hint: "בדקו את החיבור לאינטרנט ונסו שוב.",
    retryable: true,
  },
  network: {
    message: "לא הצלחנו להגיע לשרת",
    hint: "החיבור לאינטרנט נראה תקין, אך השרת אינו מגיב. נסו שוב בעוד רגע.",
    retryable: true,
  },
  timeout: {
    message: "השרת לא הגיב בזמן",
    hint: "החיבור אִטי או השרת עמוס. נסו שוב.",
    retryable: true,
  },
  auth: {
    message: "ההתחברות פגה",
    hint: "יש להתחבר מחדש כדי להמשיך.",
    retryable: false,
  },
  invalid_credentials: {
    message: "הפרטים שהוזנו אינם נכונים",
    hint: "בדקו את כתובת הדוא״ל והסיסמה ונסו שוב.",
    retryable: true,
  },
  // Telling somebody their password is wrong when the server has the sign-in
  // method switched off is the worst kind of wrong answer: they will try the
  // password forever and never find the fault, because the fault is not theirs.
  auth_disabled: {
    message: "הכניסה עם דוא״ל מושבתת בשרת",
    hint: "זו תקלת הגדרה בפרויקט Supabase, לא סיסמה שגויה. יש להפעיל את ספק ה-Email בהגדרות האימות.",
    retryable: false,
  },
  permission: {
    message: "אין הרשאה לפעולה הזו",
    hint: "החשבון מחובר, אך אינו מורשה לצפות בנתונים האלה.",
    retryable: false,
  },
  missing_schema: {
    message: "חסר עדכון במסד הנתונים",
    hint: "הגרסה שמותקנת בשרת אינה כוללת את הטבלה הנדרשת. יש להריץ את המיגרציות.",
    retryable: false,
  },
  config: {
    message: "האפליקציה אינה מוגדרת",
    hint: "חסרים ערכי החיבור לשרת בגרסה שפורסמה. זו תקלת הגדרה, לא תקלת רשת.",
    retryable: false,
  },
  server: {
    message: "השרת נתקל בשגיאה",
    hint: "זו תקלה בצד השרת, לא אצלכם. נסו שוב בעוד רגע.",
    retryable: true,
  },
  unknown: {
    message: "משהו השתבש",
    hint: "לא הצלחנו לזהות את התקלה. נסו שוב, ואם היא חוזרת דווחו עליה.",
    retryable: true,
  },
};

function build(kind: ErrorKind, code: string): ClassifiedError {
  return { kind, code, ...MESSAGES[kind] };
}

/** PostgREST/PostgreSQL codes that mean "the schema is not what the app expects". */
const MISSING_SCHEMA_CODES = new Set([
  "42P01", // undefined_table
  "42883", // undefined_function
  "42703", // undefined_column
  "PGRST202", // no function matches in schema cache
  "PGRST205", // table not found in schema cache
]);

/** PostgreSQL codes that mean "you are not allowed". */
const PERMISSION_CODES = new Set([
  "42501", // insufficient_privilege — this is what an RLS refusal surfaces as
  "PGRST301", // JWT rejected by PostgREST
]);

export interface ClassifyInput {
  /** The thrown value, or a Supabase/PostgREST error object. */
  error?: unknown;
  /** HTTP status, when one is known. */
  status?: number | null;
  /**
   * Browser connectivity. Defaults to navigator.onLine when available.
   * `navigator.onLine === true` is famously weak evidence of connectivity, so it
   * is only ever used to RULE OUT offline, never to assert a network fault.
   */
  online?: boolean;
}

interface ErrorLike {
  message?: unknown;
  code?: unknown;
  status?: unknown;
  name?: unknown;
}

function asErrorLike(error: unknown): ErrorLike {
  return typeof error === "object" && error !== null ? (error as ErrorLike) : {};
}

function readOnline(explicit?: boolean): boolean {
  if (typeof explicit === "boolean") return explicit;
  if (typeof navigator === "undefined" || typeof navigator.onLine !== "boolean") return true;
  return navigator.onLine;
}

/**
 * Classify a failure. Deterministic and side-effect free, so every branch below
 * is directly testable.
 */
export function classifyError({ error, status, online }: ClassifyInput = {}): ClassifiedError {
  // 1. The browser says it is offline. This is the ONLY unambiguous evidence we
  //    have, so it is the only thing that earns the offline message.
  if (!readOnline(online)) return build("offline", "browser_offline");

  const err = asErrorLike(error);
  const name = typeof err.name === "string" ? err.name : "";
  const rawMessage = typeof err.message === "string" ? err.message : "";
  const lower = rawMessage.toLowerCase();
  const code = typeof err.code === "string" ? err.code : "";
  const httpStatus =
    typeof status === "number" ? status : typeof err.status === "number" ? err.status : null;

  // 2. Configuration, before anything network-shaped: an unconfigured build
  //    fails in ways that look like a network fault but never resolve.
  if (
    code === "MISSING_RUNTIME_CONFIG" ||
    lower.includes("supabase connection is not configured")
  ) {
    return build("config", "missing_runtime_config");
  }

  // 3. Timeout / abort.
  if (name === "AbortError" || name === "TimeoutError" || code === "ETIMEDOUT") {
    return build("timeout", "aborted");
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return build("timeout", "timeout_message");
  }

  // 4. A sign-in method the server has switched off. GoTrue reports this as 422
  //    with error_code `email_provider_disabled`, and it is returned for EVERY
  //    address — an existing, confirmed account included — so it must never be
  //    reported as a credential problem.
  const errorCode =
    typeof (err as { error_code?: unknown }).error_code === "string"
      ? (err as { error_code: string }).error_code
      : "";
  if (
    code === "email_provider_disabled" ||
    errorCode === "email_provider_disabled" ||
    lower.includes("email logins are disabled") ||
    lower.includes("signups not allowed") ||
    code === "email_provider_not_enabled"
  ) {
    return build("auth_disabled", "email_provider_disabled");
  }

  // 5. Explicit HTTP status wins over message sniffing.
  if (httpStatus !== null) {
    if (httpStatus === 401) return build("auth", "http_401");
    if (httpStatus === 403) {
      // PostgREST returns 403 for both a rejected JWT and an RLS refusal.
      if (PERMISSION_CODES.has(code) || code === "42501") return build("permission", `pg_${code}`);
      return build("permission", "http_403");
    }
    if (httpStatus === 404 && MISSING_SCHEMA_CODES.has(code)) {
      return build("missing_schema", `pg_${code}`);
    }
    if (httpStatus === 408) return build("timeout", "http_408");
    if (httpStatus >= 500) return build("server", `http_${httpStatus}`);
  }

  // 5. PostgreSQL / PostgREST codes, which arrive without a usable HTTP status
  //    through the supabase-js client.
  if (MISSING_SCHEMA_CODES.has(code)) return build("missing_schema", `pg_${code}`);
  if (PERMISSION_CODES.has(code)) return build("permission", `pg_${code}`);

  // 7. Auth phrasing from GoTrue, which does not always carry a status. A wrong
  //    email/password is distinct from an expired session: only the first is the
  //    person's own doing, and only the first is worth retrying.
  if (code === "invalid_credentials" || lower.includes("invalid login credentials")) {
    return build("invalid_credentials", "invalid_credentials");
  }
  if (
    lower.includes("jwt expired") ||
    lower.includes("invalid claim") ||
    lower.includes("not authenticated") ||
    lower.includes("auth session missing")
  ) {
    return build("auth", "auth_message");
  }

  // 7. Transport failure while the browser believes it is online. `fetch` rejects
  //    with a TypeError for DNS failure, CORS, TLS and connection refused — all
  //    "cannot reach the server", none of them "your internet is down". Calling
  //    this `offline` is precisely the wrong diagnosis when the server is at
  //    fault or the deployment points somewhere unreachable.
  if (name === "TypeError" && (lower.includes("fetch") || lower.includes("network"))) {
    return build("network", "fetch_failed");
  }
  if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
    return build("network", "fetch_failed");
  }

  return build("unknown", code ? `code_${code}` : "unclassified");
}

/**
 * A single-line, non-sensitive summary for the console. Deliberately excludes
 * the raw driver message, which can carry row values.
 */
export function describeForLog(classified: ClassifiedError): string {
  return `[tori] failure kind=${classified.kind} code=${classified.code} retryable=${classified.retryable}`;
}
