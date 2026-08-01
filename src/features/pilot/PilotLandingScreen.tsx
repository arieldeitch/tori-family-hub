// Family Pilot — landing shell (WP5A, re-scoped by WP5D).
//
// This screen used to BE the product: the root route sent every signed-in person
// here, and because it renders outside AppShell it had no navigation, so the
// other forty routes became unreachable. That was the regression.
//
// It is now a thin account screen. The weekly chores live at /chores as a module
// inside the application shell, and the root route sends signed-in people to
// /today. Anyone landing here still gets a way INTO the app rather than a dead
// end.
import { CalendarRange, LayoutGrid, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState, PermissionDeniedState } from "@/components/design-system";
import { usePerspectiveProfile } from "@/lib/pilot/usePerspectiveProfile";
import type { AuthenticatedActor } from "@/lib/pilot/usePilotSession";
import type { PilotHouseholdState } from "@/lib/pilot/usePilotHousehold";
import { ProfileSelector } from "./ProfileSelector";

export interface PilotLandingScreenProps {
  authenticatedActor: AuthenticatedActor;
  householdState: PilotHouseholdState;
  onSignOut: () => void;
  /** Injectable for tests; defaults to the browser's localStorage. */
  storage?: Pick<Storage, "getItem" | "setItem">;
}

export function PilotLandingScreen({
  authenticatedActor,
  householdState,
  onSignOut,
  storage,
}: PilotLandingScreenProps) {
  const { status, household, profiles, failure, reload } = householdState;
  const { selectedPerspectiveProfile, selectPerspective } = usePerspectiveProfile(
    profiles,
    storage,
  );

  return (
    <main dir="rtl" className="mx-auto min-h-screen w-full max-w-md bg-background px-4 py-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            פיילוט מקומי — אינו סביבת ייצור
          </span>
          <h1 className="mt-2 truncate text-xl font-semibold text-foreground">
            {household?.name ?? "משק הבית"}
          </h1>
          <p className="truncate text-xs text-muted-foreground" dir="ltr">
            {authenticatedActor.email ?? authenticatedActor.authUserId}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onSignOut} className="shrink-0">
          <LogOut className="me-1.5 h-4 w-4" aria-hidden="true" />
          יציאה
        </Button>
      </header>

      <div className="mt-6">
        {status === "loading" ? (
          <LoadingState title="טוען את בני הבית…" />
        ) : status === "error" ? (
          failure?.kind === "permission" ? (
            <PermissionDeniedState title={failure.message} description={failure.hint} />
          ) : (
            <ErrorState
              title={failure?.message ?? "לא הצלחנו לטעון את בני הבית"}
              description={failure?.hint ?? "נסו שוב בעוד רגע."}
              action={
                failure?.retryable !== false ? (
                  <Button onClick={reload} variant="outline" className="min-h-11">
                    נסו שוב
                  </Button>
                ) : undefined
              }
            />
          )
        ) : profiles.length === 0 ? (
          <PermissionDeniedState
            title="אין פרופילים להצגה"
            description="החשבון המחובר אינו חבר פעיל במשק בית, או שאתחול הפיילוט המקומי טרם הורץ."
          />
        ) : (
          <>
            <ProfileSelector
              profiles={profiles}
              selectedPerspectiveProfile={selectedPerspectiveProfile}
              onSelectPerspective={selectPerspective}
            />

            {/* The way back into the application. Without these, this screen is
                a dead end — which is exactly what the regression was.

                Plain anchors rather than router links: this screen renders
                outside the application shell, and a full navigation is what we
                actually want here — it mounts AppShell cleanly with its
                navigation, rather than swapping a subtree into a shell-less
                tree. It also keeps this screen renderable without a router. */}
            <div className="mt-6 grid gap-2">
              <Button asChild className="min-h-11 w-full">
                <a href="/chores">
                  <CalendarRange className="me-1.5 h-4 w-4" aria-hidden="true" />
                  מטלות השבוע
                </a>
              </Button>
              <Button asChild variant="outline" className="min-h-11 w-full">
                <a href="/today">
                  <LayoutGrid className="me-1.5 h-4 w-4" aria-hidden="true" />
                  מעבר לאפליקציה
                </a>
              </Button>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              בחירת הפרופיל משפיעה על התצוגה בלבד — היא אינה מעניקה הרשאות.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
