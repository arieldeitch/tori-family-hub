// Pure domain: household, members, roles. No React, no I/O.
//
// NOTE (security): all role-based visibility here is UX-only. Real permission
// enforcement MUST happen on the server (Supabase RLS + edge functions) once
// backend is wired. Never rely on the client to hide sensitive data in
// production.

export type Role = "owner" | "adult" | "child" | "guest";

export type MemberStatus = "active" | "invited" | "limited";

export interface Member {
  id: string;
  name: string;
  role: Role;
  color: string; // hex, deterministic per member
  initials: string;
  status: MemberStatus;
  hasLogin: boolean;
  // Child-specific (all optional)
  birthDate?: string; // ISO date
  pinEnabled?: boolean; // capability flag ONLY — no PIN value stored
  // Guest/carer-specific
  accessWindow?: { start: string; end: string };
  restrictedToChildIds?: string[];
}

export interface Household {
  id: string;
  name: string;
  timezone: string;
  locale: string;
  createdAt: string;
}

const PALETTE = [
  "#7BA7C7", // calm blue
  "#C79A7B", // warm sand
  "#8CB48C", // sage
  "#C77B9E", // dusty rose
  "#B49B7B", // taupe
  "#9E8CC7", // muted lavender
  "#C7B47B", // ochre
];

export function pickColor(existing: ReadonlyArray<string>): string {
  for (const c of PALETTE) if (!existing.includes(c)) return c;
  return PALETTE[existing.length % PALETTE.length]!;
}

export function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2);
  return (parts[0]![0] ?? "") + (parts[1]![0] ?? "");
}

// UX-only visibility rule: a child must never see items flagged adultsOnly.
// The real check must exist server-side; this helper is a convenience for
// filtering fixtures in the demo.
export interface RoleVisibleItem {
  adultsOnly?: boolean;
}

export function canRoleSee(role: Role, item: RoleVisibleItem): boolean {
  if (item.adultsOnly && role === "child") return false;
  return true;
}

export function isPrivilegedRole(role: Role): boolean {
  return role === "owner" || role === "adult";
}
