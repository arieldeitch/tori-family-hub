// Typed in-memory repo for child-mode task fixtures. UI must NOT import
// the fixtures array directly; go through this repo.
//
// SECURITY: adultsOnly filtering by consumers is UX-only. Real permission
// enforcement must live server-side (RLS + edge functions) once backend
// is wired.

import type { RoleVisibleItem } from "@/domain/household";

export interface ChildTask extends RoleVisibleItem {
  id: string;
  title: string;
  childId?: string;
  requiresApproval?: boolean;
}

const DEMO_TASKS: ReadonlyArray<ChildTask> = [
  { id: "t1", title: "לסדר את התיק לבית הספר" },
  { id: "t2", title: "לצחצח שיניים אחרי ארוחת ערב" },
  { id: "t3", title: "לתלות מגבת רטובה" },
  // adultsOnly item — child view MUST filter it out (UX-only guard).
  { id: "t4", title: "לאשר תשלום חוגים", adultsOnly: true },
  { id: "t5", title: "לבחור ספר לפני השינה", requiresApproval: true },
];

export const childTasksRepo = {
  getAll(): ReadonlyArray<ChildTask> {
    return DEMO_TASKS;
  },
};
