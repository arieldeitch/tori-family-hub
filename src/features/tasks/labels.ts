import type { TaskPriority, TaskStatus } from "@/domain/task";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  inbox: "תיבה נכנסת",
  planned: "מתוכנן",
  assigned: "הוקצה",
  accepted: "התקבל",
  in_progress: "בביצוע",
  waiting: "ממתין",
  blocked: "חסום",
  done: "בוצע",
  skipped: "דולג",
  cancelled: "בוטל",
};

export const STATUS_TONE: Record<TaskStatus, "neutral" | "info" | "warning" | "success" | "muted"> = {
  inbox: "neutral",
  planned: "info",
  assigned: "info",
  accepted: "info",
  in_progress: "warning",
  waiting: "warning",
  blocked: "warning",
  done: "success",
  skipped: "muted",
  cancelled: "muted",
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "נמוכה",
  normal: "רגילה",
  high: "גבוהה",
  urgent: "דחוף",
};

export const PRIORITY_TONE: Record<TaskPriority, "muted" | "neutral" | "warning" | "danger"> = {
  low: "muted",
  normal: "neutral",
  high: "warning",
  urgent: "danger",
};

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function resolveMemberName(
  members: ReadonlyArray<{ id: string; name: string }>,
  id: string | null | undefined,
): string {
  if (!id) return "ללא אחראי";
  return members.find((m) => m.id === id)?.name ?? "חבר לא ידוע";
}
