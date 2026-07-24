// Canonical demo people directory.
//
// Purpose: give every repo/service a single source of truth for member
// identity so composed screens (e.g. Today) can resolve names/roles/colors
// no matter which repo an item came from.
//
// Prototype only. In production these come from Cloud (household + profiles).
//
// Legacy repos (transportRepo, calendarRepo) still carry their own member
// tables with ids `m1..m4`; `ALIAS_TO_CANONICAL` maps those to the canonical
// ids so cross-module resolution keeps working without touching transport UI.

import type { Role, TodayMember } from "@/domain/today";

export const CANONICAL_MEMBERS: ReadonlyArray<TodayMember> = [
  { id: "m_owner", name: "דנה לוי", role: "owner", color: "#7BA7C7", initials: "דל" },
  { id: "m_adult", name: "יואב לוי", role: "adult", color: "#C79A7B", initials: "יל" },
  { id: "m_child1", name: "נועה", role: "child", color: "#8CB48C", initials: "נו" },
  { id: "m_child2", name: "איתי", role: "child", color: "#C77B9E", initials: "אי" },
  { id: "m_guest", name: "מירי (מטפלת)", role: "guest", color: "#B49B7B", initials: "מי" },
];

/** Alias table so ids used by legacy repos map to canonical members. */
const ALIAS_TO_CANONICAL: Readonly<Record<string, string>> = {
  m1: "m_owner",
  m2: "m_adult",
  m3: "m_child1",
  m4: "m_child2",
};

export const DEMO_VIEWER_ID = "m_owner";
export const DEMO_CHILD_VIEWER_ID = "m_child1";

/** Map any repo-native member id to the canonical id used by composed views. */
export function canonicalMemberId(id: string | null | undefined): string | null {
  if (!id) return null;
  return ALIAS_TO_CANONICAL[id] ?? id;
}

export function findMember(id: string | null | undefined): TodayMember | null {
  const cid = canonicalMemberId(id);
  if (!cid) return null;
  return CANONICAL_MEMBERS.find((m) => m.id === cid) ?? null;
}

export function roleOf(id: string | null | undefined): Role {
  return findMember(id)?.role ?? "owner";
}
