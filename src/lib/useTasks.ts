import { useSyncExternalStore } from "react";
import * as tasksRepo from "@/data/tasksRepo";

export function useTasks() {
  return useSyncExternalStore(tasksRepo.subscribe, tasksRepo.getAll, tasksRepo.getAll);
}

export function useTask(id: string) {
  return useSyncExternalStore(
    tasksRepo.subscribe,
    () => tasksRepo.getById(id),
    () => tasksRepo.getById(id),
  );
}
