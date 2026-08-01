// Generate the dated week: occurrences, assignments and rotation decisions.
//
// WHY THIS EXISTS
//
// `_pilot-chores.ts` creates the DEFINITION of the chores — templates, rotation
// rules and participants. It creates no dated rows at all, so the weekly view,
// which queries `task_instances` for a date range, correctly found nothing and
// rendered its empty state. Definitions are not a week.
//
// This closes that gap. It is deliberately a separate, re-runnable convergence
// step rather than part of the chores bootstrap, because a week has to be
// generated repeatedly as time moves forward, whereas the definitions are
// written once.
//
// DETERMINISM
//
// Assignment reuses `src/domain/shifts.ts` (`shifts.v1`) — the engine
// 08-rotation-engine.md mandates. Nothing here re-implements selection. The
// cursor is read from and advanced on `rotation_rules`, so the sequence
// continues across weeks and never resets on Sunday (ADR-036, ADR-043).
//
// IDEMPOTENCY
//
// Three independent database guarantees do the work, so this file does not have
// to be clever:
//
//   * `task_instances_occurrence_key_unique` — one occurrence per
//     (household, template, date)
//   * `task_assignments_one_live_per_instance` — one live assignment per occurrence
//   * `rotation_assignment_log_one_per_instance` — one decision per (rule, occurrence)
//
// Every write is therefore read-then-insert, and a lost race surfaces as a
// unique violation which is treated as "somebody else already did it" — never as
// an error, and never as a duplicate.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PilotConfig } from "./_pilot";
import { selectAssignee, ALGORITHM_VERSION, type Weekday } from "../src/domain/shifts";

/** Postgres unique-violation. Means the row already existed. */
const UNIQUE_VIOLATION = "23505";

export interface WeekWindow {
  /** Inclusive first day, an ISO day key. Always a Sunday. */
  from: string;
  /** Inclusive last day. */
  to: string;
}

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fromKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

function addDays(key: string, days: number): string {
  const d = fromKey(key);
  d.setUTCDate(d.getUTCDate() + days);
  return toKey(d);
}

/** The Sunday starting the week that contains `key`. UTC calendar (ADR-006). */
export function startOfWeek(key: string): string {
  return addDays(key, -fromKey(key).getUTCDay());
}

/**
 * The rolling window to generate.
 *
 * The current week plus `weeksAhead` further weeks. PILOT_WEEKLY_CHORES.md asks
 * that adding a chore "appear in future weeks", so a small forward window keeps
 * the app populated without pre-computing months of rows that a template edit
 * would then have to reconcile.
 */
export function rollingWindow(today: string, weeksAhead = 3): WeekWindow {
  const from = startOfWeek(today);
  return { from, to: addDays(from, 7 * (weeksAhead + 1) - 1) };
}

interface TemplateRow {
  id: string;
  title: string;
  description: string | null;
  recurrence_rule: { every?: string; weekdays?: number[] } | null;
  default_priority: string;
  starts_on: string;
  ends_on: string | null;
  is_active: boolean;
  deleted_at: string | null;
}

interface RuleRow {
  id: string;
  task_template_id: string;
  strategy: "fixed_sequence" | "weekday_fixed" | "manual";
  algorithm_version: string;
  avoid_consecutive: boolean;
  fallback: "unassigned" | "next_available_in_sequence";
  cursor_profile_id: string | null;
}

/** Does this template occur on this day? Empty weekday list means every day. */
export function occursOn(template: TemplateRow, dayKey: string): boolean {
  if (!template.is_active || template.deleted_at) return false;
  if (dayKey < template.starts_on) return false;
  if (template.ends_on && dayKey > template.ends_on) return false;

  const rule = template.recurrence_rule ?? {};
  const weekdays = Array.isArray(rule.weekdays) ? rule.weekdays : null;
  if (!weekdays || weekdays.length === 0) return true;
  return weekdays.includes(fromKey(dayKey).getUTCDay());
}

export interface GenerationResult {
  daysConsidered: number;
  occurrencesCreated: number;
  occurrencesExisting: number;
  assignmentsCreated: number;
  assignmentsExisting: number;
  decisionsCreated: number;
  decisionsExisting: number;
  cursorAdvances: number;
}

/**
 * Converge the window. Safe to run repeatedly and concurrently.
 *
 * Nothing is ever deleted or rewritten: an occurrence that already exists is
 * left exactly as it is, including its snapshots and completion state, so a
 * chore somebody already ticked stays ticked.
 */
export async function generateWeek(
  admin: SupabaseClient,
  config: PilotConfig,
  window: WeekWindow,
): Promise<GenerationResult> {
  const householdId = config.household.id;
  const result: GenerationResult = {
    daysConsidered: 0,
    occurrencesCreated: 0,
    occurrencesExisting: 0,
    assignmentsCreated: 0,
    assignmentsExisting: 0,
    decisionsCreated: 0,
    decisionsExisting: 0,
    cursorAdvances: 0,
  };

  const { data: templates, error: templateError } = await admin
    .from("task_templates")
    .select(
      "id, title, description, recurrence_rule, default_priority, starts_on, ends_on, is_active, deleted_at",
    )
    .eq("household_id", householdId);
  if (templateError) throw new Error(`template read failed: ${templateError.message}`);

  const { data: rules, error: ruleError } = await admin
    .from("rotation_rules")
    .select(
      "id, task_template_id, strategy, algorithm_version, avoid_consecutive, fallback, cursor_profile_id",
    )
    .eq("household_id", householdId)
    .is("deleted_at", null)
    .eq("is_active", true);
  if (ruleError) throw new Error(`rotation rule read failed: ${ruleError.message}`);

  const ruleByTemplate = new Map<string, RuleRow>(
    ((rules ?? []) as RuleRow[]).map((r) => [r.task_template_id, r]),
  );

  const { data: members, error: memberError } = await admin
    .from("rotation_members")
    .select("rotation_rule_id, member_profile_id, position, is_eligible")
    .eq("household_id", householdId)
    .order("position", { ascending: true });
  if (memberError) throw new Error(`rotation member read failed: ${memberError.message}`);

  const membersByRule = new Map<string, { id: string; eligible: boolean }[]>();
  for (const m of members ?? []) {
    const list = membersByRule.get(m.rotation_rule_id as string) ?? [];
    list.push({ id: m.member_profile_id as string, eligible: Boolean(m.is_eligible) });
    membersByRule.set(m.rotation_rule_id as string, list);
  }

  // Day-by-day so the cursor advances in calendar order, which is what makes the
  // staggered dishwasher chores alternate correctly.
  for (let day = window.from; day <= window.to; day = addDays(day, 1)) {
    result.daysConsidered += 1;

    for (const template of (templates ?? []) as TemplateRow[]) {
      if (!occursOn(template, day)) continue;

      // ---- the occurrence -------------------------------------------------
      const { data: existingInstance } = await admin
        .from("task_instances")
        .select("id")
        .eq("household_id", householdId)
        .eq("template_id", template.id)
        .eq("occurrence_date", day)
        .is("deleted_at", null)
        .maybeSingle();

      let instanceId = existingInstance?.id as string | undefined;

      if (instanceId) {
        result.occurrencesExisting += 1;
      } else {
        const inserted = await admin
          .from("task_instances")
          .insert({
            household_id: householdId,
            template_id: template.id,
            occurrence_date: day,
            // Snapshots, taken once at creation and immutable afterwards.
            title_snapshot: template.title,
            description_snapshot: template.description,
            priority: template.default_priority,
            source: "generated",
          })
          .select("id")
          .maybeSingle();

        if (inserted.error) {
          if (inserted.error.code !== UNIQUE_VIOLATION) {
            throw new Error(`occurrence insert failed: ${inserted.error.message}`);
          }
          // Lost the race: somebody generated the same day. Adopt theirs.
          const { data: raced } = await admin
            .from("task_instances")
            .select("id")
            .eq("household_id", householdId)
            .eq("template_id", template.id)
            .eq("occurrence_date", day)
            .is("deleted_at", null)
            .maybeSingle();
          instanceId = raced?.id as string | undefined;
          result.occurrencesExisting += 1;
        } else {
          instanceId = inserted.data?.id as string | undefined;
          result.occurrencesCreated += 1;
        }
      }

      if (!instanceId) continue;

      const rule = ruleByTemplate.get(template.id);
      if (!rule) continue;

      // ---- the decision ---------------------------------------------------
      const { data: existingDecision } = await admin
        .from("rotation_assignment_log")
        .select("id")
        .eq("rotation_rule_id", rule.id)
        .eq("task_instance_id", instanceId)
        .maybeSingle();

      if (existingDecision) {
        result.decisionsExisting += 1;
        continue;
      }

      const participants = membersByRule.get(rule.id) ?? [];
      if (participants.length === 0) continue;

      const engineResult = selectAssignee({
        rule: {
          strategy: rule.strategy,
          sequence: participants.map((p) => p.id),
          fallback: rule.fallback,
          avoidConsecutive: rule.avoid_consecutive,
        },
        participants: participants.map((p) => ({ memberId: p.id, eligible: p.eligible })),
        availability: { unavailableMemberIds: [] },
        lastAssigneeId: rule.cursor_profile_id,
        targetWeekday: fromKey(day).getUTCDay() as Weekday,
      });

      const decision = await admin.from("rotation_assignment_log").insert({
        household_id: householdId,
        rotation_rule_id: rule.id,
        task_instance_id: instanceId,
        selected_profile_id: engineResult.selectedProfileId,
        reason_code: engineResult.reasonCode,
        algorithm_version: engineResult.algorithmVersion || ALGORITHM_VERSION,
        // Stored verbatim: this is the sentence the family will read, and
        // re-deriving it later could show something different.
        human_explanation: engineResult.humanExplanation.slice(0, 500),
        candidate_snapshot: engineResult.candidateSnapshot,
        warnings: engineResult.warnings,
        cursor_before_profile_id: rule.cursor_profile_id,
      });

      if (decision.error) {
        if (decision.error.code !== UNIQUE_VIOLATION) {
          throw new Error(`rotation decision insert failed: ${decision.error.message}`);
        }
        result.decisionsExisting += 1;
        continue;
      }
      result.decisionsCreated += 1;

      // ---- the assignment -------------------------------------------------
      if (engineResult.selectedProfileId) {
        const { data: liveAssignment } = await admin
          .from("task_assignments")
          .select("id")
          .eq("task_instance_id", instanceId)
          .in("status", ["proposed", "accepted"])
          .maybeSingle();

        if (liveAssignment) {
          result.assignmentsExisting += 1;
        } else {
          const assignment = await admin.from("task_assignments").insert({
            household_id: householdId,
            task_instance_id: instanceId,
            assignee_profile_id: engineResult.selectedProfileId,
            assignment_type: "rotation",
            status: "proposed",
            assigned_by_rule_id: rule.id,
            assignment_reason: engineResult.humanExplanation.slice(0, 500),
            // A rotation assignment without both of these is refused by a check
            // constraint — "no hidden decision", enforced in the database.
            reason_code: engineResult.reasonCode,
            algorithm_version: engineResult.algorithmVersion || ALGORITHM_VERSION,
          });
          if (assignment.error) {
            if (assignment.error.code !== UNIQUE_VIOLATION) {
              throw new Error(`assignment insert failed: ${assignment.error.message}`);
            }
            result.assignmentsExisting += 1;
          } else {
            result.assignmentsCreated += 1;
          }
        }

        // ---- advance the cursor -------------------------------------------
        // Only after a decision is recorded, so a read never moves it and the
        // same window can be recomputed without drift.
        const { error: cursorError } = await admin
          .from("rotation_rules")
          .update({
            cursor_profile_id: engineResult.selectedProfileId,
            cursor_advanced_at: new Date().toISOString(),
          })
          .eq("id", rule.id);
        if (cursorError) throw new Error(`cursor advance failed: ${cursorError.message}`);
        rule.cursor_profile_id = engineResult.selectedProfileId;
        result.cursorAdvances += 1;
      }
    }
  }

  return result;
}

/** Counts only — never a title beside a person. */
export async function readWeekState(
  admin: SupabaseClient,
  config: PilotConfig,
  window: WeekWindow,
): Promise<{ occurrences: number; assignments: number; decisions: number }> {
  const { data: instances } = await admin
    .from("task_instances")
    .select("id")
    .eq("household_id", config.household.id)
    .gte("occurrence_date", window.from)
    .lte("occurrence_date", window.to)
    .is("deleted_at", null);

  const ids = (instances ?? []).map((r) => r.id as string);

  const [assignments, decisions] = await Promise.all([
    ids.length
      ? admin
          .from("task_assignments")
          .select("id")
          .in("task_instance_id", ids)
          .in("status", ["proposed", "accepted"])
      : Promise.resolve({ data: [] }),
    ids.length
      ? admin.from("rotation_assignment_log").select("id").in("task_instance_id", ids)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    occurrences: ids.length,
    assignments: (assignments.data ?? []).length,
    decisions: (decisions.data ?? []).length,
  };
}
