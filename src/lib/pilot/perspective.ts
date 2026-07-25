// Family Pilot — perspective selection (WP5A). Pure logic, no React, no I/O.
//
// TWO DISTINCT CONCEPTS — never conflate them, and never name either
// `currentUser`:
//
//   authenticatedActor        WHO IS SIGNED IN. The Supabase Auth identity. It
//                             is the ONLY source of authority; the server
//                             re-derives it from auth.uid() on every request.
//
//   selectedPerspectiveProfile WHOSE WEEK IS BEING SHOWN. A display and
//                             attribution choice. It is NOT an authorization
//                             input, it is never trusted by the server, and
//                             changing it writes nothing to the database.
//
// The cached selection is a disposable UI preference. It is always validated
// against the profiles actually loaded for the authenticated household before
// use, so a stale or tampered cache can never widen what is displayed beyond
// what RLS already returned.

export interface PerspectiveProfile {
  id: string;
  displayName: string;
  isChild: boolean;
}

/** Disposable UI preference only. Never a source of truth (PRD §1). */
export const PERSPECTIVE_STORAGE_KEY = "tori.pilot.selectedPerspectiveProfileId";

export interface ResolvePerspectiveArgs {
  /** Profiles RLS actually returned for the authenticated household. */
  profiles: ReadonlyArray<PerspectiveProfile>;
  /** Previously cached choice. Untrusted input. */
  cachedProfileId?: string | null;
}

/**
 * Choose which profile's perspective to display.
 *
 * A cached id is honoured only when it matches a currently loaded profile.
 * Otherwise it is discarded and the first adult profile wins (falling back to
 * the first profile of any kind), so the UI always lands somewhere valid rather
 * than rendering an empty or stale perspective.
 */
export function resolveSelectedPerspectiveProfile({
  profiles,
  cachedProfileId,
}: ResolvePerspectiveArgs): PerspectiveProfile | null {
  if (profiles.length === 0) return null;

  if (cachedProfileId) {
    const cached = profiles.find((profile) => profile.id === cachedProfileId);
    if (cached) return cached;
    // Unknown id — stale or tampered. Fall through and pick a safe default.
  }

  return profiles.find((profile) => !profile.isChild) ?? profiles[0] ?? null;
}

/** True when a cached id no longer corresponds to a loaded profile. */
export function isCachedPerspectiveStale(
  profiles: ReadonlyArray<PerspectiveProfile>,
  cachedProfileId: string | null | undefined,
): boolean {
  if (!cachedProfileId) return false;
  return !profiles.some((profile) => profile.id === cachedProfileId);
}

/** Storage access never throws: private mode and blocked storage are normal. */
export function readCachedPerspectiveId(storage: Pick<Storage, "getItem">): string | null {
  try {
    return storage.getItem(PERSPECTIVE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeCachedPerspectiveId(
  storage: Pick<Storage, "setItem">,
  profileId: string,
): void {
  try {
    storage.setItem(PERSPECTIVE_STORAGE_KEY, profileId);
  } catch {
    // A lost UI preference is harmless — it is not state we own.
  }
}
