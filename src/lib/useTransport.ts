import { useSyncExternalStore } from "react";
import { transportRepo } from "@/data/transportRepo";

export function useTransport() {
  return useSyncExternalStore(
    transportRepo.subscribe,
    transportRepo.getSnapshot,
    transportRepo.getSnapshot,
  );
}
