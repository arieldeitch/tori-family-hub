import { beforeEach, describe, expect, it } from "vitest";
import { shoppingRepo } from "./shoppingRepo";
import {
  addItem,
  claimBuyer,
  createList,
  findDuplicates,
  markPurchased,
  markSynced,
  mergeInto,
} from "@/application/shoppingService";
import { ShoppingPermissionError } from "@/domain/shopping";

const adult = { role: "adult" as const };
const child = { role: "child" as const };
const guest = { role: "guest" as const };

beforeEach(() => {
  shoppingRepo.reset();
});

describe("shoppingService.addItem", () => {
  it("adds an item as pending-sync and reports no duplicates when unique", () => {
    const list = createList({ name: "מרכולית" }, adult);
    const { item, duplicates } = addItem(
      { listId: list.id, name: "אורז מלא", quantity: 1, requestedByMemberId: "m1" },
      adult,
    );
    expect(item.status).toBe("needed");
    expect(item.syncStatus).toBe("pending");
    expect(duplicates).toHaveLength(0);
  });

  it("does NOT auto-merge, but returns a duplicate suggestion", () => {
    const { item: first } = addItem(
      { listId: "list_home", name: "חלב 3%", quantity: 1, requestedByMemberId: "m1" },
      adult,
    );
    const { item: second, duplicates } = addItem(
      { listId: "list_home", name: "חלב 3%", quantity: 2, requestedByMemberId: "m2" },
      adult,
    );
    expect(second.id).not.toBe(first.id);
    // Both exist independently until the user chooses.
    const bothIds = shoppingRepo
      .getSnapshot()
      .items.filter((i) => i.listId === "list_home" && i.normalizedName === second.normalizedName)
      .map((i) => i.id)
      .sort();
    expect(bothIds).toContain(first.id);
    expect(bothIds).toContain(second.id);
    expect(duplicates.map((d) => d.id)).toContain(first.id);
  });

  it("findDuplicates spots open duplicates by normalized name", () => {
    addItem(
      { listId: "list_home", name: "תפוחים ירוקים", quantity: 3, requestedByMemberId: "m1" },
      adult,
    );
    expect(findDuplicates("list_home", "תפוח ירוק").length).toBeGreaterThan(0);
  });
});

describe("shoppingService.mergeInto (user-confirmed)", () => {
  it("sums quantities and removes the source", () => {
    const a = addItem(
      { listId: "list_home", name: "חלב 3%", quantity: 1, requestedByMemberId: "m1" },
      adult,
    ).item;
    const b = addItem(
      { listId: "list_home", name: "חלב 3%", quantity: 2, requestedByMemberId: "m2" },
      adult,
    ).item;
    const merged = mergeInto(a.id, b.id, adult);
    expect(merged.quantity).toBe(3);
    expect(merged.mergedFromItemIds).toContain(b.id);
    expect(shoppingRepo.getSnapshot().items.find((i) => i.id === b.id)).toBeUndefined();
  });

  it("add-anyway path just keeps both items (no service call needed)", () => {
    const a = addItem(
      { listId: "list_home", name: "חלב 3%", quantity: 1, requestedByMemberId: "m1" },
      adult,
    ).item;
    const b = addItem(
      { listId: "list_home", name: "חלב 3%", quantity: 2, requestedByMemberId: "m2" },
      adult,
    ).item;
    const open = shoppingRepo
      .getSnapshot()
      .items.filter(
        (i) => i.listId === "list_home" && i.normalizedName === a.normalizedName,
      );
    expect(open.map((i) => i.id).sort()).toEqual([a.id, b.id].sort());
  });
});

describe("shoppingService buyer + purchase flow", () => {
  it("claimBuyer sets assignee and status=claimed", () => {
    const { item } = addItem(
      { listId: "list_home", name: "יוגורט", quantity: 2, requestedByMemberId: "m1" },
      adult,
    );
    const claimed = claimBuyer(item.id, "m2", adult);
    expect(claimed.status).toBe("claimed");
    expect(claimed.assignedBuyerMemberId).toBe("m2");
  });

  it("markPurchased sets status, purchaser and purchase time", () => {
    const { item } = addItem(
      { listId: "list_home", name: "עגבניות", quantity: 5, requestedByMemberId: "m1" },
      adult,
    );
    const done = markPurchased(item.id, "m2", adult);
    expect(done.status).toBe("purchased");
    expect(done.purchasedByMemberId).toBe("m2");
    expect(done.purchasedAt).toBeTruthy();
  });
});

describe("shoppingService sync behavior", () => {
  it("failed sync leaves item in failed state until an explicit mark", () => {
    shoppingRepo.setSimulateFailure(true);
    const { item } = addItem(
      { listId: "list_home", name: "קמח", quantity: 1, requestedByMemberId: "m1" },
      adult,
    );
    expect(item.syncStatus).toBe("failed");
    // Turning failure off does NOT retroactively mark existing items as synced.
    shoppingRepo.setSimulateFailure(false);
    const still = shoppingRepo.getSnapshot().items.find((i) => i.id === item.id);
    expect(still?.syncStatus).toBe("failed");
    // Only an explicit event flips it.
    markSynced(item.id);
    const after = shoppingRepo.getSnapshot().items.find((i) => i.id === item.id);
    expect(after?.syncStatus).toBe("synced");
  });
});

describe("shoppingService role gating (UX-only)", () => {
  it("blocks child from adding items", () => {
    expect(() =>
      addItem(
        { listId: "list_home", name: "שוקולד", quantity: 1, requestedByMemberId: "m1" },
        child,
      ),
    ).toThrow(ShoppingPermissionError);
  });
  it("blocks guest from claiming a buyer", () => {
    const { item } = addItem(
      { listId: "list_home", name: "עוגיות", quantity: 1, requestedByMemberId: "m1" },
      adult,
    );
    expect(() => claimBuyer(item.id, "m2", guest)).toThrow(ShoppingPermissionError);
  });
});
