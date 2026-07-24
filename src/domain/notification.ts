// Pure domain: notifications.
//
// No React, no I/O, no timers, no side effects. This module models
// notification data, dedupe, quiet-hours, suppression, escalation stages,
// reminder cancellation, and lock-screen previews. UI code MUST NOT decide
// whether to fire, suppress, or truncate a notification — it calls into
// this module and reacts to the result.
//
// SECURITY / PRIVACY: sensitive notifications never surface their real
// title/body in a lock-screen preview. See `renderPreview`.

// -------- Categories & shape --------

export type NotificationCategory =
  | "morning_digest"
  | "evening_digest"
  | "transport_reminder"
  | "unassigned_transport"
  | "pending_transport_acceptance"
  | "overdue_task"
  | "follow_up_due"
  | "urgent_shopping";

export type NotificationSensitivity = "normal" | "sensitive";

export type NotificationActionKind =
  | "open_task"
  | "open_transport"
  | "open_follow_up"
  | "open_shopping"
  | "accept_transport"
  | "assign_transport"
  | "mark_done"
  | "none";

export interface NotificationAction {
  kind: NotificationActionKind;
  label: string;
  /** In-app route; external delivery is out of scope for this prototype. */
  href?: string;
}

/** Reference to the entity a notification is about — used for dedupe and
 * for cancellation when the entity is completed. */
export interface EntityRef {
  kind: "task" | "transport" | "follow_up" | "shopping_item" | "digest";
  id: string;
}

export interface Notification {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  /** ISO. When the notification was produced. */
  createdAt: string;
  entityRef?: EntityRef;
  sensitivity: NotificationSensitivity;
  /** Zero or one direct action. "none" means no direct action available. */
  action: NotificationAction;
  /** ISO — when the recipient marked it read. */
  readAt?: string;
  /** Reason the runtime dropped it, if applicable. */
  suppressedReason?: SuppressionReason;
  /** ISO — set when the linked entity was completed / resolved. */
  cancelledAt?: string;
  /** Deterministic key used to collapse duplicates (see `computeDedupeKey`). */
  dedupeKey: string;
}

// -------- Preferences --------

export interface QuietHours {
  enabled: boolean;
  /** "HH:MM" 24h. Range may cross midnight (e.g. 22:00 → 07:00). */
  startHHMM: string;
  endHHMM: string;
}

export interface NotificationPreferences {
  categoryEnabled: Record<NotificationCategory, boolean>;
  quietHours: QuietHours;
  morningDigestHHMM: string;
  eveningDigestHHMM: string;
  transportReminderOffsetMinutes: number;
  familyEscalation: {
    enabled: boolean;
    /** Minutes to wait at each escalation stage before advancing. */
    stageDelayMinutes: number;
  };
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  categoryEnabled: {
    morning_digest: true,
    evening_digest: true,
    transport_reminder: true,
    unassigned_transport: true,
    pending_transport_acceptance: true,
    overdue_task: true,
    follow_up_due: true,
    urgent_shopping: true,
  },
  quietHours: { enabled: true, startHHMM: "22:00", endHHMM: "07:00" },
  morningDigestHHMM: "07:30",
  eveningDigestHHMM: "20:00",
  transportReminderOffsetMinutes: 30,
  familyEscalation: { enabled: false, stageDelayMinutes: 15 },
};

// -------- Dedupe --------

export interface DedupeKeyInput {
  category: NotificationCategory;
  entityRef?: EntityRef;
  /** Optional bucket — e.g. an ISO date "2026-03-05" so daily digests
   * collapse per day rather than per instant. */
  bucket?: string;
}

/**
 * Deterministic dedupe key. Two notifications sharing this key represent
 * "the same event"; the newer one replaces the older instead of stacking.
 */
export function computeDedupeKey(input: DedupeKeyInput): string {
  const parts: string[] = [input.category];
  if (input.entityRef) parts.push(`${input.entityRef.kind}:${input.entityRef.id}`);
  if (input.bucket) parts.push(input.bucket);
  return parts.join("|");
}

/**
 * Collapses a list by dedupe key, keeping the newest per key.
 * Pure — input array not mutated.
 */
export function dedupe(list: ReadonlyArray<Notification>): Notification[] {
  const byKey = new Map<string, Notification>();
  for (const n of list) {
    const existing = byKey.get(n.dedupeKey);
    if (!existing || n.createdAt > existing.createdAt) byKey.set(n.dedupeKey, n);
  }
  return Array.from(byKey.values());
}

// -------- Quiet hours --------

/** Parses "HH:MM" → minutes since midnight. Throws on malformed input. */
export function parseHHMM(s: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) throw new Error(`invalid HH:MM: "${s}"`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) throw new Error(`out-of-range HH:MM: "${s}"`);
  return h * 60 + min;
}

/**
 * True when `nowHHMM` falls inside a quiet window `[start, end)`. Handles
 * ranges that cross midnight (e.g. 22:00 → 07:00 covers 23:30 AND 03:00).
 * Same start & end → empty window (never quiet).
 */
export function isWithinQuietHours(nowHHMM: string, quiet: QuietHours): boolean {
  if (!quiet.enabled) return false;
  const now = parseHHMM(nowHHMM);
  const start = parseHHMM(quiet.startHHMM);
  const end = parseHHMM(quiet.endHHMM);
  if (start === end) return false;
  if (start < end) return now >= start && now < end;
  // Cross-midnight: quiet is [start, 24:00) ∪ [00:00, end).
  return now >= start || now < end;
}

// -------- Suppression --------

export type SuppressionReason = "category_disabled" | "quiet_hours" | "entity_completed";

export interface SuppressionDecision {
  suppressed: boolean;
  reason?: SuppressionReason;
}

/**
 * Pure decision: should we drop this notification at the moment it is
 * about to be shown? UI never makes this call itself.
 *
 * Digest categories intentionally BYPASS quiet-hours — the whole point of
 * a digest is to summarise; suppressing it defeats the feature. Explicit
 * category-disabled always wins.
 */
export function shouldSuppress(
  n: Pick<Notification, "category">,
  prefs: NotificationPreferences,
  nowHHMM: string,
): SuppressionDecision {
  if (!prefs.categoryEnabled[n.category]) {
    return { suppressed: true, reason: "category_disabled" };
  }
  const isDigest = n.category === "morning_digest" || n.category === "evening_digest";
  if (!isDigest && isWithinQuietHours(nowHHMM, prefs.quietHours)) {
    return { suppressed: true, reason: "quiet_hours" };
  }
  return { suppressed: false };
}

// -------- Escalation --------

export type EscalationStage = "none" | "self" | "family_partner" | "all_family";

const STAGE_ORDER: ReadonlyArray<EscalationStage> = [
  "none",
  "self",
  "family_partner",
  "all_family",
];

/**
 * Advances one escalation stage. `all_family` is terminal — further calls
 * return `all_family`. When `familyEscalation.enabled` is false the
 * escalation stops at `self`.
 */
export function nextEscalationStage(
  current: EscalationStage,
  prefs: NotificationPreferences,
): EscalationStage {
  const idx = STAGE_ORDER.indexOf(current);
  const nextIdx = Math.min(idx + 1, STAGE_ORDER.length - 1);
  const next = STAGE_ORDER[nextIdx]!;
  if (!prefs.familyEscalation.enabled && (next === "family_partner" || next === "all_family")) {
    return "self";
  }
  return next;
}

// -------- Cancellation on entity completion --------

export interface CancelInput {
  entity: EntityRef;
  at: string; // ISO
}

/**
 * Returns a new list where every reminder pointing at the completed entity
 * has `cancelledAt` set. Pure — input not mutated. Categories that are
 * NOT reminders (e.g. digests) are left untouched even if `entityRef`
 * matches (defensive; digests don't reference single entities).
 */
export function cancelRemindersForEntity(
  list: ReadonlyArray<Notification>,
  input: CancelInput,
): Notification[] {
  return list.map((n) => {
    if (n.cancelledAt) return n;
    if (!n.entityRef) return n;
    if (n.entityRef.kind !== input.entity.kind || n.entityRef.id !== input.entity.id) return n;
    if (n.category === "morning_digest" || n.category === "evening_digest") return n;
    return { ...n, cancelledAt: input.at };
  });
}

// -------- Lock-screen preview / sensitive redaction --------

export interface Preview {
  title: string;
  body: string;
}

/** Fallback text shown for `sensitivity: "sensitive"` on lock-screen. */
export const SENSITIVE_LOCK_TITLE = "יש עדכון בנושא פרטי";
export const SENSITIVE_LOCK_BODY = "";

/**
 * Produces the preview text to display. `context` distinguishes between
 * an in-app view (full text) and a lock-screen preview (redact sensitive).
 */
export function renderPreview(
  n: Pick<Notification, "title" | "body" | "sensitivity">,
  context: "in_app" | "lock_screen",
): Preview {
  if (context === "lock_screen" && n.sensitivity === "sensitive") {
    return { title: SENSITIVE_LOCK_TITLE, body: SENSITIVE_LOCK_BODY };
  }
  return { title: n.title, body: n.body };
}

// -------- Action availability --------

export function hasAction(n: Pick<Notification, "action">): boolean {
  return n.action.kind !== "none";
}
