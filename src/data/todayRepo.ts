// Today repo.
//
// Composes the Today dataset from the canonical repos (tasksRepo, transportRepo,
// followUpRepo, shoppingRepo) via `todayService.buildTodayDataset`. It owns
// no domain fixtures of its own — that was the source of drift between the
// Today screen and every other module. Whenever any underlying repo emits,
// this repo re-emits so `useToday` refreshes.
//
// It DOES own the demo view-state toggle used by the Today screen picker
// (loading / error / offline / permission_denied / normal / child) — that is
// UI state only, not data.
//
// Actions delegate to `todayService`, so success only happens when the
// canonical repo mutation succeeds.

import * as tasksRepo from "@/data/tasksRepo";
import { transportRepo } from "@/data/transportRepo";
import * as followUpRepo from "@/data/followUpRepo";
import { shoppingRepo } from "@/data/shoppingRepo";
import type { EventItem, Role, TodayDataset } from "@/domain/today";
import {
  assignTransportAction,
  approveTransportAction,
  buildTodayDataset,
  claimTaskAction,
  completeTaskAction,
  todayViewerIds,
} from "@/application/todayService";

export type TodayViewState =
  | "normal"
  | "loading"
  | "error"
  | "offline"
  | "permission_denied"
  | "child";

interface State {
  view: TodayViewState;
  dataset: TodayDataset;
}

// A small demo event so "next in time" surfaces something recognisable.
function demoEvents(): EventItem[] {
  const at = new Date();
  at.setHours(20, 0, 0, 0);
  return [
    {
      id: "e_meeting",
      kind: "event",
      title: "אסיפת הורים כיתה ג'",
      timeAt: at.toISOString(),
      location: "בית ספר רמון",
    },
  ];
}

function compose(view: TodayViewState): State {
  const viewerId = view === "child" ? todayViewerIds.child : todayViewerIds.adult;
  const viewerRole: Role = view === "child" ? "child" : "owner";
  const dataset = buildTodayDataset({
    viewerId,
    viewerRole,
    events: demoEvents(),
  });
  return { view, dataset };
}

let state: State = compose("normal");
const listeners = new Set<() => void>();

function recompose() {
  state = compose(state.view);
  for (const l of listeners) l();
}

// Re-emit whenever any upstream repo changes so subscribers refresh.
tasksRepo.subscribe(recompose);
transportRepo.subscribe(recompose);
followUpRepo.subscribe(recompose);
shoppingRepo.subscribe(recompose);

function emit() {
  for (const l of listeners) l();
}

export const todayRepo = {
  subscribe(l: () => void): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot(): State {
    return state;
  },
  setView(view: TodayViewState): void {
    state = compose(view);
    emit();
  },
  // -------- Actions (delegate to todayService → canonical repos) --------
  assignTransport(rideId: string, memberId: string): void {
    assignTransportAction(rideId, memberId);
  },
  approveItem(id: string): void {
    // Today's "waiting approval" only surfaces transports in pending_acceptance
    // (canonical tasks have no waiting_approval state). Delegate accordingly.
    const ride = transportRepo.getById(id);
    if (ride) {
      approveTransportAction(id, ride.assigneeMemberId ?? state.dataset.viewerId);
    }
  },
  completeTask(id: string): void {
    completeTaskAction(id, state.dataset.viewerId);
  },
  claimTask(id: string, memberId: string): void {
    claimTaskAction(id, memberId);
  },
};
