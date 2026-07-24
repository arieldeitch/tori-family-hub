import type { TransportStatus } from "@/domain/transport";
import type { StatusKind } from "@/components/design-system/StatusBadge";

export const STATUS_LABEL: Record<TransportStatus, string> = {
  unassigned: "ללא אחראי",
  pending_acceptance: "ממתין לאישור",
  accepted: "אושר",
  en_route: "בדרך",
  completed: "הושלם",
  transferred: "הועבר",
  cancelled: "בוטל",
};

export const STATUS_KIND: Record<TransportStatus, StatusKind> = {
  unassigned: "warning",
  pending_acceptance: "warning",
  accepted: "info",
  en_route: "info",
  completed: "success",
  transferred: "neutral",
  cancelled: "neutral",
};

export const DIRECTION_LABEL = { pickup: "איסוף", dropoff: "הורדה" } as const;

const timeFmt = new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("he-IL", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}
export function formatDayTime(iso: string): string {
  const d = new Date(iso);
  return `${dayFmt.format(d)} · ${timeFmt.format(d)}`;
}

/** Human relative deadline label, e.g. "עוד 47 דק׳" / "עבר לפני 12 דק׳". */
export function formatDeadline(iso: string, now: Date = new Date()): string {
  const diff = new Date(iso).getTime() - now.getTime();
  const mins = Math.round(diff / 60000);
  if (mins > 60) return `עוד ${Math.round(mins / 60)} שע׳`;
  if (mins >= 0) return `עוד ${mins} דק׳`;
  const past = Math.abs(mins);
  if (past >= 60) return `עבר לפני ${Math.round(past / 60)} שע׳`;
  return `עבר לפני ${past} דק׳`;
}

export function isDeadlinePast(iso: string, now: Date = new Date()): boolean {
  return new Date(iso).getTime() < now.getTime();
}
