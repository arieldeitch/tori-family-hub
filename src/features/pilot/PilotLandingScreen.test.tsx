import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PilotLandingScreen } from "./PilotLandingScreen";
import { PERSPECTIVE_STORAGE_KEY, type PerspectiveProfile } from "@/lib/pilot/perspective";
import type { PilotHouseholdState } from "@/lib/pilot/usePilotHousehold";

// Generic placeholder people — never the real pilot household (ADR-034).
const PROFILES: PerspectiveProfile[] = [
  { id: "p-1", displayName: "מבוגר א", isChild: false },
  { id: "p-2", displayName: "מבוגר ב", isChild: false },
  { id: "p-3", displayName: "ילד א", isChild: true },
  { id: "p-4", displayName: "ילד ב", isChild: true },
];

const ACTOR = { authUserId: "auth-user-1", email: "pilot-owner@tori.local" };

function memoryStorage(initial?: Record<string, string>) {
  const map = new Map(Object.entries(initial ?? {}));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    _map: map,
  };
}

function householdState(overrides: Partial<PilotHouseholdState> = {}): PilotHouseholdState {
  return {
    status: "ready",
    household: { id: "h-1", name: "משק בית לדוגמה" },
    profiles: PROFILES,
    error: null,
    reload: vi.fn(),
    ...overrides,
  };
}

function setup(state = householdState(), storage = memoryStorage()) {
  const onSignOut = vi.fn();
  render(
    <PilotLandingScreen
      authenticatedActor={ACTOR}
      householdState={state}
      onSignOut={onSignOut}
      storage={storage}
    />,
  );
  return { onSignOut, storage };
}

describe("PilotLandingScreen", () => {
  it("shows all four profiles after sign-in", () => {
    setup();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    for (const profile of PROFILES) {
      expect(screen.getByText(profile.displayName)).toBeInTheDocument();
    }
  });

  it("switches the displayed perspective", () => {
    setup();
    const child = screen.getByRole("radio", { name: /ילד ב/ });
    fireEvent.click(child);
    expect(child).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/כאן יופיע השבוע של ילד ב/)).toBeInTheDocument();
  });

  it("persists the perspective as a disposable UI preference only", () => {
    const { storage } = setup();
    fireEvent.click(screen.getByRole("radio", { name: /ילד א/ }));
    expect(storage._map.get(PERSPECTIVE_STORAGE_KEY)).toBe("p-3");
  });

  it("falls back safely when the cached profile id is unknown", () => {
    // A stale or tampered cache must not break the screen or widen visibility.
    setup(householdState(), memoryStorage({ [PERSPECTIVE_STORAGE_KEY]: "not-a-real-profile" }));
    const selected = screen
      .getAllByRole("radio")
      .filter((r) => r.getAttribute("aria-checked") === "true");
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveAccessibleName(/מבוגר א/);
  });

  it("honours a valid cached perspective", () => {
    setup(householdState(), memoryStorage({ [PERSPECTIVE_STORAGE_KEY]: "p-4" }));
    expect(screen.getByRole("radio", { name: /ילד ב/ })).toHaveAttribute("aria-checked", "true");
  });

  it("states that perspective selection grants no authority", () => {
    setup();
    expect(screen.getByText(/אינה מעניקה הרשאות/)).toBeInTheDocument();
  });

  it("conveys role as text, not by colour alone", () => {
    setup();
    expect(screen.getAllByText(/מבוגר\/ת/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ילד\/ה/).length).toBeGreaterThan(0);
  });

  it("renders right-to-left and marks the pilot as non-production", () => {
    setup();
    expect(screen.getByRole("main")).toHaveAttribute("dir", "rtl");
    expect(screen.getByText(/אינו סביבת ייצור/)).toBeInTheDocument();
  });

  it("exposes a keyboard-reachable radiogroup", () => {
    setup();
    const group = screen.getByRole("radiogroup");
    expect(group).toBeInTheDocument();
    // Native buttons are focusable and operable by keyboard by default.
    expect(screen.getAllByRole("radio")[0]?.tagName).toBe("BUTTON");
  });

  it("signs out", () => {
    const { onSignOut } = setup();
    fireEvent.click(screen.getByRole("button", { name: /יציאה/ }));
    expect(onSignOut).toHaveBeenCalled();
  });

  it("shows a loading state while the household loads", () => {
    setup(householdState({ status: "loading", household: null, profiles: [] }));
    expect(screen.getByText(/טוען את בני הבית/)).toBeInTheDocument();
  });

  it("shows an actionable error state and can retry", () => {
    const reload = vi.fn();
    setup(householdState({ status: "error", error: "boom", reload }));
    expect(screen.getByText(/לא הצלחנו לטעון/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "נסו שוב" }));
    expect(reload).toHaveBeenCalled();
  });

  it("shows a permission-denied state when RLS returns no profiles", () => {
    setup(householdState({ profiles: [] }));
    expect(screen.getByText(/אין פרופילים להצגה/)).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("does not build the weekly chores view yet", () => {
    setup();
    expect(screen.getByText(/תצוגת המטלות השבועית עדיין לא נבנתה/)).toBeInTheDocument();
  });
});
