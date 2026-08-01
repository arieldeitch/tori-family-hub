// Root route (WP5A hosted conversion).
//
// The hosted Family Pilot is the product surface right now, so the root sends
// people where they can actually act:
//
//   signed out    -> /pilot/signin
//   signed in     -> /pilot
//   unconfigured  -> a visible configuration screen, never a blank page
//
// Previously this threw a redirect to /today during beforeLoad. That runs before
// any session exists, so it could never route by sign-in state, and a hosted
// visitor landed on the mock-data screen instead of the pilot.
//
// The decision is client-side because the session lives in the browser; server
// rendering shows a loading state rather than nothing, so a hosted preview never
// serves an empty document.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LoadingState } from "@/components/design-system";
import { PilotConfigurationError } from "@/features/pilot/PilotConfigurationError";
import { usePilotSession } from "@/lib/pilot/usePilotSession";

export const Route = createFileRoute("/")({
  component: RootEntry,
});

function RootEntry() {
  const { status, configError } = usePilotSession();
  const navigate = useNavigate();

  useEffect(() => {
    // A signed-in person goes to the APPLICATION, not to the pilot screen.
    //
    // This line used to send them to /pilot, which is a standalone screen with
    // no app shell and no navigation, so every other module — Today, calendar,
    // tasks, shopping, transport, follow-ups, household, notifications,
    // settings — became unreachable even though all forty-odd routes still
    // existed and still rendered inside AppShell. The pilot narrowed the whole
    // product to one screen instead of adding a module to it.
    //
    // /today is the intended home: "The Today screen is the center of the
    // product" (README, 01-product-requirements.md). The pilot's weekly chores
    // now live at /chores as a first-class module inside the same shell, and
    // /pilot remains reachable for the profile selector.
    if (status === "signed-in") void navigate({ to: "/today", replace: true });
    else if (status === "signed-out") void navigate({ to: "/pilot/signin", replace: true });
  }, [status, navigate]);

  if (status === "unconfigured" && configError) {
    return <PilotConfigurationError configError={configError} />;
  }

  return (
    <main dir="rtl" className="mx-auto min-h-screen w-full max-w-md px-4 py-10">
      <LoadingState title="טוען את Tori…" rows={2} />
    </main>
  );
}
