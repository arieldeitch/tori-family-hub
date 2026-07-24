import { useSyncExternalStore } from "react";
import * as repo from "@/data/notificationsRepo";

export function useNotifications() {
  const state = useSyncExternalStore(repo.subscribe, repo.getState, repo.getState);
  return {
    all: repo.getAll(),
    loading: state.loading,
    error: state.error,
  };
}

export function usePreferences() {
  return useSyncExternalStore(repo.subscribe, repo.getPreferences, repo.getPreferences);
}
