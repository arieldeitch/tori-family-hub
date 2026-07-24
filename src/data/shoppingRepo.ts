// In-memory shopping repo. Prototype only — no persistence, no server.
// UI/features import the *service* (src/application/shoppingService.ts),
// not this repo directly. Tests may use it to seed state.

import type { ShoppingItem, ShoppingList } from "@/domain/shopping";

interface State {
  lists: ShoppingList[];
  items: ShoppingItem[];
  // Toggle used by tests to force the next mutation into a failed sync state.
  simulateFailure: boolean;
}

let state: State = seed();
const listeners = new Set<() => void>();

function emit() {
  state = { ...state, lists: [...state.lists], items: [...state.items] };
  for (const l of listeners) l();
}

export const shoppingRepo = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): State {
    return state;
  },
  reset(next: Partial<State> = {}) {
    state = { ...seed(), ...next };
    emit();
  },
  setSimulateFailure(v: boolean) {
    state = { ...state, simulateFailure: v };
    emit();
  },
  addList(list: ShoppingList) {
    state = { ...state, lists: [list, ...state.lists] };
    emit();
  },
  replaceItems(items: ShoppingItem[]) {
    state = { ...state, items };
    emit();
  },
};

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function seed(): State {
  const now = new Date().toISOString();
  const lists: ShoppingList[] = [
    { id: "list_home", name: "רשימת הבית", createdAt: now },
    { id: "list_pharma", name: "בית מרקחת", createdAt: now },
  ];
  const items: ShoppingItem[] = [
    {
      id: "it_1",
      listId: "list_home",
      name: "חלב 3%",
      normalizedName: "חלב 3",
      quantity: 2,
      unit: "ליטר",
      category: "מוצרי חלב",
      requestedByMemberId: "seed",
      urgency: "normal",
      allowSubstitute: true,
      status: "needed",
      createdAt: now,
      updatedAt: now,
      syncStatus: "synced",
    },
    {
      id: "it_2",
      listId: "list_home",
      name: "לחם פרוס",
      normalizedName: "לחם פרוס",
      quantity: 1,
      category: "מאפים",
      requestedByMemberId: "seed",
      urgency: "high",
      allowSubstitute: false,
      status: "needed",
      createdAt: now,
      updatedAt: now,
      syncStatus: "synced",
    },
    {
      id: "it_3",
      listId: "list_home",
      name: "בננות",
      normalizedName: "ננ",
      quantity: 6,
      unit: "יח׳",
      category: "פירות",
      requestedByMemberId: "seed",
      assignedBuyerMemberId: "seed",
      urgency: "low",
      allowSubstitute: true,
      status: "claimed",
      createdAt: now,
      updatedAt: now,
      syncStatus: "synced",
    },
  ];
  return { lists, items, simulateFailure: false };
}
