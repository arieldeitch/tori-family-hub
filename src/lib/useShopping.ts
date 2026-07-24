import { useSyncExternalStore } from "react";
import { shoppingRepo } from "@/data/shoppingRepo";

export function useShopping() {
  return useSyncExternalStore(
    shoppingRepo.subscribe,
    shoppingRepo.getSnapshot,
    shoppingRepo.getSnapshot,
  );
}
