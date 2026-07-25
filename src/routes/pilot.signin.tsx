// Family Pilot — sign-in route (WP5A).
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LoadingState } from "@/components/design-system";
import { PilotSignInScreen } from "@/features/pilot/PilotSignInScreen";
import { usePilotSession } from "@/lib/pilot/usePilotSession";

export const Route = createFileRoute("/pilot/signin")({
  component: PilotSignInPage,
});

function PilotSignInPage() {
  const { status, signIn } = usePilotSession();
  const navigate = useNavigate();

  // Already signed in? Do not show a second sign-in form.
  useEffect(() => {
    if (status === "signed-in") void navigate({ to: "/pilot", replace: true });
  }, [status, navigate]);

  if (status === "loading" || status === "signed-in") {
    return (
      <main dir="rtl" className="mx-auto min-h-screen w-full max-w-sm px-4 py-10">
        <LoadingState title="בודק את החיבור…" rows={2} />
      </main>
    );
  }

  return <PilotSignInScreen onSignIn={signIn} />;
}
