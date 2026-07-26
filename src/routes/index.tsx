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
    if (status === "signed-in") void navigate({ to: "/pilot", replace: true });
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
