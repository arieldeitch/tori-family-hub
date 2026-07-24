// Pure domain: calendar events. No React, no I/O, no timezone libraries.
// All dates are local (browser) time. Week starts on Sunday (Israel).
//
// Visibility helpers are UX-only — real enforcement belongs on the server.

import { canRoleSee, type Role } from "@/domain/household";

export interface CalendarEvent {
  id: string;
  title: string;
  startISO: string; // local wall-clock ISO
  endISO: string;
  ownerMemberId: string; // family member owning the color
  childMemberId?: string; // linked child, if any
  location?: string;
  needsTransport?: boolean;
  adultsOnly?: boolean;
  note?: string;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

// Sunday-start week. Returns midnight of the week's Sunday, local time.
export function getWeekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay()); // getDay: 0 (Sun) .. 6 (Sat)
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export interface DayBucket {
  date: Date;
  events: CalendarEvent[];
}

export function groupByDay(
  events: ReadonlyArray<CalendarEvent>,
  weekStart: Date,
): DayBucket[] {
  const days = weekDays(weekStart);
  return days.map((date) => ({
    date,
    events: events
      .filter((e) => isSameDay(new Date(e.startISO), date))
      .slice()
      .sort((a, b) => a.startISO.localeCompare(b.startISO)),
  }));
}

export function visibleForRole(
  events: ReadonlyArray<CalendarEvent>,
  role: Role,
): CalendarEvent[] {
  return events.filter((e) => canRoleSee(role, e));
}
