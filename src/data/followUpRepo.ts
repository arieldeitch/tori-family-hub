// In-memory repo for follow-up cases. Prototype only — no persistence,
// no server, no RLS. Real security will be enforced server-side later.

import {
  clearFutureRemindersIfTerminal,
  type FollowUpAction,
  type FollowUpCase,
} from "@/domain/followUp";

type Listener = () => void;

let cases: FollowUpCase[] = seed();
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAll(): ReadonlyArray<FollowUpCase> {
  return cases;
}

export function getById(id: string): FollowUpCase | undefined {
  return cases.find((c) => c.id === id);
}

export function create(
  input: Omit<FollowUpCase, "id" | "actions" | "openedAt" | "lastActionAt"> & {
    openedAt?: string;
  },
): FollowUpCase {
  const now = new Date().toISOString();
  const created: FollowUpCase = {
    ...input,
    id: `case_${Math.random().toString(36).slice(2, 9)}`,
    openedAt: input.openedAt ?? now,
    lastActionAt: now,
    actions: [
      {
        id: `a_${Math.random().toString(36).slice(2, 9)}`,
        kind: "created",
        description: "המעקב נפתח",
        at: now,
        byMemberId: input.responsibleMemberId,
        nextFollowUpAt: input.nextFollowUpAt,
      },
    ],
  };
  cases = [created, ...cases];
  emit();
  return created;
}

export function update(
  id: string,
  patch: Partial<Omit<FollowUpCase, "id" | "actions">>,
): FollowUpCase | undefined {
  const idx = cases.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  const current = cases[idx]!;
  const merged: FollowUpCase = { ...current, ...patch };
  const now = new Date().toISOString();
  const final = clearFutureRemindersIfTerminal(merged, now);
  cases = [...cases.slice(0, idx), final, ...cases.slice(idx + 1)];
  emit();
  return final;
}

export function addAction(
  id: string,
  action: Omit<FollowUpAction, "id" | "at"> & { at?: string },
): FollowUpCase | undefined {
  const idx = cases.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  const current = cases[idx]!;
  const at = action.at ?? new Date().toISOString();
  const newAction: FollowUpAction = {
    ...action,
    id: `a_${Math.random().toString(36).slice(2, 9)}`,
    at,
  };
  const updated: FollowUpCase = {
    ...current,
    actions: [newAction, ...current.actions],
    lastActionAt: at,
    nextFollowUpAt: newAction.nextFollowUpAt ?? current.nextFollowUpAt,
  };
  const final = clearFutureRemindersIfTerminal(updated, at);
  cases = [...cases.slice(0, idx), final, ...cases.slice(idx + 1)];
  emit();
  return final;
}

export function remove(id: string): void {
  cases = cases.filter((c) => c.id !== id);
  emit();
}

export function resetToSeed(): void {
  cases = seed();
  emit();
}

// -------- Seed fixtures (household / adults_only / restricted) --------

function seed(): FollowUpCase[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const iso = (offsetDays: number) => new Date(now + offsetDays * day).toISOString();

  return [
    {
      id: "case_bank_refund",
      title: "החזר עמלה מהבנק",
      responsibleMemberId: "m_owner",
      externalParty: "בנק דיסקונט",
      ballHolder: "external",
      status: "waiting_external",
      openedAt: iso(-14),
      lastActionAt: iso(-3),
      nextFollowUpAt: iso(-1), // due
      targetDate: iso(30),
      possibleAmount: 320,
      sensitivity: "household",
      actions: [
        {
          id: "a1",
          kind: "created",
          description: "פתחתי בקשה בסניף",
          at: iso(-14),
          byMemberId: "m_owner",
        },
        {
          id: "a2",
          kind: "called",
          description: "שיחה עם נציג — הבטיחו לבדוק תוך שבוע",
          at: iso(-3),
          byMemberId: "m_owner",
          nextFollowUpAt: iso(-1),
        },
      ],
    },
    {
      id: "case_insurance",
      title: "תביעת ביטוח דירה — נזילה",
      responsibleMemberId: "m_adult",
      externalParty: "הראל ביטוח",
      ballHolder: "us",
      status: "action_required",
      openedAt: iso(-5),
      lastActionAt: iso(-2),
      nextFollowUpAt: iso(2),
      targetDate: iso(45),
      possibleAmount: 4500,
      sensitivity: "adults_only",
      actions: [
        {
          id: "a1",
          kind: "created",
          description: "פתחתי תיק אונליין",
          at: iso(-5),
          byMemberId: "m_adult",
        },
        {
          id: "a2",
          kind: "message_sent",
          description: "שלחתי צילומים ומייל של השמאי",
          at: iso(-2),
          byMemberId: "m_adult",
          nextFollowUpAt: iso(2),
        },
      ],
    },
    {
      id: "case_lawyer",
      title: "התייעצות עם עו״ד — נושא פרטי",
      responsibleMemberId: "m_owner",
      externalParty: 'עו"ד כהן',
      ballHolder: "external",
      status: "waiting_external",
      openedAt: iso(-30),
      lastActionAt: iso(-7),
      followUpDisabledReason: "ממתין להחלטה משפחתית לפני המשך",
      sensitivity: "restricted",
      restrictedToMemberIds: ["m_owner"],
      actions: [
        {
          id: "a1",
          kind: "meeting",
          description: "פגישת ייעוץ ראשונה",
          at: iso(-30),
          byMemberId: "m_owner",
        },
        {
          id: "a2",
          kind: "reminder_disabled",
          description: "כרגע אין לעקוב — נחכה להחלטה",
          at: iso(-7),
          byMemberId: "m_owner",
        },
      ],
    },
    {
      id: "case_municipality",
      title: "אישור עירייה על הנחת ארנונה",
      responsibleMemberId: "m_adult",
      externalParty: "עיריית תל אביב",
      ballHolder: "shared",
      status: "more_info_required",
      openedAt: iso(-10),
      lastActionAt: iso(-1),
      nextFollowUpAt: iso(5),
      sensitivity: "household",
      actions: [
        {
          id: "a1",
          kind: "emailed",
          description: "שלחתי את הטפסים",
          at: iso(-10),
          byMemberId: "m_adult",
        },
        {
          id: "a2",
          kind: "response_received",
          description: "ביקשו אישור הכנסה נוסף",
          at: iso(-1),
          byMemberId: "m_adult",
          nextFollowUpAt: iso(5),
        },
      ],
    },
    {
      id: "case_plumber",
      title: "אחריות על ברז מטבח",
      responsibleMemberId: "m_owner",
      externalParty: "חמת יבוא",
      ballHolder: "external",
      status: "response_received",
      openedAt: iso(-4),
      lastActionAt: iso(0),
      nextFollowUpAt: iso(7),
      sensitivity: "household",
      actions: [
        {
          id: "a1",
          kind: "called",
          description: "פניתי לשירות לקוחות",
          at: iso(-4),
          byMemberId: "m_owner",
        },
        {
          id: "a2",
          kind: "response_received",
          description: "טכנאי אמור להתקשר לתאם ביקור",
          at: iso(0),
          byMemberId: "m_owner",
          nextFollowUpAt: iso(7),
        },
      ],
    },
  ];
}
