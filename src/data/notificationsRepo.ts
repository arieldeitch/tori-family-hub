// In-memory notifications repository. Prototype only — no persistence,
// no real delivery (no push / worker / email / SMS / WhatsApp / Supabase).
// Fixtures are seeded relative to "now" so the UI always has fresh
// today / yesterday / earlier buckets to demonstrate.

import {
  DEFAULT_PREFERENCES,
  cancelRemindersForEntity,
  computeDedupeKey,
  dedupe,
  type Notification,
  type NotificationPreferences,
  type EntityRef,
} from "@/domain/notification";

type Listener = () => void;

interface RepoState {
  notifications: Notification[];
  preferences: NotificationPreferences;
  loading: boolean;
  error: string | null;
}

let state: RepoState = {
  notifications: seed(),
  preferences: DEFAULT_PREFERENCES,
  loading: false,
  error: null,
};

const listeners = new Set<Listener>();
function emit() {
  state = { ...state };
  for (const l of listeners) l();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function getState(): RepoState {
  return state;
}

// ---- Reads ----
export function getAll(): Notification[] {
  // Always de-duped, cancelled ones excluded from the visible list.
  return dedupe(state.notifications).filter((n) => !n.cancelledAt);
}
export function getPreferences(): NotificationPreferences {
  return state.preferences;
}

// ---- Mutations ----
export function markRead(id: string): void {
  const at = new Date().toISOString();
  state.notifications = state.notifications.map((n) =>
    n.id === id ? { ...n, readAt: n.readAt ?? at } : n,
  );
  emit();
}
export function markAllRead(): void {
  const at = new Date().toISOString();
  state.notifications = state.notifications.map((n) => (n.readAt ? n : { ...n, readAt: at }));
  emit();
}
export function updatePreferences(patch: Partial<NotificationPreferences>): void {
  state.preferences = { ...state.preferences, ...patch };
  emit();
}
/** Simulates an entity being completed elsewhere in the app. */
export function completeEntity(entity: EntityRef): void {
  state.notifications = cancelRemindersForEntity(state.notifications, {
    entity,
    at: new Date().toISOString(),
  });
  emit();
}

// ---- Seed / fixtures ----
function iso(offsetMinutes: number): string {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString();
}

function seed(): Notification[] {
  const items: Array<Omit<Notification, "dedupeKey">> = [
    {
      id: "n_morning",
      category: "morning_digest",
      title: "סיכום בוקר",
      body: "3 משימות היום, איסוף אחד ב־16:00, סידור אחד באזור המרכז.",
      createdAt: iso(-60 * 2),
      sensitivity: "normal",
      action: { kind: "none", label: "" },
      entityRef: { kind: "digest", id: `morning_${new Date().toISOString().slice(0, 10)}` },
    },
    {
      id: "n_tr_reminder",
      category: "transport_reminder",
      title: "איסוף מחוג חוגים בעוד 30 דקות",
      body: "יציאה מומלצת: 15:35. אחראי: נועה.",
      createdAt: iso(-25),
      sensitivity: "normal",
      action: { kind: "open_transport", label: "פתיחת ההסעה", href: "/transport" },
      entityRef: { kind: "transport", id: "tr_101" },
    },
    {
      id: "n_tr_unassigned",
      category: "unassigned_transport",
      title: "איסוף ללא אחראי",
      body: "איסוף מהחוג ב־17:15 עדיין ללא אדם משובץ.",
      createdAt: iso(-45),
      sensitivity: "normal",
      action: { kind: "assign_transport", label: "שיבוץ אחראי", href: "/transport" },
      entityRef: { kind: "transport", id: "tr_102" },
    },
    {
      id: "n_tr_pending",
      category: "pending_transport_acceptance",
      title: "בקשת שיבוץ ממתינה לאישור",
      body: "שיבצנו אותך לאיסוף ב־18:00. נשמח לאישור.",
      createdAt: iso(-90),
      sensitivity: "normal",
      action: { kind: "accept_transport", label: "אישור השיבוץ", href: "/transport" },
      entityRef: { kind: "transport", id: "tr_103" },
    },
    {
      id: "n_overdue",
      category: "overdue_task",
      title: "משימה עברה את מועדה",
      body: "‘הזמנת תור לרופא שיניים’ לא הושלמה אתמול.",
      createdAt: iso(-60 * 20),
      sensitivity: "normal",
      action: { kind: "open_task", label: "פתיחת המשימה", href: "/tasks" },
      entityRef: { kind: "task", id: "task_501" },
    },
    {
      id: "n_followup",
      category: "follow_up_due",
      title: "הגיע הזמן לעקוב",
      body: "פנייה למרפאה — מומלץ לחזור אליהם היום.",
      createdAt: iso(-60 * 4),
      sensitivity: "sensitive",
      action: { kind: "open_follow_up", label: "פתיחת המעקב", href: "/follow-ups" },
      entityRef: { kind: "follow_up", id: "fu_11" },
    },
    {
      id: "n_shopping",
      category: "urgent_shopping",
      title: "פריט דחוף ברשימת הקניות",
      body: "‘חלב’ סומן כדחוף על ידי נועה.",
      createdAt: iso(-60 * 30),
      sensitivity: "normal",
      action: { kind: "open_shopping", label: "פתיחת הרשימה", href: "/shopping" },
      entityRef: { kind: "shopping_item", id: "si_9" },
    },
    {
      id: "n_evening",
      category: "evening_digest",
      title: "סיכום ערב",
      body: "יום שקט. 2 משימות הושלמו, איסוף אחד עדיין פתוח למחר.",
      createdAt: iso(-60 * 26),
      sensitivity: "normal",
      action: { kind: "none", label: "" },
      entityRef: { kind: "digest", id: "evening_yesterday" },
    },
    {
      id: "n_old_read",
      category: "morning_digest",
      title: "סיכום בוקר",
      body: "היה יום עמוס. הכל בוצע.",
      createdAt: iso(-60 * 24 * 4),
      sensitivity: "normal",
      action: { kind: "none", label: "" },
      readAt: iso(-60 * 24 * 4 + 30),
      entityRef: { kind: "digest", id: "morning_older" },
    },
  ];

  return items.map((n) => ({
    ...n,
    dedupeKey: computeDedupeKey({ category: n.category, entityRef: n.entityRef }),
  }));
}
