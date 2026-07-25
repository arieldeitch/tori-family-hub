import { describe, it, expect } from "vitest";
import {
  isCachedPerspectiveStale,
  PERSPECTIVE_STORAGE_KEY,
  readCachedPerspectiveId,
  resolveSelectedPerspectiveProfile,
  writeCachedPerspectiveId,
  type PerspectiveProfile,
} from "./perspective";

const ADULT_OWNER: PerspectiveProfile = { id: "p-owner", displayName: "A", isChild: false };
const ADULT_SECOND: PerspectiveProfile = { id: "p-adult", displayName: "B", isChild: false };
const CHILD_FIRST: PerspectiveProfile = { id: "p-child-1", displayName: "C", isChild: true };
const CHILD_SECOND: PerspectiveProfile = { id: "p-child-2", displayName: "D", isChild: true };
const PROFILES = [ADULT_OWNER, ADULT_SECOND, CHILD_FIRST, CHILD_SECOND];

describe("resolveSelectedPerspectiveProfile", () => {
  it("honours a cached id that matches a loaded profile", () => {
    expect(
      resolveSelectedPerspectiveProfile({ profiles: PROFILES, cachedProfileId: CHILD_SECOND.id }),
    ).toEqual(CHILD_SECOND);
  });

  it("falls back safely when the cached id is unknown", () => {
    // A stale or tampered cache must never leave the UI in a broken state, and
    // must never widen what is shown beyond the loaded profiles.
    expect(
      resolveSelectedPerspectiveProfile({ profiles: PROFILES, cachedProfileId: "not-a-profile" }),
    ).toEqual(ADULT_OWNER);
  });

  it("falls back safely when there is no cached id", () => {
    expect(
      resolveSelectedPerspectiveProfile({ profiles: PROFILES, cachedProfileId: null }),
    ).toEqual(ADULT_OWNER);
  });

  it("prefers an adult profile as the default perspective", () => {
    const childrenFirst = [CHILD_FIRST, CHILD_SECOND, ADULT_SECOND];
    expect(
      resolveSelectedPerspectiveProfile({ profiles: childrenFirst, cachedProfileId: null }),
    ).toEqual(ADULT_SECOND);
  });

  it("uses the first profile when every profile is a child", () => {
    expect(
      resolveSelectedPerspectiveProfile({
        profiles: [CHILD_FIRST, CHILD_SECOND],
        cachedProfileId: null,
      }),
    ).toEqual(CHILD_FIRST);
  });

  it("returns null when no profile is available", () => {
    expect(resolveSelectedPerspectiveProfile({ profiles: [], cachedProfileId: "x" })).toBeNull();
  });

  it("never returns a profile outside the loaded set", () => {
    const resolved = resolveSelectedPerspectiveProfile({
      profiles: [CHILD_FIRST],
      cachedProfileId: ADULT_OWNER.id,
    });
    expect(PROFILES.filter((p) => p.id === resolved?.id).length).toBe(1);
    expect(resolved).toEqual(CHILD_FIRST);
  });
});

describe("isCachedPerspectiveStale", () => {
  it("is false for a matching id and for no id at all", () => {
    expect(isCachedPerspectiveStale(PROFILES, CHILD_FIRST.id)).toBe(false);
    expect(isCachedPerspectiveStale(PROFILES, null)).toBe(false);
  });

  it("is true for an id that is no longer loaded", () => {
    expect(isCachedPerspectiveStale(PROFILES, "removed-profile")).toBe(true);
  });
});

describe("perspective cache storage", () => {
  it("round-trips through a storage implementation", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
    writeCachedPerspectiveId(storage, CHILD_SECOND.id);
    expect(store.get(PERSPECTIVE_STORAGE_KEY)).toBe(CHILD_SECOND.id);
    expect(readCachedPerspectiveId(storage)).toBe(CHILD_SECOND.id);
  });

  it("never throws when storage is unavailable", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readCachedPerspectiveId(throwing)).toBeNull();
    expect(() => writeCachedPerspectiveId(throwing, "x")).not.toThrow();
  });
});
