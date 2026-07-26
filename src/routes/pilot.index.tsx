// Family Pilot — protected landing route (WP5A).
//
// Route protection is a redirect for UX only. The real boundary is RLS: a
// signed-out client that reached this route anyway would simply read nothing.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LoadingState } from "@/components/design-system";
import { PilotConfigurationError } from "@/features/pilot/PilotConfigurationError";
import { PilotLandingScreen } from "@/features/pilot/PilotLandingScreen";
import { usePilotHousehold } from "@/lib/pilot/usePilotHousehold";
import { usePilotSession } from "@/lib/pilot/usePilotSession";

export const Route = createFileRoute("/pilot/")({
  component: PilotLandingPage,
});

function PilotLandingPage() {
  const { status, authenticatedActor, signOut, configError } = usePilotSession();
  const navigate = useNavigate();
  const householdState = usePilotHousehold(status === "signed-in");

  useEffect(() => {
    if (status === "signed-out") void navigate({ to: "/pilot/signin", replace: true });
  }, [status, navigate]);

  if (status === "unconfigured" && configError) {
    return <PilotConfigurationError configError={configError} />;
  }

  if (status !== "signed-in" || !authenticatedActor) {
    return (
      <main dir="rtl" className="mx-auto min-h-screen w-full max-w-md px-4 py-10">
        <LoadingState title="טוען…" rows={2} />
      </main>
    );
  }

  return (
    <PilotLandingScreen
      authenticatedActor={authenticatedActor}
      householdState={householdState}
      onSignOut={() => {
        void signOut().then(() => navigate({ to: "/pilot/signin", replace: true }));
      }}
    />
  );
}
