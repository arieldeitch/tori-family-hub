import { useSyncExternalStore } from "react";
import * as shiftsRepo from "@/data/shiftsRepo";

export function useShiftRules() {
  return useSyncExternalStore(shiftsRepo.subscribe, shiftsRepo.getRules, shiftsRepo.getRules);
}
export function useShiftRule(id: string) {
  return useSyncExternalStore(
    shiftsRepo.subscribe,
    () => shiftsRepo.getRule(id),
    () => shiftsRepo.getRule(id),
  );
}
export function useShiftHistory(ruleId: string) {
  return useSyncExternalStore(
    shiftsRepo.subscribe,
    () => shiftsRepo.getHistory(ruleId),
    () => shiftsRepo.getHistory(ruleId),
  );
}
export function useShiftAvailability() {
  return useSyncExternalStore(
    shiftsRepo.subscribe,
    shiftsRepo.getAvailability,
    shiftsRepo.getAvailability,
  );
}
