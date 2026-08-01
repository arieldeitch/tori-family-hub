// The weekly chores module: session + household + capability + week, wired up.
//
// Extracted out of PilotLandingScreen so the same experience can be mounted
// inside the application shell (/chores) as one module among many, rather than
// being the entire product. PilotLandingScreen keeps the profile selector and
// links here.
//
// Every branch below is a designed state, and none of them is the offline
// screen unless the browser is genuinely offline (ADR-042):
//
//   unconfigured   the published build was not given its Supabase values
//   signed out     an explicit prompt to sign in, not a silent redirect
//   checking       the backend capability probe has not answered yet
//   upgrade pending the backend predates WP5B/WP5C (ADR-044)
//   error          the classified fault, named honestly
//   ready          the real week
import { Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState, PermissionDeniedState } from "@/components/design-system";
import { PilotConfigurationError } from "./PilotConfigurationError";
import { PilotUpgradePendingState } from "./PilotUpgradePendingState";
import { WeeklyChoresView } from "./WeeklyChoresView";
import { ProfileSelector } from "./ProfileSelector";
import { usePilotSession } from "@/lib/pilot/usePilotSession";
import { usePilotHousehold } from "@/lib/pilot/usePilotHousehold";
import { useSchemaCapability } from "@/lib/pilot/useSchemaCapability";
import { useWeeklyChores } from "@/lib/pilot/useWeeklyChores";
import { usePerspectiveProfile } from "@/lib/pilot/usePerspectiveProfile";

export function WeeklyChoresModule() {
  const session = usePilotSession();
  const household = usePilotHousehold(session.status === "signed-in");
  const capability = useSchemaCapability(household.status === "ready");
  const weekly = useWeeklyChores({
    enabled: household.status === "ready" && capability.status === "ready",
    householdId: household.household?.id ?? null,
  });
  const { selectedPerspectiveProfile, selectPerspective } = usePerspectiveProfile(
    household.profiles,
  );

  if (session.status === "unconfigured" && session.configError) {
    return <PilotConfigurationError configError={session.configError} />;
  }

  if (session.status === "loading") return <LoadingState title="טוען…" />;

  if (session.status === "signed-out") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <h2 className="text-base font-semibold text-foreground">נדרשת כניסה</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          מטלות השבוע נטענות ממסד הנתונים של המשפחה, ולכן דורשות חשבון מחובר.
        </p>
        <Button asChild variant="outline" className="mt-4 min-h-11">
          <Link to="/pilot/signin">
            <LogIn className="me-1.5 h-4 w-4" aria-hidden="true" />
            כניסה
          </Link>
        </Button>
      </div>
    );
  }

  if (household.status === "loading") return <LoadingState title="טוען את בני הבית…" />;

  if (household.status === "error") {
    return household.failure?.kind === "permission" ? (
      <PermissionDeniedState
        title={household.failure.message}
        description={household.failure.hint}
      />
    ) : (
      <ErrorState
        title={household.failure?.message ?? "לא הצלחנו לטעון את בני הבית"}
        description={household.failure?.hint ?? "נסו שוב בעוד רגע."}
        action={
          household.failure?.retryable !== false ? (
            <Button variant="outline" className="min-h-11" onClick={household.reload}>
              נסו שוב
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {household.profiles.length > 0 ? (
        <ProfileSelector
          profiles={household.profiles}
          selectedPerspectiveProfile={selectedPerspectiveProfile}
          onSelectPerspective={selectPerspective}
        />
      ) : null}

      {capability.status === "checking" ? (
        <LoadingState title="בודק את מצב השרת…" />
      ) : capability.status === "upgrade_pending" ? (
        <PilotUpgradePendingState
          onCheckAgain={capability.checkAgain}
          checking={capability.checking}
        />
      ) : capability.status === "error" ? (
        <ErrorState
          title={capability.failure?.message ?? "לא הצלחנו לבדוק את מצב השרת"}
          description={capability.failure?.hint ?? "נסו שוב בעוד רגע."}
          action={
            <Button variant="outline" className="min-h-11" onClick={capability.checkAgain}>
              נסו שוב
            </Button>
          }
        />
      ) : (
        <WeeklyChoresView
          weekly={weekly}
          profiles={household.profiles}
          actingProfile={selectedPerspectiveProfile}
        />
      )}

      <p className="text-center text-xs text-muted-foreground">
        בחירת הפרופיל משפיעה על התצוגה בלבד — היא אינה מעניקה הרשאות.
      </p>
    </div>
  );
}
