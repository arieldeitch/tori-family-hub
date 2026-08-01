// The selected perspective profile, resolved against what RLS actually returned.
//
// Extracted from PilotLandingScreen so the weekly chores module can use the same
// logic when mounted inside the application shell.
//
// The cached id is UNTRUSTED input: it is only ever resolved against the profiles
// the server returned, so a stale or hand-edited cache falls back safely instead
// of widening visibility. Selection is display and attribution only — authority
// always comes from the authenticated adult's membership (ADR-035).
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  readCachedPerspectiveId,
  resolveSelectedPerspectiveProfile,
  writeCachedPerspectiveId,
  type PerspectiveProfile,
} from "./perspective";

export interface PerspectiveProfileState {
  selectedPerspectiveProfile: PerspectiveProfile | null;
  selectPerspective: (profile: PerspectiveProfile) => void;
}

export function usePerspectiveProfile(
  profiles: ReadonlyArray<PerspectiveProfile>,
  storage?: Pick<Storage, "getItem" | "setItem">,
): PerspectiveProfileState {
  const resolvedStorage = useMemo<Pick<Storage, "getItem" | "setItem"> | null>(() => {
    if (storage) return storage;
    return typeof window === "undefined" ? null : window.localStorage;
  }, [storage]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedPerspectiveProfile = useMemo(
    () =>
      resolveSelectedPerspectiveProfile({
        profiles,
        cachedProfileId:
          selectedId ?? (resolvedStorage ? readCachedPerspectiveId(resolvedStorage) : null),
      }),
    [profiles, selectedId, resolvedStorage],
  );

  useEffect(() => {
    if (selectedPerspectiveProfile && resolvedStorage) {
      writeCachedPerspectiveId(resolvedStorage, selectedPerspectiveProfile.id);
    }
  }, [selectedPerspectiveProfile, resolvedStorage]);

  const selectPerspective = useCallback((profile: PerspectiveProfile) => {
    setSelectedId(profile.id);
  }, []);

  return { selectedPerspectiveProfile, selectPerspective };
}
