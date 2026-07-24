// Application service for shopping. The ONLY place UI is allowed to import
// to mutate shopping state. Enforces:
//   - domain validation (validateItemInput)
//   - role gating (canRoleAct) — UX-only, real enforcement lives on server
//   - offline "pending sync" bookkeeping (never flips to "synced" implicitly)
// Duplicate detection is exposed as a *query*, never as an auto-merge.

import {
  canRoleAct,
  findSimilarOpen,
  mergeItems,
  normalizeName,
  ShoppingPermissionError,
  ShoppingValidationFailedError,
  validateItemInput,
  type Role,
  type ShoppingItem,
  type ShoppingItemStatus,
  type ShoppingList,
  type ShoppingUrgency,
} from "@/domain/shopping";
import { newId, shoppingRepo } from "@/data/shoppingRepo";

export interface AddItemInput {
  listId: string;
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  preferredStore?: string;
  requestedByMemberId: string;
  urgency?: ShoppingUrgency;
  estimatedPrice?: number;
  allowSubstitute?: boolean;
  note?: string;
}

export interface AddItemResult {
  item: ShoppingItem;
  // Populated when an open item with the same normalized name already exists.
  // The UI must show a suggestion and let the user choose Merge / Add anyway.
  duplicates: ShoppingItem[];
}

function assertCanAct(role: Role): void {
  if (!canRoleAct(role)) throw new ShoppingPermissionError(role);
}

function nowIso(): string {
  return new Date().toISOString();
}

// ---------- Queries ----------

export function listLists(): ReadonlyArray<ShoppingList> {
  return shoppingRepo.getSnapshot().lists;
}

export function getList(id: string): ShoppingList | undefined {
  return shoppingRepo.getSnapshot().lists.find((l) => l.id === id);
}

export function listItems(listId: string): ReadonlyArray<ShoppingItem> {
  return shoppingRepo.getSnapshot().items.filter((i) => i.listId === listId);
}

export function findDuplicates(listId: string, name: string): ShoppingItem[] {
  return findSimilarOpen(shoppingRepo.getSnapshot().items, listId, normalizeName(name));
}

// ---------- Commands ----------

export function createList(input: { name: string }, actor: { role: Role }): ShoppingList {
  assertCanAct(actor.role);
  const name = input.name.trim();
  if (!name) throw new Error("שם הרשימה חסר");
  const list: ShoppingList = { id: newId("list"), name, createdAt: nowIso() };
  shoppingRepo.addList(list);
  return list;
}

// Adds an item. Does NOT auto-merge; returns any duplicates the UI should
// show as a suggestion. The caller can then call `mergeInto` or ignore.
export function addItem(input: AddItemInput, actor: { role: Role }): AddItemResult {
  assertCanAct(actor.role);
  const errs = validateItemInput({
    name: input.name,
    quantity: input.quantity,
    requestedByMemberId: input.requestedByMemberId,
  });
  if (errs.length > 0) throw new ShoppingValidationFailedError(errs);

  const state = shoppingRepo.getSnapshot();
  const now = nowIso();
  const item: ShoppingItem = {
    id: newId("it"),
    listId: input.listId,
    name: input.name.trim(),
    normalizedName: normalizeName(input.name),
    quantity: input.quantity,
    unit: input.unit,
    category: input.category,
    preferredStore: input.preferredStore,
    requestedByMemberId: input.requestedByMemberId,
    urgency: input.urgency ?? "normal",
    estimatedPrice: input.estimatedPrice,
    allowSubstitute: input.allowSubstitute ?? true,
    note: input.note,
    status: "needed",
    createdAt: now,
    updatedAt: now,
    // Any mutation in offline-demo mode lands as pending. It becomes
    // "synced" only via markSynced() — never implicitly.
    syncStatus: state.simulateFailure ? "failed" : "pending",
  };
  shoppingRepo.replaceItems([item, ...state.items]);

  const duplicates = findSimilarOpen(state.items, input.listId, item.normalizedName);
  return { item, duplicates };
}

// Explicit user-confirmed merge. Adds source quantity into target, then
// removes the source. Never runs automatically.
export function mergeInto(targetId: string, sourceId: string, actor: { role: Role }): ShoppingItem {
  assertCanAct(actor.role);
  const state = shoppingRepo.getSnapshot();
  const target = state.items.find((i) => i.id === targetId);
  const source = state.items.find((i) => i.id === sourceId);
  if (!target || !source) throw new Error("פריט לא נמצא");
  const merged = mergeItems(target, source, nowIso());
  const next = state.items
    .filter((i) => i.id !== sourceId)
    .map((i) => (i.id === targetId ? { ...merged, syncStatus: nextSync(state) } : i));
  shoppingRepo.replaceItems(next);
  return merged;
}

export function updateItem(
  id: string,
  patch: Partial<Omit<ShoppingItem, "id" | "listId" | "createdAt" | "normalizedName">>,
  actor: { role: Role },
): ShoppingItem {
  assertCanAct(actor.role);
  const state = shoppingRepo.getSnapshot();
  const item = state.items.find((i) => i.id === id);
  if (!item) throw new Error("פריט לא נמצא");
  const nextName = patch.name ?? item.name;
  const updated: ShoppingItem = {
    ...item,
    ...patch,
    name: nextName,
    normalizedName: normalizeName(nextName),
    updatedAt: nowIso(),
    syncStatus: nextSync(state),
  };
  shoppingRepo.replaceItems(state.items.map((i) => (i.id === id ? updated : i)));
  return updated;
}

export function claimBuyer(id: string, memberId: string, actor: { role: Role }): ShoppingItem {
  return setStatus(id, "claimed", actor, { assignedBuyerMemberId: memberId });
}

export function releaseBuyer(id: string, actor: { role: Role }): ShoppingItem {
  return setStatus(id, "needed", actor, { assignedBuyerMemberId: undefined });
}

export function markPurchased(id: string, memberId: string, actor: { role: Role }): ShoppingItem {
  const now = nowIso();
  return setStatus(id, "purchased", actor, {
    purchasedByMemberId: memberId,
    purchasedAt: now,
  });
}

export function markUnavailable(id: string, actor: { role: Role }): ShoppingItem {
  return setStatus(id, "unavailable", actor);
}

export function removeItem(id: string, actor: { role: Role }): ShoppingItem {
  return setStatus(id, "removed", actor);
}

function setStatus(
  id: string,
  status: ShoppingItemStatus,
  actor: { role: Role },
  extra: Partial<ShoppingItem> = {},
): ShoppingItem {
  assertCanAct(actor.role);
  const state = shoppingRepo.getSnapshot();
  const item = state.items.find((i) => i.id === id);
  if (!item) throw new Error("פריט לא נמצא");
  const updated: ShoppingItem = {
    ...item,
    ...extra,
    status,
    updatedAt: nowIso(),
    syncStatus: nextSync(state),
  };
  shoppingRepo.replaceItems(state.items.map((i) => (i.id === id ? updated : i)));
  return updated;
}

// Explicit sync flip — the ONLY way an item becomes "synced".
export function markSynced(id: string): void {
  const state = shoppingRepo.getSnapshot();
  shoppingRepo.replaceItems(
    state.items.map((i) => (i.id === id ? { ...i, syncStatus: "synced" } : i)),
  );
}

function nextSync(state: { simulateFailure: boolean }) {
  return state.simulateFailure ? ("failed" as const) : ("pending" as const);
}
