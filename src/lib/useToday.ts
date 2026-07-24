import { useSyncExternalStore } from "react";
import { todayRepo } from "@/data/todayRepo";

export function useToday() {
  return useSyncExternalStore(todayRepo.subscribe, todayRepo.getSnapshot, todayRepo.getSnapshot);
}
