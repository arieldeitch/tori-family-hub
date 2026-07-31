// The weekly family chores view (WP5D).
//
// Sunday → Saturday, grouped by day, today marked. Every card names its assignee
// in words as well as by avatar, and states its status in words — never by
// colour alone (02-ux-ui-guidelines.md).
//
// There is deliberately NO client-side visibility filtering here. A child sees
// the family week minus adult-only chores, and a guest sees only assigned work,
// because RLS returned only those rows (ADR-041). Filtering again in the browser
// would put the rule in a weaker place and let the two copies disagree.
import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PermissionDeniedState,
} from "@/components/design-system";
import type { ClassifiedError } from "@/lib/errors/classifyError";
import type { PerspectiveProfile } from "@/lib/pilot/perspective";
import type { WeeklyChoresState, WeeklyOccurrence } from "@/lib/pilot/useWeeklyChores";
import { fromDayKey, type DayKey } from "@/domain/week";

/** Hebrew weekday names live in the view, never in domain logic. */
const WEEKDAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"] as const;

const STATUS_TEXT: Record<WeeklyOccurrence["status"], string> = {
  pending: "ממתין",
  done: "בוצע",
  skipped: "דולג",
  blocked: "חסום",
};

function dayLabel(dayKey: DayKey): string {
  const d = fromDayKey(dayKey);
  return `יום ${WEEKDAY_NAMES[d.getUTCDay()]} · ${d.getUTCDate()}.${d.getUTCMonth() + 1}`;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2);
  return (parts[0]![0] ?? "") + (parts[1]![0] ?? "");
}

export interface WeeklyChoresViewProps {
  weekly: WeeklyChoresState;
  profiles: ReadonlyArray<PerspectiveProfile>;
  /** The profile actions are attributed to (ADR-035: display and attribution). */
  actingProfile: PerspectiveProfile | null;
}

export function WeeklyChoresView({ weekly, profiles, actingProfile }: WeeklyChoresViewProps) {
  const { status, days, failure, reload, shiftWeek, completeOccurrence, reopenOccurrence } = weekly;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionFailure, setActionFailure] = useState<ClassifiedError | null>(null);

  const nameOf = (profileId: string | null): string | null =>
    profileId ? (profiles.find((p) => p.id === profileId)?.displayName ?? null) : null;

  async function toggle(occurrence: WeeklyOccurrence): Promise<void> {
    if (!actingProfile || busyId) return;
    setBusyId(occurrence.id);
    setActionFailure(null);
    // Success is shown only after the write is confirmed, and a failure rolls
    // back visibly rather than leaving a false tick (PILOT §7).
    const result =
      occurrence.status === "done"
        ? await reopenOccurrence(occurrence.id, actingProfile.id)
        : await completeOccurrence(occurrence.id, actingProfile.id);
    setActionFailure(result.failure);
    setBusyId(null);
  }

  if (status === "loading") return <LoadingState title="טוען את שבוע המטלות…" />;

  if (status === "error") {
    if (failure?.kind === "permission") {
      return <PermissionDeniedState title={failure.message} description={failure.hint} />;
    }
    return (
      <ErrorState
        title={failure?.message ?? "לא הצלחנו לטעון את שבוע המטלות"}
        description={failure?.hint ?? "נסו שוב בעוד רגע."}
        action={
          failure?.retryable !== false ? (
            <Button variant="outline" className="min-h-11" onClick={reload}>
              נסו שוב
            </Button>
          ) : undefined
        }
      />
    );
  }

  const total = days.reduce((n, d) => n + d.items.length, 0);

  return (
    <section dir="rtl" className="space-y-4">
      <header className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="min-h-11 min-w-11"
          onClick={() => shiftWeek(-1)}
          aria-label="השבוע הקודם"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Button>
        <h2 className="text-base font-semibold text-foreground">שבוע המטלות</h2>
        <Button
          variant="ghost"
          size="sm"
          className="min-h-11 min-w-11"
          onClick={() => shiftWeek(1)}
          aria-label="השבוע הבא"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
      </header>

      {actionFailure ? (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">{actionFailure.message}</p>
          <p className="mt-1 text-xs text-destructive/90">{actionFailure.hint}</p>
        </div>
      ) : null}

      {total === 0 ? (
        <EmptyState
          title="אין מטלות בשבוע הזה"
          description="כשיתווספו מטלות קבועות, הן יופיעו כאן מיום ראשון עד שבת."
        />
      ) : (
        <ol className="space-y-4">
          {days.map((day) => (
            <li key={day.dayKey}>
              <h3
                className={`mb-2 text-sm font-medium ${
                  day.isToday ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {dayLabel(day.dayKey)}
                {day.isToday ? (
                  <span className="ms-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    היום
                  </span>
                ) : null}
              </h3>

              {day.items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  אין מטלות
                </p>
              ) : (
                <ul className="space-y-2">
                  {day.items.map((occurrence) => {
                    const assignee = nameOf(occurrence.assigneeProfileId);
                    const done = occurrence.status === "done";
                    const busy = busyId === occurrence.id;
                    return (
                      <li key={occurrence.id}>
                        <button
                          type="button"
                          onClick={() => void toggle(occurrence)}
                          disabled={busy || !actingProfile}
                          aria-pressed={done}
                          className={`flex w-full min-h-11 items-start gap-3 rounded-xl border p-3 text-start transition ${
                            done ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                        >
                          <span
                            aria-hidden="true"
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                              done
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border"
                            }`}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : done ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : null}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span
                              className={`block truncate text-sm font-medium ${
                                done ? "text-muted-foreground line-through" : "text-foreground"
                              }`}
                            >
                              {occurrence.title}
                            </span>

                            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                              {assignee ? (
                                <span className="inline-flex items-center gap-1">
                                  <span
                                    aria-hidden="true"
                                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold"
                                  >
                                    {initialsOf(assignee)}
                                  </span>
                                  {assignee}
                                </span>
                              ) : (
                                <span>לא שובץ</span>
                              )}
                              <span aria-hidden="true">·</span>
                              {/* Status in words, never colour alone. */}
                              <span className="font-medium">{STATUS_TEXT[occurrence.status]}</span>
                            </span>

                            {occurrence.rotationExplanation ? (
                              <span className="mt-1.5 flex items-start gap-1 text-[11px] text-muted-foreground">
                                <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                                <span>{occurrence.rotationExplanation}</span>
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}

      {!actingProfile ? (
        <p className="text-center text-xs text-muted-foreground">
          בחרו פרופיל כדי לסמן מטלות כבוצעו.
        </p>
      ) : null}
    </section>
  );
}
