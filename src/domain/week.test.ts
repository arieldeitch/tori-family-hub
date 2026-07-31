import { describe, expect, it } from "vitest";
import {
  addDays,
  fromDayKey,
  groupByWeekDay,
  isDayKey,
  isInWeekOf,
  startOfWeek,
  toDayKey,
  todayKey,
  weekDayKeys,
  weekRange,
  weekdayOf,
} from "./week";

describe("day keys", () => {
  it("formats and parses on the UTC calendar", () => {
    expect(toDayKey(new Date(Date.UTC(2026, 7, 3)))).toBe("2026-08-03");
    expect(fromDayKey("2026-08-03").getTime()).toBe(Date.UTC(2026, 7, 3));
  });

  it("zero-pads so keys compare lexicographically", () => {
    // Round-trips through a year below 100, where Date.UTC would otherwise map
    // 7 to 1907 and silently return the wrong century.
    expect(toDayKey(fromDayKey("0007-01-09"))).toBe("0007-01-09");
    expect("2026-01-09" < "2026-01-10").toBe(true);
  });

  it("validates shape", () => {
    expect(isDayKey("2026-08-03")).toBe(true);
    expect(isDayKey("03/08/2026")).toBe(false);
    expect(isDayKey("2026-8-3")).toBe(false);
  });
});

// The WP0 regression, restated for the weekly view: a chore "on Tuesday" must
// not drift to Monday or Wednesday because of where the phone is (ADR-006).
describe("timezone independence", () => {
  const ORIGINAL_TZ = process.env.TZ;
  const zones = ["UTC", "Asia/Jerusalem", "America/Los_Angeles", "Pacific/Kiritimati"];

  it("derives the same weekday for a given day key in every timezone", () => {
    for (const tz of zones) {
      process.env.TZ = tz;
      expect(weekdayOf("2026-08-03")).toBe(1); // a Monday
      expect(weekdayOf("2026-08-02")).toBe(0); // a Sunday
      expect(startOfWeek("2026-08-05")).toBe("2026-08-02");
    }
    process.env.TZ = ORIGINAL_TZ;
  });

  it("keeps the week boundary stable across an extreme positive offset", () => {
    process.env.TZ = "Pacific/Kiritimati"; // UTC+14
    expect(weekDayKeys("2026-08-05")[0]).toBe("2026-08-02");
    process.env.TZ = ORIGINAL_TZ;
  });
});

describe("the family week runs Sunday to Saturday", () => {
  it("starts on Sunday", () => {
    // 2026-08-02 is a Sunday; every day of that week resolves to it.
    for (const key of [
      "2026-08-02",
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
    ]) {
      expect(startOfWeek(key)).toBe("2026-08-02");
    }
  });

  it("a Sunday is its own week start", () => {
    expect(startOfWeek("2026-08-02")).toBe("2026-08-02");
  });

  it("returns seven consecutive days, Sunday first, Saturday last", () => {
    const days = weekDayKeys("2026-08-05");
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-08-02");
    expect(days[6]).toBe("2026-08-08");
    expect(weekdayOf(days[0]!)).toBe(0);
    expect(weekdayOf(days[6]!)).toBe(6);
  });

  it("bounds the query range to the same seven days", () => {
    expect(weekRange("2026-08-05")).toEqual({ from: "2026-08-02", to: "2026-08-08" });
  });

  it("crosses month and year boundaries correctly", () => {
    expect(weekDayKeys("2026-12-31")).toContain("2027-01-02");
    expect(startOfWeek("2027-01-01")).toBe("2026-12-27");
  });

  it("handles a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
  });

  it("knows whether a day is in a given week", () => {
    expect(isInWeekOf("2026-08-08", "2026-08-05")).toBe(true);
    expect(isInWeekOf("2026-08-09", "2026-08-05")).toBe(false);
    expect(isInWeekOf("2026-08-01", "2026-08-05")).toBe(false);
  });

  it("todayKey reads the supplied instant on the UTC calendar", () => {
    expect(todayKey(new Date(Date.UTC(2026, 7, 3, 23, 59)))).toBe("2026-08-03");
  });
});

describe("groupByWeekDay", () => {
  const items = [
    { id: "a", day: "2026-08-02" },
    { id: "b", day: "2026-08-05" },
    { id: "c", day: "2026-08-05" },
    { id: "d", day: "2026-08-08" },
  ];
  const get = (i: { day: string }) => i.day;

  it("always returns seven days, including the empty ones", () => {
    // A day with no chore is a designed empty state, not a row to omit.
    const week = groupByWeekDay(items, get, "2026-08-05");
    expect(week).toHaveLength(7);
    expect(week.map((d) => d.items.length)).toEqual([1, 0, 0, 2, 0, 0, 1]);
  });

  it("marks today", () => {
    const week = groupByWeekDay(items, get, "2026-08-05", "2026-08-05");
    expect(week.filter((d) => d.isToday)).toHaveLength(1);
    expect(week.find((d) => d.isToday)?.dayKey).toBe("2026-08-05");
  });

  it("marks no day as today when today is outside the shown week", () => {
    const week = groupByWeekDay(items, get, "2026-08-05", "2026-09-01");
    expect(week.some((d) => d.isToday)).toBe(false);
  });

  it("ignores items outside the week rather than folding them into a nearby day", () => {
    // Silently bucketing a stray date would misreport when a chore is due.
    const week = groupByWeekDay([...items, { id: "x", day: "2026-09-15" }], get, "2026-08-05");
    expect(week.reduce((n, d) => n + d.items.length, 0)).toBe(4);
  });

  it("preserves input order within a day", () => {
    const week = groupByWeekDay(items, get, "2026-08-05");
    expect(week[3]!.items.map((i) => i.id)).toEqual(["b", "c"]);
  });
});
