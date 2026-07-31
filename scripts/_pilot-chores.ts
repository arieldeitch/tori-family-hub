// Family Pilot — the three approved chores, as a converging bootstrap (WP5D).
//
// ADR-034 is absolute: pilot data never enters a migration or the shared
// seed.sql. It is loaded by a guarded, idempotent bootstrap, which is what this
// is. Run it as many times as you like; it converges rather than duplicating.
//
// The chore TITLES are approved product defaults recorded in ADR-036 and
// PILOT_WEEKLY_CHORES.md §4, so they are not personal data and may live in
// source. The PEOPLE are not: participants are resolved from the git-ignored
// local configuration by profile KEY, never by name.
//
// SERVER ONLY. Callers pass an already-guarded service-role client; nothing here
// reads credentials or decides whether an environment is safe to write to.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PilotConfig } from "./_pilot";

/** ISO weekday, matching Date#getUTCDay and the engine's Weekday type. */
type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ApprovedChore {
  /** Stable key, used to converge instead of duplicating. */
  key: string;
  title: string;
  /** Empty = every day. Otherwise the weekdays the chore occurs on. */
  weekdays: Weekday[];
  /**
   * Which child starts the rotation, as an INDEX into the config's child
   * profiles — never a name. ADR-036 staggers the two dishwasher chores so that
   * on any given day one child unloads and the other loads.
   */
  startsWithChildIndex: number;
}

/**
 * The approved defaults (ADR-036). Editable pilot defaults, not permanent
 * product rules: an adult can change any of this in the app without a code
 * change, which is exactly what §8 requires.
 */
export const APPROVED_CHORES: ReadonlyArray<ApprovedChore> = [
  { key: "dishwasher-unload", title: "פינוי מדיח כלים", weekdays: [], startsWithChildIndex: 0 },
  { key: "dishwasher-load", title: "העמסת מדיח כלים", weekdays: [], startsWithChildIndex: 1 },
  // Sunday, Tuesday, Thursday.
  { key: "trash", title: "פינוי פח אשפה", weekdays: [0, 2, 4], startsWithChildIndex: 0 },
];

/** Deterministic uuid v5-ish derivation is overkill; a fixed table is clearer. */
const CHORE_TEMPLATE_IDS: Record<string, string> = {
  "dishwasher-unload": "5d000000-0000-4000-8000-00000000c001",
  "dishwasher-load": "5d000000-0000-4000-8000-00000000c002",
  trash: "5d000000-0000-4000-8000-00000000c003",
};
const CHORE_RULE_IDS: Record<string, string> = {
  "dishwasher-unload": "5d000000-0000-4000-8000-00000000d001",
  "dishwasher-load": "5d000000-0000-4000-8000-00000000d002",
  trash: "5d000000-0000-4000-8000-00000000d003",
};

export interface ChoreConvergence {
  templates: number;
  rules: number;
  members: number;
}

function childProfileIds(config: PilotConfig): string[] {
  return config.profiles.filter((p) => p.isChild).map((p) => p.id);
}

/**
 * Converge the three approved chores, their recurrence and their rotation.
 *
 * Idempotent by construction: fixed ids + upsert for the rows that carry state,
 * and a read-then-reconcile for rotation members, whose uniqueness is a
 * composite constraint rather than a single conflict target.
 */
export async function ensureApprovedChores(
  admin: SupabaseClient,
  config: PilotConfig,
): Promise<ChoreConvergence> {
  const children = childProfileIds(config);
  if (children.length < 2) {
    throw new Error("pilot configuration: the approved rotation needs at least two child profiles");
  }

  // 1. Templates. recurrence_rule is the jsonb the app interprets (WP5B);
  //    an empty weekday list means "every day".
  const templateRows = APPROVED_CHORES.map((chore) => ({
    id: CHORE_TEMPLATE_IDS[chore.key]!,
    household_id: config.household.id,
    title: chore.title,
    recurrence_rule: chore.weekdays.length === 0 ? { every: "day" } : { weekdays: chore.weekdays },
    // "No fixed time" is the approved pilot default (ADR-036).
    time_window_start: null,
    time_window_end: null,
    adult_only: false,
    is_active: true,
    deleted_at: null,
    deleted_by: null,
  }));

  const { error: templateError } = await admin
    .from("task_templates")
    .upsert(templateRows, { onConflict: "id" });
  if (templateError) throw new Error(`chore template upsert failed: ${templateError.message}`);

  // 2. One rotation rule per chore, each with its OWN cursor. That is what
  //    staggers the two dishwasher chores (ADR-036, ADR-043).
  const ruleRows = APPROVED_CHORES.map((chore) => ({
    id: CHORE_RULE_IDS[chore.key]!,
    household_id: config.household.id,
    task_template_id: CHORE_TEMPLATE_IDS[chore.key]!,
    strategy: "fixed_sequence" as const,
    algorithm_version: "shifts.v1",
    advance_mode: "per_occurrence" as const,
    is_active: true,
    deleted_at: null,
    deleted_by: null,
  }));

  const { error: ruleError } = await admin
    .from("rotation_rules")
    .upsert(ruleRows, { onConflict: "id" });
  if (ruleError) throw new Error(`rotation rule upsert failed: ${ruleError.message}`);

  // 3. Participants, in the order that implements the approved stagger. The
  //    child listed FIRST is the one the chore starts with.
  let memberCount = 0;
  for (const chore of APPROVED_CHORES) {
    const ruleId = CHORE_RULE_IDS[chore.key]!;
    const ordered = [
      children[chore.startsWithChildIndex % children.length]!,
      ...children.filter((_, i) => i !== chore.startsWithChildIndex % children.length),
    ];

    const { data: existing, error: readError } = await admin
      .from("rotation_members")
      .select("id, member_profile_id, position")
      .eq("rotation_rule_id", ruleId);
    if (readError) throw new Error(`rotation member read failed: ${readError.message}`);

    const byProfile = new Map((existing ?? []).map((r) => [r.member_profile_id as string, r]));

    for (const [position, profileId] of ordered.entries()) {
      const current = byProfile.get(profileId);
      if (!current) {
        const { error } = await admin.from("rotation_members").insert({
          household_id: config.household.id,
          rotation_rule_id: ruleId,
          member_profile_id: profileId,
          position,
          is_eligible: true,
        });
        if (error) throw new Error(`rotation member insert failed: ${error.message}`);
      } else if (current.position !== position) {
        const { error } = await admin
          .from("rotation_members")
          .update({ position })
          .eq("id", current.id as string);
        if (error) throw new Error(`rotation member update failed: ${error.message}`);
      }
      memberCount += 1;
    }

    // Anybody no longer in the approved order is removed from the FORWARD list;
    // every turn they already took survives in the append-only log.
    const wanted = new Set(ordered);
    for (const stray of (existing ?? []).filter(
      (r) => !wanted.has(r.member_profile_id as string),
    )) {
      const { error } = await admin
        .from("rotation_members")
        .delete()
        .eq("id", stray.id as string);
      if (error) throw new Error(`rotation member cleanup failed: ${error.message}`);
    }
  }

  return { templates: templateRows.length, rules: ruleRows.length, members: memberCount };
}

/** Counts and shape only — never a chore title tied to a person, never a name. */
export async function readChoreState(
  admin: SupabaseClient,
  config: PilotConfig,
): Promise<{ templates: number; rules: number; members: number; converged: boolean }> {
  const [templates, rules, members] = await Promise.all([
    admin.from("task_templates").select("id").eq("household_id", config.household.id),
    admin.from("rotation_rules").select("id").eq("household_id", config.household.id),
    admin.from("rotation_members").select("id").eq("household_id", config.household.id),
  ]);

  const state = {
    templates: (templates.data ?? []).length,
    rules: (rules.data ?? []).length,
    members: (members.data ?? []).length,
    converged: false,
  };
  state.converged =
    state.templates >= APPROVED_CHORES.length &&
    state.rules >= APPROVED_CHORES.length &&
    state.members >= APPROVED_CHORES.length * 2;
  return state;
}
