import type { FollowUpStatus, BallHolder, Sensitivity, FollowUpActionKind } from "@/domain/followUp";

export const STATUS_LABEL: Record<FollowUpStatus, string> = {
  action_required: "דורש פעולה",
  waiting_external: "ממתין לגורם חיצוני",
  response_received: "התקבלה תגובה",
  more_info_required: "נדרש מידע נוסף",
  completed: "הושלם",
  closed_no_action: "נסגר ללא פעולה",
  blocked: "חסום",
};

export const STATUS_TONE: Record<FollowUpStatus, string> = {
  action_required: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  waiting_external: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  response_received: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  more_info_required: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  completed: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
  closed_no_action: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  blocked: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

export const BALL_HOLDER_LABEL: Record<BallHolder, string> = {
  us: "אצלנו",
  external: "אצל הגורם החיצוני",
  shared: "משותף",
};

export const SENSITIVITY_LABEL: Record<Sensitivity, string> = {
  household: "כל הבית",
  adults_only: "מבוגרים בלבד",
  restricted: "מוגבל",
};

export const ACTION_KIND_LABEL: Record<FollowUpActionKind, string> = {
  created: "נפתח",
  called: "שיחת טלפון",
  emailed: "שליחת מייל",
  message_sent: "שליחת הודעה",
  response_received: "התקבלה תגובה",
  meeting: "פגישה",
  note: "הערה",
  status_changed: "שינוי סטטוס",
  reminder_set: "נקבעה תזכורת",
  reminder_disabled: "בוטלה תזכורת",
  completed: "הושלם",
};

// Demo-only fallback names for seed fixture member ids that aren't part of
// the real household repo yet. UX-only.
const DEMO_MEMBER_NAMES: Record<string, string> = {
  m_owner: "מנהל/ת הבית (דמו)",
  m_adult: "מבוגר (דמו)",
};

export function resolveMemberName(
  id: string,
  members: ReadonlyArray<{ id: string; name: string }>,
): string {
  const m = members.find((x) => x.id === id);
  if (m) return m.name;
  return DEMO_MEMBER_NAMES[id] ?? id;
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function toDateInputValue(iso: string | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function fromDateInputValue(value: string): string | undefined {
  if (!value) return undefined;
  // Anchor to noon UTC to avoid timezone drift when comparing dates
  return new Date(`${value}T12:00:00.000Z`).toISOString();
}
