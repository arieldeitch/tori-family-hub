import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PilotLandingScreen } from "./PilotLandingScreen";
import { PERSPECTIVE_STORAGE_KEY, type PerspectiveProfile } from "@/lib/pilot/perspective";
import type { PilotHouseholdState } from "@/lib/pilot/usePilotHousehold";
import { classifyError } from "@/lib/errors/classifyError";

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
    failure: null,
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

  it("shows an actionable error state and can retry when retrying could help", () => {
    const reload = vi.fn();
    const failure = classifyError({ online: true, status: 503 });
    setup(householdState({ status: "error", failure, reload }));
    expect(screen.getByText(/השרת נתקל בשגיאה/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "נסו שוב" }));
    expect(reload).toHaveBeenCalled();
  });

  // The whole point of the classification work: the screen must name the actual
  // fault instead of blaming the family's internet connection.
  it("never claims the network is down when the browser is online", () => {
    for (const failure of [
      classifyError({ online: true, status: 401 }),
      classifyError({ online: true, status: 500 }),
      classifyError({ online: true, status: 404, error: { code: "PGRST205" } }),
      classifyError({ online: true, error: { code: "MISSING_RUNTIME_CONFIG" } }),
    ]) {
      const { unmount } = render(
        <PilotLandingScreen
          authenticatedActor={ACTOR}
          householdState={householdState({ status: "error", failure })}
          onSignOut={vi.fn()}
          storage={memoryStorage()}
        />,
      );
      expect(screen.queryByText(/אין חיבור לרשת/)).toBeNull();
      unmount();
    }
  });

  it("shows the offline message only for a genuinely offline browser", () => {
    setup(householdState({ status: "error", failure: classifyError({ online: false }) }));
    expect(screen.getByText(/אין חיבור לרשת כרגע/)).toBeInTheDocument();
  });

  it("names an expired session and does not offer a pointless retry", () => {
    setup(
      householdState({ status: "error", failure: classifyError({ online: true, status: 401 }) }),
    );
    expect(screen.getByText(/ההתחברות פגה/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "נסו שוב" })).toBeNull();
  });

  it("names a missing migration rather than a network fault", () => {
    setup(
      householdState({
        status: "error",
        failure: classifyError({ online: true, status: 404, error: { code: "PGRST205" } }),
      }),
    );
    expect(screen.getByText(/חסר עדכון במסד הנתונים/)).toBeInTheDocument();
  });

  it("renders a permission refusal as a permission state, not an error to retry", () => {
    setup(
      householdState({ status: "error", failure: classifyError({ online: true, status: 403 }) }),
    );
    expect(screen.getByText(/אין הרשאה לפעולה הזו/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "נסו שוב" })).toBeNull();
  });

  it("shows a permission-denied state when RLS returns no profiles", () => {
    setup(householdState({ profiles: [] }));
    expect(screen.getByText(/אין פרופילים להצגה/)).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  // This screen used to BE the product, which is what made every other module
  // unreachable. It is now a thin account screen, and its most important job is
  // that it is not a dead end: it must offer a way into the application shell.
  it("is not a dead end — it links into the application and the chores module", () => {
    setup();
    const chores = screen.getByRole("link", { name: /מטלות השבוע/ });
    const app = screen.getByRole("link", { name: /מעבר לאפליקציה/ });
    expect(chores).toHaveAttribute("href", "/chores");
    expect(app).toHaveAttribute("href", "/today");
  });

  it("no longer embeds the weekly view — that is a module at /chores now", () => {
    setup();
    expect(screen.queryByText(/תצוגת המטלות השבועית עדיין לא נבנתה/)).toBeNull();
    expect(screen.queryByText(/שבוע המטלות/)).toBeNull();
  });

  it("never shows the offline screen merely because the probe has not resolved", () => {
    setup();
    expect(screen.queryByText(/אין חיבור לרשת/)).toBeNull();
  });
});
