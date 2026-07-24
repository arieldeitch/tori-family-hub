import { useSyncExternalStore } from "react";
import { calendarRepo } from "@/data/calendarRepo";

export function useCalendar() {
  return useSyncExternalStore(
    calendarRepo.subscribe,
    calendarRepo.getSnapshot,
    calendarRepo.getSnapshot,
  );
}
