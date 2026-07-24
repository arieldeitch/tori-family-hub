import { describe, expect, it } from "vitest";
import {
  addDays,
  getWeekStart,
  groupByDay,
  isSameDay,
  visibleForRole,
  weekDays,
  type CalendarEvent,
} from "./calendar";

const at = (y: number, m: number, d: number, h = 9): string =>
  new Date(y, m - 1, d, h, 0, 0).toISOString();

const ev = (over: Partial<CalendarEvent>): CalendarEvent => ({
  id: over.id ?? "e",
  title: over.title ?? "אירוע",
  startISO: over.startISO ?? at(2026, 1, 5, 9),
  endISO: over.endISO ?? at(2026, 1, 5, 10),
  ownerMemberId: over.ownerMemberId ?? "m1",
  ...over,
});

describe("calendar domain", () => {
  it("week starts on Sunday", () => {
    // 2026-01-07 is a Wednesday
    const ws = getWeekStart(new Date(2026, 0, 7));
    expect(ws.getDay()).toBe(0);
    expect(ws.getDate()).toBe(4);
  });

  it("weekDays returns 7 consecutive days", () => {
    const ws = getWeekStart(new Date(2026, 0, 7));
    const days = weekDays(ws);
    expect(days).toHaveLength(7);
    expect(isSameDay(days[6]!, addDays(ws, 6))).toBe(true);
  });

  it("groups events by day sorted by start time", () => {
    const ws = getWeekStart(new Date(2026, 0, 7));
    const events: CalendarEvent[] = [
      ev({ id: "b", startISO: at(2026, 1, 5, 15) }),
      ev({ id: "a", startISO: at(2026, 1, 5, 8) }),
      ev({ id: "c", startISO: at(2026, 1, 6, 10) }),
    ];
    const buckets = groupByDay(events, ws);
    expect(buckets[1]!.events.map((e) => e.id)).toEqual(["a", "b"]);
    expect(buckets[2]!.events.map((e) => e.id)).toEqual(["c"]);
    expect(buckets[0]!.events).toEqual([]);
  });

  it("hides adults-only events from a child", () => {
    const events: CalendarEvent[] = [ev({ id: "1" }), ev({ id: "2", adultsOnly: true })];
    expect(visibleForRole(events, "child").map((e) => e.id)).toEqual(["1"]);
    expect(visibleForRole(events, "adult").map((e) => e.id)).toEqual(["1", "2"]);
  });
});
