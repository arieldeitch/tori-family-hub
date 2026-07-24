// In-memory repository for shift rules and demo history. Prototype only —
// no persistence across refresh, no server, no RLS. All engine calls happen
// in application-layer helpers (features/shifts/*), never inside repo.

import type {
  FallbackStrategy,
  ReasonCode,
  ShiftStrategy,
  Weekday,
} from "@/domain/shifts";

export interface ShiftRule {
  id: string;
  name: string;
  strategy: ShiftStrategy;
  participantMemberIds: string[];
  sequence?: string[];
  weekday?: Partial<Record<Weekday, string>>;
  avoidConsecutive?: boolean;
  fallback?: FallbackStrategy;
  /** Preview cadence — prototype-only. */
  frequency: "daily" | "weekly";
  /** For weekly cadence, which weekday the occurrence falls on. */
  weeklyOn?: Weekday;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryEntry {
  id: string;
  ruleId: string;
  occurrenceIso: string;
  memberId: string | null;
  reasonCode: ReasonCode;
  humanExplanation: string;
  algorithmVersion: string;
  /** Marks this row as demo/simulation, not a real assignment. */
  demo: true;
}

/** Per-occurrence unavailability: `dateISO -> memberIds unavailable`. */
export type AvailabilityMap = Record<string, string[]>;

interface RepoState {
  rules: ShiftRule[];
  history: HistoryEntry[];
  availability: AvailabilityMap;
}

let state: RepoState = { rules: [], history: [], availability: {} };
const listeners = new Set<() => void>();

function emit() {
  state = { ...state };
  listeners.forEach((l) => l());
}
function uid(p: string) {
  return `${p}_${Math.random().toString(36).slice(2, 9)}`;
}
function nowIso() {
  return new Date().toISOString();
}

export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function getRules(): ReadonlyArray<ShiftRule> {
  return state.rules;
}
export function getRule(id: string): ShiftRule | undefined {
  return state.rules.find((r) => r.id === id);
}
export function getHistory(ruleId: string): ReadonlyArray<HistoryEntry> {
  return state.history.filter((h) => h.ruleId === ruleId);
}
export function getAvailability(): Readonly<AvailabilityMap> {
  return state.availability;
}
export function getUnavailable(dateIso: string): ReadonlyArray<string> {
  return state.availability[dateIso.slice(0, 10)] ?? [];
}

export function toggleUnavailable(dateIso: string, memberId: string): void {
  const key = dateIso.slice(0, 10);
  const cur = new Set(state.availability[key] ?? []);
  if (cur.has(memberId)) cur.delete(memberId);
  else cur.add(memberId);
  state = { ...state, availability: { ...state.availability, [key]: [...cur] } };
  emit();
}

export function createRule(
  input: Omit<ShiftRule, "id" | "createdAt" | "updatedAt">,
): ShiftRule {
  if (!input.name.trim()) throw new Error("שם התורנות חובה");
  const at = nowIso();
  const rule: ShiftRule = {
    ...input,
    name: input.name.trim(),
    id: uid("shr"),
    createdAt: at,
    updatedAt: at,
  };
  state = { ...state, rules: [rule, ...state.rules] };
  emit();
  return rule;
}

export function updateRule(id: string, patch: Partial<ShiftRule>): ShiftRule {
  const idx = state.rules.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("כלל לא נמצא");
  const merged: ShiftRule = { ...state.rules[idx]!, ...patch, id, updatedAt: nowIso() };
  state = {
    ...state,
    rules: [...state.rules.slice(0, idx), merged, ...state.rules.slice(idx + 1)],
  };
  emit();
  return merged;
}

export function deleteRule(id: string): void {
  state = {
    ...state,
    rules: state.rules.filter((r) => r.id !== id),
    history: state.history.filter((h) => h.ruleId !== id),
  };
  emit();
}

/**
 * Records a demo history entry. Prototype-only — no persistence, and always
 * flagged `demo: true`. Manual UI overrides append here; they do NOT rewrite
 * earlier rows.
 */
export function recordHistory(
  entry: Omit<HistoryEntry, "id" | "demo">,
): HistoryEntry {
  const row: HistoryEntry = { ...entry, id: uid("hst"), demo: true };
  state = { ...state, history: [...state.history, row] };
  emit();
  return row;
}

export function reset(): void {
  state = { rules: [], history: [], availability: {} };
  emit();
}

export function seedDemo(members: { id: string; name: string }[]): void {
  if (state.rules.length > 0 || members.length < 2) return;
  const [a, b, c] = members;
  createRule({
    name: "פינוי אשפה",
    strategy: "fixed_sequence",
    participantMemberIds: members.map((m) => m.id),
    sequence: members.map((m) => m.id),
    avoidConsecutive: true,
    frequency: "daily",
  });
  if (a && b) {
    createRule({
      name: "לקיחת הכלב לטיול בוקר",
      strategy: "weekday_fixed",
      participantMemberIds: [a.id, b.id, ...(c ? [c.id] : [])],
      weekday: {
        0: a.id,
        1: b.id,
        2: a.id,
        3: b.id,
        4: a.id,
        5: c?.id ?? a.id,
        6: c?.id ?? b.id,
      },
      fallback: "unassigned",
      frequency: "daily",
    });
  }
}
