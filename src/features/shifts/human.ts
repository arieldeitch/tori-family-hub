// UI-facing string helpers for the shifts engine. Formatting only — no
// selection logic. All decisions come from the engine's ReasonCode; this
// module maps them to Hebrew, non-judgmental phrases.

import type { EngineResult, ReasonCode } from "@/domain/shifts";

export interface Named {
  id: string;
  name: string;
}

const nameOf = (members: ReadonlyArray<Named>, id: string | null): string => {
  if (!id) return "—";
  return members.find((m) => m.id === id)?.name ?? id;
};

export interface HumanLine {
  headline: string; // e.g. "הוקצה לנועה"
  reason: string; // e.g. "כי היא הבאה בסבב."
}

export function humanFor(result: EngineResult, members: ReadonlyArray<Named>): HumanLine {
  const who = nameOf(members, result.selectedProfileId);
  switch (result.reasonCode as ReasonCode) {
    case "NEXT_IN_SEQUENCE":
      return { headline: `הוקצה ל${who}`, reason: `כי ${who} הבא בסבב.` };
    case "WEEKDAY_FIXED":
      return { headline: `הוקצה ל${who}`, reason: `כי ${who} משובץ קבוע ליום זה.` };
    case "PRIMARY_UNAVAILABLE":
      return {
        headline: `הוקצה ל${who}`,
        reason: `כי המשובץ המקורי אינו זמין, ${who} הבא בתור.`,
      };
    case "ONLY_ELIGIBLE_PARTICIPANT":
      return { headline: `הוקצה ל${who}`, reason: `כי ${who} היחיד שזמין.` };
    case "CONSECUTIVE_AVOIDED":
      return {
        headline: `הוקצה ל${who}`,
        reason: `כדי להימנע מרצף עם המשובץ הקודם.`,
      };
    case "NO_ELIGIBLE_PARTICIPANT":
      return { headline: "לא הוקצה", reason: "אין משתתף זמין למופע הזה." };
    case "MANUAL_ASSIGNMENT_REQUIRED":
      return { headline: "לא הוקצה", reason: "נדרש שיבוץ ידני." };
  }
}

export const WEEKDAY_LABEL: Record<number, string> = {
  0: "יום ראשון",
  1: "יום שני",
  2: "יום שלישי",
  3: "יום רביעי",
  4: "יום חמישי",
  5: "יום שישי",
  6: "שבת",
};

export const STRATEGY_LABEL: Record<string, string> = {
  fixed_sequence: "סבב קבוע",
  weekday_fixed: "משובץ לפי יום בשבוע",
  manual: "ידני",
};

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
  });
}
