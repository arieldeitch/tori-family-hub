import { useSyncExternalStore } from "react";
import { householdRepo } from "@/data/householdRepo";

export function useHousehold() {
  return useSyncExternalStore(
    householdRepo.subscribe,
    householdRepo.getSnapshot,
    householdRepo.getSnapshot,
  );
}
