// Pure domain for shopping lists. No React, no I/O.
// Duplicate handling is intentionally NOT automatic: the domain only
// *finds* similar items — the UI must present a suggestion so the user
// chooses to merge or add anyway.

export type ShoppingItemStatus = "needed" | "claimed" | "purchased" | "unavailable" | "removed";

export type ShoppingUrgency = "low" | "normal" | "high";

// UX-only role gating: real enforcement will live on the server.
export type Role = "owner" | "adult" | "child" | "guest";

export type SyncStatus = "pending" | "synced" | "failed";

export interface ShoppingItem {
  id: string;
  listId: string;
  name: string;
  normalizedName: string;
  quantity: number;
  unit?: string;
  category?: string;
  preferredStore?: string;
  requestedByMemberId: string;
  assignedBuyerMemberId?: string;
  urgency: ShoppingUrgency;
  estimatedPrice?: number;
  allowSubstitute: boolean;
  note?: string;
  status: ShoppingItemStatus;
  createdAt: string;
  updatedAt: string;
  purchasedAt?: string;
  purchasedByMemberId?: string;
  // Offline demo only. Never set to "synced" without an explicit event.
  syncStatus: SyncStatus;
  mergedFromItemIds?: string[];
}

export interface ShoppingList {
  id: string;
  name: string;
  archivedAt?: string;
  createdAt: string;
}

// -------- Normalization (simple + transparent) --------

// Deliberately naive: lowercase, strip Hebrew niqqud, collapse whitespace,
// drop trailing punctuation, remove a common Hebrew plural suffix (ים / ות).
// Users can inspect what happened; nothing "smart" hides behind it.
export function normalizeName(raw: string): string {
  if (!raw) return "";
  let s = raw.toLocaleLowerCase("he");
  // strip Hebrew niqqud (U+0591..U+05C7)
  s = s.replace(/[\u0591-\u05C7]/g, "");
  // punctuation / stray symbols
  s = s.replace(/[.,!?()"'׳״\-_/\\]+/g, " ");
  // collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  // remove very common Hebrew plural suffix on a *whole word* if length allows
  s = s
    .split(" ")
    .map((w) => (w.length >= 4 && (w.endsWith("ים") || w.endsWith("ות")) ? w.slice(0, -2) : w))
    .join(" ");
  return s;
}

// -------- Duplicate detection (no auto-merge) --------

const OPEN: ReadonlySet<ShoppingItemStatus> = new Set(["needed", "claimed"]);

export function isOpen(status: ShoppingItemStatus): boolean {
  return OPEN.has(status);
}

export function findSimilarOpen(
  items: ReadonlyArray<ShoppingItem>,
  listId: string,
  normalized: string,
): ShoppingItem[] {
  if (!normalized) return [];
  return items.filter(
    (i) => i.listId === listId && isOpen(i.status) && i.normalizedName === normalized,
  );
}

// -------- Validation --------

export interface ShoppingValidationError {
  field: "name" | "quantity" | "requestedByMemberId";
  message: string;
}

export function validateItemInput(input: {
  name: string;
  quantity: number;
  requestedByMemberId: string;
}): ShoppingValidationError[] {
  const errs: ShoppingValidationError[] = [];
  if (!input.name.trim()) errs.push({ field: "name", message: "יש להזין שם פריט" });
  if (!Number.isFinite(input.quantity) || input.quantity <= 0)
    errs.push({ field: "quantity", message: "כמות חייבת להיות מספר חיובי" });
  if (!input.requestedByMemberId)
    errs.push({ field: "requestedByMemberId", message: "יש לציין מבקש/ת" });
  return errs;
}

// -------- Merge (pure) --------

// Sums quantities, keeps the earliest createdAt, and preserves the target's
// urgency/note but records the merged-from ids for transparency. Never runs
// automatically; only called after explicit user confirmation.
export function mergeItems(
  target: ShoppingItem,
  source: ShoppingItem,
  nowIso: string,
): ShoppingItem {
  if (target.id === source.id) return target;
  if (target.listId !== source.listId) {
    throw new Error("Cannot merge items across different lists");
  }
  return {
    ...target,
    quantity: target.quantity + source.quantity,
    note:
      target.note && source.note && target.note !== source.note
        ? `${target.note} · ${source.note}`
        : (target.note ?? source.note),
    urgency:
      rankUrgency(target.urgency) >= rankUrgency(source.urgency) ? target.urgency : source.urgency,
    allowSubstitute: target.allowSubstitute && source.allowSubstitute,
    updatedAt: nowIso,
    mergedFromItemIds: [...(target.mergedFromItemIds ?? []), source.id],
  };
}

function rankUrgency(u: ShoppingUrgency): number {
  return u === "high" ? 2 : u === "normal" ? 1 : 0;
}

// -------- Role gating (UX-only) --------

// child and guest are read-only in this prototype: they cannot add,
// claim, purchase, or edit. The UI must hide the buttons AND the service
// must refuse — this domain function is the single source of truth.
export function canRoleAct(role: Role): boolean {
  return role === "owner" || role === "adult";
}

export class ShoppingPermissionError extends Error {
  constructor(role: Role) {
    super(`Role "${role}" cannot modify shopping items in this prototype`);
    this.name = "ShoppingPermissionError";
  }
}

export class ShoppingValidationFailedError extends Error {
  readonly errors: ReadonlyArray<ShoppingValidationError>;
  constructor(errors: ReadonlyArray<ShoppingValidationError>) {
    super(errors.map((e) => e.message).join("; ") || "Shopping validation failed");
    this.name = "ShoppingValidationFailedError";
    this.errors = errors;
  }
}
