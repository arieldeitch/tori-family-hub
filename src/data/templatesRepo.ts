// In-memory task templates repository (prototype only).
// Owns template lifecycle: create, edit (bumps revision), soft delete, restore.
// Occurrence materialisation lives in tasksRepo.materializeOccurrence() so
// there is a single source of truth for TaskInstance objects.

import { useSyncExternalStore } from "react";
import type { TaskTemplate } from "@/domain/task";
import {
  describeRule,
  generateOccurrences,
  isSoftDeleted,
  type RecurrenceRule,
  type MissedAction,
} from "@/domain/recurrence";

type Listener = () => void;

interface State {
  templates: TaskTemplate[];
}

let state: State = { templates: seed() };
const listeners = new Set<Listener>();
function emit() {
  state = { ...state, templates: [...state.templates] };
  for (const l of listeners) l();
}
function uid(p: string) {
  return `${p}_${Math.random().toString(36).slice(2, 9)}`;
}
function nowIso() {
  return new Date().toISOString();
}

export interface CreateTemplateInput {
  title: string;
  description?: string;
  defaultPriority?: TaskTemplate["defaultPriority"];
  adultsOnly?: boolean;
  requiresApproval?: boolean;
  recurrence?: RecurrenceRule;
  participantMemberIds?: ReadonlyArray<string>;
  missedAction?: MissedAction;
}

export function createTemplate(input: CreateTemplateInput): TaskTemplate {
  const title = input.title.trim();
  if (!title) throw new Error("שם התבנית חובה");
  const at = nowIso();
  const tpl: TaskTemplate = {
    id: uid("tpl"),
    title,
    description: input.description?.trim() || undefined,
    defaultPriority: input.defaultPriority ?? "normal",
    adultsOnly: input.adultsOnly,
    requiresApproval: input.requiresApproval,
    recurrence: input.recurrence,
    participantMemberIds: input.participantMemberIds,
    missedAction: input.missedAction,
    humanRule: input.recurrence ? describeRule(input.recurrence) : undefined,
    createdAt: at,
    updatedAt: at,
    revision: 1,
  };
  state = { ...state, templates: [tpl, ...state.templates] };
  emit();
  return tpl;
}

export interface UpdateTemplatePatch {
  title?: string;
  description?: string;
  defaultPriority?: TaskTemplate["defaultPriority"];
  adultsOnly?: boolean;
  requiresApproval?: boolean;
  recurrence?: RecurrenceRule;
  participantMemberIds?: ReadonlyArray<string>;
  missedAction?: MissedAction;
}

/**
 * Edits a template. Bumps `revision` and `updatedAt` — but existing
 * TaskInstance objects keep their snapshot (see task.ts). Never touches
 * history.
 */
export function updateTemplate(id: string, patch: UpdateTemplatePatch): TaskTemplate {
  const idx = state.templates.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("תבנית לא נמצאה");
  const cur = state.templates[idx]!;
  const next: TaskTemplate = {
    ...cur,
    title: patch.title?.trim() || cur.title,
    description: patch.description ?? cur.description,
    defaultPriority: patch.defaultPriority ?? cur.defaultPriority,
    adultsOnly: patch.adultsOnly ?? cur.adultsOnly,
    requiresApproval: patch.requiresApproval ?? cur.requiresApproval,
    recurrence: patch.recurrence ?? cur.recurrence,
    participantMemberIds: patch.participantMemberIds ?? cur.participantMemberIds,
    missedAction: patch.missedAction ?? cur.missedAction,
    humanRule: patch.recurrence ? describeRule(patch.recurrence) : cur.humanRule,
    updatedAt: nowIso(),
    revision: cur.revision + 1,
  };
  state = {
    ...state,
    templates: [...state.templates.slice(0, idx), next, ...state.templates.slice(idx + 1)],
  };
  emit();
  return next;
}

export function softDeleteTemplate(id: string, actorMemberId: string): TaskTemplate {
  const idx = state.templates.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("תבנית לא נמצאה");
  const cur = state.templates[idx]!;
  if (isSoftDeleted(cur)) return cur;
  const next: TaskTemplate = { ...cur, deletedAt: nowIso(), deletedByMemberId: actorMemberId };
  state = {
    ...state,
    templates: [...state.templates.slice(0, idx), next, ...state.templates.slice(idx + 1)],
  };
  emit();
  return next;
}

export function restoreTemplate(id: string): TaskTemplate {
  const idx = state.templates.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("תבנית לא נמצאה");
  const cur = state.templates[idx]!;
  const { deletedAt: _a, deletedByMemberId: _b, ...rest } = cur;
  void _a;
  void _b;
  const next = rest as TaskTemplate;
  state = {
    ...state,
    templates: [...state.templates.slice(0, idx), next, ...state.templates.slice(idx + 1)],
  };
  emit();
  return next;
}

// -------- Queries --------

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function getAll(): ReadonlyArray<TaskTemplate> {
  return state.templates.filter((t) => !isSoftDeleted(t));
}
export function getAllIncludingDeleted(): ReadonlyArray<TaskTemplate> {
  return state.templates;
}
export function getDeleted(): ReadonlyArray<TaskTemplate> {
  return state.templates.filter((t) => isSoftDeleted(t));
}
export function getById(id: string): TaskTemplate | undefined {
  return state.templates.find((t) => t.id === id);
}
export function clear() {
  state = { templates: [] };
  emit();
}
export function reset() {
  state = { templates: seed() };
  emit();
}

/** Convenience: future occurrences for one template over a horizon. */
export function futureOccurrencesFor(id: string, fromIso: string, toIso: string): string[] {
  const t = getById(id);
  if (!t || isSoftDeleted(t) || !t.recurrence) return [];
  return generateOccurrences(t, fromIso, toIso);
}

// -------- Hooks --------

export function useTemplates(): ReadonlyArray<TaskTemplate> {
  return useSyncExternalStore(subscribe, getAll, getAll);
}
export function useDeletedTemplates(): ReadonlyArray<TaskTemplate> {
  return useSyncExternalStore(subscribe, getDeleted, getDeleted);
}
export function useTemplate(id: string): TaskTemplate | undefined {
  return useSyncExternalStore(
    subscribe,
    () => getById(id),
    () => getById(id),
  );
}

// -------- Seed --------

function seed(): TaskTemplate[] {
  const at = nowIso();
  const rec: RecurrenceRule = {
    frequency: "weekly",
    interval: 1,
    byWeekday: [0, 2, 4],
    timeOfDay: "07:15",
  };
  return [
    {
      id: "tpl_demo_school",
      title: "הכנת תיק לבית ספר",
      description: "בדיקת שיעורים, ספרים ותיק אוכל",
      defaultPriority: "normal",
      participantMemberIds: ["m_child"],
      missedAction: "escalate",
      recurrence: rec,
      humanRule: describeRule(rec),
      createdAt: at,
      updatedAt: at,
      revision: 1,
    },
  ];
}
