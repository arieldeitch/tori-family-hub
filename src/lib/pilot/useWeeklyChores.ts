// Family Pilot — the real weekly chores data layer (WP5D).
//
// Everything here comes from PostgreSQL under the WP5B/WP5C policies. The client
// sends no household id and no profile id: RLS scopes every row to the caller's
// own household, so the week that comes back is the caller's week because the
// SERVER decided so, not because the query asked nicely (ADR-027, ADR-041).
//
// That is also why there is no client-side visibility filtering in this file.
// A child sees the family week minus adult-only chores, and a guest sees only
// their assigned work, because the POLICIES return only those rows. Re-filtering
// here would duplicate the rule in a weaker place and invite the two copies to
// disagree.
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/infrastructure/supabase";
import { classifyError, describeForLog, type ClassifiedError } from "@/lib/errors/classifyError";
import { groupByWeekDay, todayKey, weekRange, type DayKey, type WeekDay } from "@/domain/week";

export interface WeeklyOccurrence {
  id: string;
  templateId: string | null;
  dayKey: DayKey;
  title: string;
  description: string | null;
  status: "pending" | "done" | "skipped" | "blocked";
  completedAt: string | null;
  completedByProfileId: string | null;
  /** The live assignee, or null when nobody holds the turn. */
  assigneeProfileId: string | null;
  /** Why the rotation chose them, in the family's own words. Never re-derived. */
  rotationExplanation: string | null;
  rotationReasonCode: string | null;
  algorithmVersion: string | null;
}

export interface WeeklyChoresState {
  status: "loading" | "ready" | "error";
  weekStart: DayKey;
  days: WeekDay<WeeklyOccurrence>[];
  occurrences: WeeklyOccurrence[];
  failure: ClassifiedError | null;
  reload: () => void;
  /** Move the shown week. Negative goes back. */
  shiftWeek: (weeks: number) => void;
  /**
   * Mark an occurrence complete. Resolves only AFTER the write is confirmed, so
   * the caller can show success only once the row really changed
   * (PILOT_WEEKLY_CHORES.md §7: a failed write must never render as success).
   */
  completeOccurrence: (
    occurrenceId: string,
    actingProfileId: string,
  ) => Promise<{ failure: ClassifiedError | null }>;
  /** Reopen a completed occurrence. Audited, never a silent deletion. */
  reopenOccurrence: (
    occurrenceId: string,
    actingProfileId: string,
  ) => Promise<{ failure: ClassifiedError | null }>;
}

interface InstanceRow {
  id: string;
  template_id: string | null;
  occurrence_date: string;
  title_snapshot: string;
  description_snapshot: string | null;
  status: WeeklyOccurrence["status"];
  completed_at: string | null;
  completed_by: string | null;
}

interface AssignmentRow {
  task_instance_id: string;
  assignee_profile_id: string | null;
  status: string;
  assignment_reason: string | null;
  reason_code: string | null;
  algorithm_version: string | null;
}

interface RotationLogRow {
  task_instance_id: string;
  human_explanation: string | null;
  reason_code: string;
  algorithm_version: string;
}

function shiftDayKey(key: DayKey, days: number): DayKey {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface WeeklyChoresOptions {
  /** Only load once the household is known and the schema is capable. */
  enabled: boolean;
  /**
   * The caller's household. Required for the activity-log insert, whose
   * household_id is NOT NULL and has no default — the log row must state which
   * household it belongs to, and RLS then verifies the caller belongs to it.
   */
  householdId: string | null;
  /** Injectable so tests are not at the mercy of the wall clock. */
  now?: Date;
}

export function useWeeklyChores({
  enabled,
  householdId,
  now = new Date(),
}: WeeklyChoresOptions): WeeklyChoresState {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [occurrences, setOccurrences] = useState<WeeklyOccurrence[]>([]);
  const [failure, setFailure] = useState<ClassifiedError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [weekStart, setWeekStart] = useState<DayKey>(() => weekRange(todayKey(now)).from);

  const today = useMemo(() => todayKey(now), [now]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);
  const shiftWeek = useCallback((weeks: number) => {
    setWeekStart((current) => shiftDayKey(current, weeks * 7));
  }, []);

  const fail = useCallback((error: unknown, httpStatus?: number | null): void => {
    const classified = classifyError({ error, status: httpStatus ?? null });
    // Kind and code to the console; the raw driver message can carry row values.
    console.warn(describeForLog(classified));
    setFailure(classified);
    setStatus("error");
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setStatus("loading");
    setFailure(null);

    const load = async (): Promise<void> => {
      const client = getSupabaseClient();
      const { from, to } = weekRange(weekStart);

      const instances = await client
        .from("task_instances")
        .select(
          "id, template_id, occurrence_date, title_snapshot, description_snapshot, status, completed_at, completed_by",
        )
        .gte("occurrence_date", from)
        .lte("occurrence_date", to)
        .order("occurrence_date", { ascending: true });

      if (!active) return;
      if (instances.error) return fail(instances.error, instances.status);

      const rows = (instances.data ?? []) as InstanceRow[];
      const ids = rows.map((r) => r.id);

      // Assignments and rotation explanations are fetched only for the week that
      // was actually returned, so an empty week costs two trivial queries rather
      // than two full-table reads.
      const [assignments, rotationLog] = await Promise.all([
        ids.length
          ? client
              .from("task_assignments")
              .select(
                "task_instance_id, assignee_profile_id, status, assignment_reason, reason_code, algorithm_version",
              )
              .in("task_instance_id", ids)
              .in("status", ["proposed", "accepted"])
          : Promise.resolve({ data: [], error: null, status: 200 }),
        ids.length
          ? client
              .from("rotation_assignment_log")
              .select("task_instance_id, human_explanation, reason_code, algorithm_version")
              .in("task_instance_id", ids)
          : Promise.resolve({ data: [], error: null, status: 200 }),
      ]);

      if (!active) return;
      // A rotation log the caller may not read is not a reason to fail the whole
      // week — the chores still load, just without the explanation.
      if (assignments.error) return fail(assignments.error, assignments.status);

      const assignmentBy = new Map<string, AssignmentRow>();
      for (const a of (assignments.data ?? []) as AssignmentRow[]) {
        assignmentBy.set(a.task_instance_id, a);
      }
      const rotationBy = new Map<string, RotationLogRow>();
      for (const r of (rotationLog.data ?? []) as RotationLogRow[]) {
        rotationBy.set(r.task_instance_id, r);
      }

      const mapped: WeeklyOccurrence[] = rows.map((row) => {
        const assignment = assignmentBy.get(row.id) ?? null;
        const rotation = rotationBy.get(row.id) ?? null;
        return {
          id: row.id,
          templateId: row.template_id,
          dayKey: row.occurrence_date,
          title: row.title_snapshot,
          description: row.description_snapshot,
          status: row.status,
          completedAt: row.completed_at,
          completedByProfileId: row.completed_by,
          assigneeProfileId: assignment?.assignee_profile_id ?? null,
          // Prefer the stored rotation sentence: it is what the family was
          // actually shown, and re-deriving it risks a different explanation.
          rotationExplanation: rotation?.human_explanation ?? assignment?.assignment_reason ?? null,
          rotationReasonCode: rotation?.reason_code ?? assignment?.reason_code ?? null,
          algorithmVersion: rotation?.algorithm_version ?? assignment?.algorithm_version ?? null,
        };
      });

      setOccurrences(mapped);
      setStatus("ready");
    };

    void load().catch((err: unknown) => {
      if (!active) return;
      fail(err);
    });

    return () => {
      active = false;
    };
  }, [enabled, reloadToken, weekStart, fail]);

  const writeTransition = useCallback(
    async (
      occurrenceId: string,
      actingProfileId: string,
      next: "done" | "pending",
    ): Promise<{ failure: ClassifiedError | null }> => {
      const client = getSupabaseClient();
      const patch =
        next === "done"
          ? {
              status: "done" as const,
              completed_at: new Date().toISOString(),
              completed_by: actingProfileId,
            }
          : { status: "pending" as const, completed_at: null, completed_by: null };

      // `.select()` forces the write to return the row it changed. Without it a
      // zero-row update — an RLS refusal, or a row somebody else already moved —
      // would look identical to success, which §7 forbids outright.
      const { data, error, status } = await client
        .from("task_instances")
        .update(patch)
        .eq("id", occurrenceId)
        .select("id, status, completed_at, completed_by");

      if (error) {
        const classified = classifyError({ error, status: status ?? null });
        console.warn(describeForLog(classified));
        return { failure: classified };
      }
      if (!data || data.length === 0) {
        // Nothing changed. Report a permission fault rather than a fake success.
        const classified = classifyError({ error: { code: "42501" }, status: 403 });
        return { failure: classified };
      }

      // History is appended after the state change is confirmed, so the log can
      // never claim a transition that did not happen.
      if (householdId) {
        const { error: logError } = await client.from("task_activity_log").insert({
          household_id: householdId,
          task_instance_id: occurrenceId,
          acting_profile_id: actingProfileId,
          action_type: "status_changed",
          to_state: next,
        });
        // A log failure must not roll back a completion the family already saw
        // succeed; it is surfaced in the console and the row stands.
        if (logError) console.warn(describeForLog(classifyError({ error: logError })));
      }

      setOccurrences((current) =>
        current.map((o) =>
          o.id === occurrenceId
            ? {
                ...o,
                status: next,
                completedAt: patch.completed_at,
                completedByProfileId: patch.completed_by,
              }
            : o,
        ),
      );
      return { failure: null };
    },
    [householdId],
  );

  const completeOccurrence = useCallback(
    (occurrenceId: string, actingProfileId: string) =>
      writeTransition(occurrenceId, actingProfileId, "done"),
    [writeTransition],
  );

  const reopenOccurrence = useCallback(
    (occurrenceId: string, actingProfileId: string) =>
      writeTransition(occurrenceId, actingProfileId, "pending"),
    [writeTransition],
  );

  const days = useMemo(
    () => groupByWeekDay(occurrences, (o) => o.dayKey, weekStart, today),
    [occurrences, weekStart, today],
  );

  return {
    status,
    weekStart,
    days,
    occurrences,
    failure,
    reload,
    shiftWeek,
    completeOccurrence,
    reopenOccurrence,
  };
}
