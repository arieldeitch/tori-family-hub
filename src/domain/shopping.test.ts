import { describe, it, expect } from "vitest";
import {
  normalizeName,
  findSimilarOpen,
  validateItemInput,
  mergeItems,
  canRoleAct,
  type ShoppingItem,
} from "./shopping";

function baseItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: "i1",
    listId: "l1",
    name: "חלב",
    normalizedName: normalizeName("חלב"),
    quantity: 1,
    requestedByMemberId: "m1",
    urgency: "normal",
    allowSubstitute: true,
    status: "needed",
    createdAt: "2026-07-24T08:00:00.000Z",
    updatedAt: "2026-07-24T08:00:00.000Z",
    syncStatus: "synced",
    ...overrides,
  };
}

describe("normalizeName", () => {
  it("lowercases, trims, and collapses whitespace", () => {
    expect(normalizeName("  Milk  ")).toBe("milk");
    expect(normalizeName("Milk\t Two")).toBe("milk two");
  });

  it("strips Hebrew niqqud", () => {
    expect(normalizeName("חָלָב")).toBe(normalizeName("חלב"));
  });

  it("removes common Hebrew plural suffixes on long-enough words", () => {
    expect(normalizeName("תפוחים")).toBe(normalizeName("תפוח"));
    expect(normalizeName("עגבניות")).toBe(normalizeName("עגבני"));
  });

  it("does not touch short words with the same suffix", () => {
    // 'ים' as a 2-letter word must not become ''
    expect(normalizeName("ים")).toBe("ים");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeName("")).toBe("");
  });
});

describe("findSimilarOpen", () => {
  it("finds an open item with the same normalized name in the same list", () => {
    const items = [baseItem({ id: "a", name: "חלב" })];
    const found = findSimilarOpen(items, "l1", normalizeName("חָלָב"));
    expect(found.map((i) => i.id)).toEqual(["a"]);
  });

  it("ignores purchased / removed / unavailable items", () => {
    const items = [
      baseItem({ id: "a", status: "purchased" }),
      baseItem({ id: "b", status: "removed" }),
      baseItem({ id: "c", status: "unavailable" }),
    ];
    expect(findSimilarOpen(items, "l1", normalizeName("חלב"))).toEqual([]);
  });

  it("ignores items in a different list", () => {
    const items = [baseItem({ id: "a", listId: "other" })];
    expect(findSimilarOpen(items, "l1", normalizeName("חלב"))).toEqual([]);
  });
});

describe("validateItemInput", () => {
  it("requires a name", () => {
    const errs = validateItemInput({ name: "   ", quantity: 1, requestedByMemberId: "m1" });
    expect(errs.some((e) => e.field === "name")).toBe(true);
  });
  it("requires a positive quantity", () => {
    const errs = validateItemInput({ name: "חלב", quantity: 0, requestedByMemberId: "m1" });
    expect(errs.some((e) => e.field === "quantity")).toBe(true);
  });
  it("requires a requester", () => {
    const errs = validateItemInput({ name: "חלב", quantity: 1, requestedByMemberId: "" });
    expect(errs.some((e) => e.field === "requestedByMemberId")).toBe(true);
  });
  it("passes valid input", () => {
    expect(validateItemInput({ name: "חלב", quantity: 2, requestedByMemberId: "m1" })).toEqual([]);
  });
});

describe("mergeItems", () => {
  it("sums quantities and records source id", () => {
    const a = baseItem({ id: "a", quantity: 2, urgency: "low" });
    const b = baseItem({ id: "b", quantity: 3, urgency: "high", note: "אורגני" });
    const merged = mergeItems(a, b, "2026-07-24T09:00:00.000Z");
    expect(merged.quantity).toBe(5);
    expect(merged.urgency).toBe("high");
    expect(merged.note).toBe("אורגני");
    expect(merged.mergedFromItemIds).toEqual(["b"]);
    expect(merged.updatedAt).toBe("2026-07-24T09:00:00.000Z");
  });

  it("refuses to merge across lists", () => {
    const a = baseItem({ id: "a", listId: "l1" });
    const b = baseItem({ id: "b", listId: "l2" });
    expect(() => mergeItems(a, b, "x")).toThrow();
  });
});

describe("canRoleAct", () => {
  it("allows owner and adult", () => {
    expect(canRoleAct("owner")).toBe(true);
    expect(canRoleAct("adult")).toBe(true);
  });
  it("denies child and guest", () => {
    expect(canRoleAct("child")).toBe(false);
    expect(canRoleAct("guest")).toBe(false);
  });
});
