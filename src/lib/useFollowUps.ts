import { useSyncExternalStore } from "react";
import * as repo from "@/data/followUpRepo";

export function useFollowUps() {
  return useSyncExternalStore(repo.subscribe, repo.getAll, repo.getAll);
}

export function useFollowUp(id: string) {
  const list = useFollowUps();
  return list.find((c) => c.id === id);
}
