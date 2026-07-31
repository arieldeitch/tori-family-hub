import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WeeklyChoresView } from "./WeeklyChoresView";
import { classifyError } from "@/lib/errors/classifyError";
import { groupByWeekDay } from "@/domain/week";
import type { WeeklyChoresState, WeeklyOccurrence } from "@/lib/pilot/useWeeklyChores";
import type { PerspectiveProfile } from "@/lib/pilot/perspective";

// Generic placeholder people — never the real pilot household (ADR-034).
const PROFILES: PerspectiveProfile[] = [
  { id: "p-1", displayName: "מבוגר א", isChild: false },
  { id: "p-3", displayName: "ילד א", isChild: true },
  { id: "p-4", displayName: "ילד ב", isChild: true },
];

const WEEK_START = "2026-08-02"; // a Sunday

function occurrence(over: Partial<WeeklyOccurrence> = {}): WeeklyOccurrence {
  return {
    id: "o-1",
    templateId: "t-1",
    dayKey: "2026-08-03",
    title: "פינוי מדיח כלים",
    description: null,
    status: "pending",
    completedAt: null,
    completedByProfileId: null,
    assigneeProfileId: "p-3",
    rotationExplanation: "ילד א הבא בתור ברוטציה.",
    rotationReasonCode: "NEXT_IN_SEQUENCE",
    algorithmVersion: "shifts.v1",
    ...over,
  };
}

function state(over: Partial<WeeklyChoresState> = {}): WeeklyChoresState {
  const occurrences = over.occurrences ?? [occurrence()];
  return {
    status: "ready",
    weekStart: WEEK_START,
    occurrences,
    days: groupByWeekDay(occurrences, (o) => o.dayKey, WEEK_START, "2026-08-03"),
    failure: null,
    reload: vi.fn(),
    shiftWeek: vi.fn(),
    completeOccurrence: vi.fn().mockResolvedValue({ failure: null }),
    reopenOccurrence: vi.fn().mockResolvedValue({ failure: null }),
    ...over,
  };
}

function setup(weekly = state(), acting: PerspectiveProfile | null = PROFILES[1]!) {
  render(<WeeklyChoresView weekly={weekly} profiles={PROFILES} actingProfile={acting} />);
  return weekly;
}

describe("WeeklyChoresView — loading the family week", () => {
  it("renders all seven days, Sunday to Saturday", () => {
    setup();
    for (const day of ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]) {
      expect(screen.getByText(new RegExp(`יום ${day}`))).toBeInTheDocument();
    }
  });

  it("marks today exactly once", () => {
    setup();
    expect(screen.getAllByText("היום")).toHaveLength(1);
  });

  it("shows the chore, its assignee by NAME, and its status in words", () => {
    setup();
    expect(screen.getByText("פינוי מדיח כלים")).toBeInTheDocument();
    // Never colour alone (02-ux-ui-guidelines.md): the assignee and the status
    // must both be readable as text.
    expect(screen.getByText("ילד א")).toBeInTheDocument();
    expect(screen.getByText("ממתין")).toBeInTheDocument();
  });

  it("shows the deterministic rotation explanation", () => {
    setup();
    expect(screen.getByText("ילד א הבא בתור ברוטציה.")).toBeInTheDocument();
  });

  it("says so plainly when nobody holds the turn", () => {
    setup(state({ occurrences: [occurrence({ assigneeProfileId: null })] }));
    expect(screen.getByText("לא שובץ")).toBeInTheDocument();
  });

  it("renders right-to-left", () => {
    const { container } = render(
      <WeeklyChoresView weekly={state()} profiles={PROFILES} actingProfile={PROFILES[1]!} />,
    );
    expect(container.querySelector("section")).toHaveAttribute("dir", "rtl");
  });

  it("shows a designed empty state for a week with no chores", () => {
    setup(state({ occurrences: [] }));
    expect(screen.getByText(/אין מטלות בשבוע הזה/)).toBeInTheDocument();
  });

  it("shows a loading state", () => {
    setup(state({ status: "loading" }));
    expect(screen.getByText(/טוען את שבוע המטלות/)).toBeInTheDocument();
  });
});

describe("WeeklyChoresView — completing an occurrence", () => {
  it("marks an occurrence complete through the data layer", async () => {
    const weekly = setup();
    fireEvent.click(screen.getByRole("button", { name: /פינוי מדיח כלים/ }));
    await waitFor(() => expect(weekly.completeOccurrence).toHaveBeenCalledWith("o-1", "p-3"));
  });

  it("exposes pressed state accessibly, not by colour", () => {
    setup(state({ occurrences: [occurrence({ status: "done" })] }));
    expect(screen.getByRole("button", { name: /פינוי מדיח כלים/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("בוצע")).toBeInTheDocument();
  });

  it("reopens an already-completed occurrence rather than completing it again", async () => {
    const weekly = setup(state({ occurrences: [occurrence({ status: "done" })] }));
    fireEvent.click(screen.getByRole("button", { name: /פינוי מדיח כלים/ }));
    await waitFor(() => expect(weekly.reopenOccurrence).toHaveBeenCalledWith("o-1", "p-3"));
    expect(weekly.completeOccurrence).not.toHaveBeenCalled();
  });

  it("shows a VISIBLE error when the write fails — never a silent false success", async () => {
    // PILOT_WEEKLY_CHORES.md §7: a failed persistence must never render as success.
    const weekly = state({
      completeOccurrence: vi
        .fn()
        .mockResolvedValue({ failure: classifyError({ online: true, status: 403 }) }),
    });
    setup(weekly);
    fireEvent.click(screen.getByRole("button", { name: /פינוי מדיח כלים/ }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/אין הרשאה לפעולה הזו/);
    expect(alert).not.toHaveTextContent(/אין חיבור לרשת/);
  });

  it("cannot complete anything without an acting profile", () => {
    setup(state(), null);
    expect(screen.getByRole("button", { name: /פינוי מדיח כלים/ })).toBeDisabled();
    expect(screen.getByText(/בחרו פרופיל/)).toBeInTheDocument();
  });

  it("ignores a second tap while a write is in flight", async () => {
    // Guards against a double-tap producing two concurrent completions.
    let release: (v: { failure: null }) => void = () => {};
    const completeOccurrence = vi
      .fn()
      .mockReturnValue(new Promise<{ failure: null }>((r) => (release = r)));
    setup(state({ completeOccurrence }));
    const card = screen.getByRole("button", { name: /פינוי מדיח כלים/ });
    fireEvent.click(card);
    fireEvent.click(card);
    fireEvent.click(card);
    release({ failure: null });
    await waitFor(() => expect(completeOccurrence).toHaveBeenCalledTimes(1));
  });
});

describe("WeeklyChoresView — error states are honest", () => {
  it("renders a permission refusal as a permission state", () => {
    setup(state({ status: "error", failure: classifyError({ online: true, status: 403 }) }));
    expect(screen.getByText(/אין הרשאה לפעולה הזו/)).toBeInTheDocument();
  });

  it("never blames the network for a server, auth or schema fault", () => {
    for (const failure of [
      classifyError({ online: true, status: 500 }),
      classifyError({ online: true, status: 401 }),
      classifyError({ online: true, status: 404, error: { code: "PGRST205" } }),
    ]) {
      const { unmount } = render(
        <WeeklyChoresView
          weekly={state({ status: "error", failure })}
          profiles={PROFILES}
          actingProfile={PROFILES[1]!}
        />,
      );
      expect(screen.queryByText(/אין חיבור לרשת/)).toBeNull();
      unmount();
    }
  });

  it("shows the offline message only when the browser is genuinely offline", () => {
    setup(state({ status: "error", failure: classifyError({ online: false }) }));
    expect(screen.getByText(/אין חיבור לרשת כרגע/)).toBeInTheDocument();
  });

  it("offers retry only when retrying could help", () => {
    setup(state({ status: "error", failure: classifyError({ online: true, status: 401 }) }));
    expect(screen.queryByRole("button", { name: "נסו שוב" })).toBeNull();
  });
});

describe("WeeklyChoresView — week navigation", () => {
  it("moves between weeks", () => {
    const weekly = setup();
    fireEvent.click(screen.getByRole("button", { name: "השבוע הקודם" }));
    expect(weekly.shiftWeek).toHaveBeenCalledWith(-1);
    fireEvent.click(screen.getByRole("button", { name: "השבוע הבא" }));
    expect(weekly.shiftWeek).toHaveBeenCalledWith(1);
  });
});
