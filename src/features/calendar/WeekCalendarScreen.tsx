import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useCalendar } from "@/lib/useCalendar";
import { calendarRepo, type CalendarViewState } from "@/data/calendarRepo";
import {
  addDays,
  getWeekStart,
  groupByDay,
  visibleForRole,
} from "@/domain/calendar";
import type { Role } from "@/domain/household";
import { WeekNav } from "./WeekNav";
import { AgendaWeek } from "./AgendaWeek";
import { DesktopWeekGrid } from "./DesktopWeekGrid";
import { EmptyState } from "@/components/design-system/EmptyState";
import { ErrorState } from "@/components/design-system/ErrorState";
import { PermissionDeniedState } from "@/components/design-system/PermissionDeniedState";

const VIEW_OPTIONS: Array<{ value: CalendarViewState; label: string }> = [
  { value: "normal", label: "רגיל" },
  { value: "empty", label: "שבוע ריק" },
  { value: "loading", label: "טעינה" },
  { value: "error", label: "שגיאה" },
  { value: "permission_denied", label: "אין הרשאה" },
];

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: "adult", label: "מבוגר" },
  { value: "child", label: "ילד" },
];

export function WeekCalendarScreen() {
  const { view, events } = useCalendar();
  const [role, setRole] = useState<Role>("adult");
  const today = useMemo(() => new Date(), []);
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const weekEnd = addDays(weekStart, 6);
  const isCurrentWeek = getWeekStart(today).getTime() === weekStart.getTime();

  const buckets = useMemo(() => {
    const visible = visibleForRole(events, role);
    return groupByDay(visible, weekStart);
  }, [events, role, weekStart]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-border/70 bg-muted/40 p-2 text-xs text-muted-foreground">
        <span className="font-medium">תצוגת הדגמה:</span>
        <select
          aria-label="בחירת מצב תצוגה"
          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          value={view}
          onChange={(e) => calendarRepo.setView(e.target.value as CalendarViewState)}
        >
          {VIEW_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="font-medium">תפקיד:</span>
        <select
          aria-label="בחירת תפקיד לצפייה"
          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <WeekNav
        weekStart={weekStart}
        weekEnd={weekEnd}
        onPrev={() => setWeekStart((w) => addDays(w, -7))}
        onNext={() => setWeekStart((w) => addDays(w, 7))}
        onToday={() => setWeekStart(getWeekStart(new Date()))}
        isCurrentWeek={isCurrentWeek}
      />

      {view === "loading" ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          טוען אירועים…
        </div>
      ) : view === "error" ? (
        <ErrorState
          title="לא הצלחנו לטעון את הלוח"
          description="בדקו את החיבור לאינטרנט ונסו שוב."
          onRetry={() => calendarRepo.setView("normal")}
        />
      ) : view === "permission_denied" ? (
        <PermissionDeniedState
          title="אין הרשאה לצפייה בלוח"
          description="פנו למנהל/ת הבית כדי לקבל הרשאה."
        />
      ) : buckets.every((b) => b.events.length === 0) ? (
        <EmptyState
          title="אין אירועים השבוע"
          description="הוסיפו אירוע חדש, או עברו לשבוע אחר."
        />
      ) : (
        <>
          <div className="lg:hidden">
            <AgendaWeek buckets={buckets} today={today} />
          </div>
          <DesktopWeekGrid buckets={buckets} today={today} />
        </>
      )}
    </div>
  );
}
