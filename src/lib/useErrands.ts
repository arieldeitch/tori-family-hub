import { useSyncExternalStore } from "react";
import * as errandsRepo from "@/data/errandsRepo";

export function useErrands() {
  return useSyncExternalStore(errandsRepo.subscribe, errandsRepo.getAll, errandsRepo.getAll);
}

export function useErrand(id: string) {
  return useSyncExternalStore(
    errandsRepo.subscribe,
    () => errandsRepo.getById(id),
    () => errandsRepo.getById(id),
  );
}
