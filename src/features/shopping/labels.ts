import type { ShoppingItemStatus, ShoppingUrgency, SyncStatus } from "@/domain/shopping";

export const STATUS_LABEL: Record<ShoppingItemStatus, string> = {
  needed: "דרוש",
  claimed: "בקנייה",
  purchased: "נרכש",
  unavailable: "לא נמצא",
  removed: "הוסר",
};

export const URGENCY_LABEL: Record<ShoppingUrgency, string> = {
  low: "רגיל",
  normal: "רגיל",
  high: "דחוף",
};

export const SYNC_LABEL: Record<SyncStatus, string> = {
  pending: "ממתין לסנכרון",
  synced: "מסונכרן",
  failed: "סנכרון נכשל",
};
