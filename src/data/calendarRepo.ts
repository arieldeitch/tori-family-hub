// Typed in-memory repository for calendar events. Fixtures are generated
// relative to "now" so demo data always lands inside the current week.
// UI must NOT read fixtures directly; go through this repo.

import { addDays, getWeekStart, type CalendarEvent } from "@/domain/calendar";

export type CalendarViewState =
  | "normal"
  | "empty"
  | "loading"
  | "error"
  | "permission_denied";

interface State {
  view: CalendarViewState;
  events: CalendarEvent[];
}

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function iso(base: Date, dayOffset: number, hour: number, min = 0): string {
  const d = addDays(base, dayOffset);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

function buildNormal(): CalendarEvent[] {
  const ws = getWeekStart(new Date());
  return [
    {
      id: "ev1",
      title: "חוג ציור — נועה",
      startISO: iso(ws, 0, 16, 30),
      endISO: iso(ws, 0, 17, 30),
      ownerMemberId: "m3",
      childMemberId: "m3",
      location: "מתנ״ס שכונתי",
      needsTransport: true,
    },
    {
      id: "ev2",
      title: "פגישת הורים — איתי",
      startISO: iso(ws, 1, 18, 0),
      endISO: iso(ws, 1, 19, 0),
      ownerMemberId: "m2",
      childMemberId: "m4",
      location: "בית הספר",
    },
    {
      id: "ev3",
      title: "רופא משפחה",
      startISO: iso(ws, 2, 9, 15),
      endISO: iso(ws, 2, 10, 0),
      ownerMemberId: "m1",
      location: "מרפאה",
      adultsOnly: true,
      note: "רגיש — לא להצגה לילד",
    },
    {
      id: "ev4",
      title: "אימון כדורגל — איתי",
      startISO: iso(ws, 3, 17, 0),
      endISO: iso(ws, 3, 18, 30),
      ownerMemberId: "m4",
      childMemberId: "m4",
      location: "מגרש שכונתי",
      needsTransport: true,
    },
    {
      id: "ev5",
      title: "ארוחת שישי משפחתית",
      startISO: iso(ws, 5, 19, 30),
      endISO: iso(ws, 5, 22, 0),
      ownerMemberId: "m1",
      location: "בית",
    },
    {
      id: "ev6",
      title: "יום הולדת — נועה",
      startISO: iso(ws, 6, 11, 0),
      endISO: iso(ws, 6, 13, 0),
      ownerMemberId: "m3",
      childMemberId: "m3",
      location: "פארק",
    },
  ];
}

let state: State = { view: "normal", events: buildNormal() };

function eventsFor(view: CalendarViewState): CalendarEvent[] {
  switch (view) {
    case "empty":
    case "loading":
    case "error":
    case "permission_denied":
      return [];
    case "normal":
    default:
      return buildNormal();
  }
}

export const calendarRepo = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): State {
    return state;
  },
  setView(view: CalendarViewState): void {
    state = { view, events: eventsFor(view) };
    emit();
  },
};
