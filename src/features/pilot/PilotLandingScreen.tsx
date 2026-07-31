// Family Pilot — landing shell (WP5A).
//
// Confirms the household loaded under RLS and hosts the profile selector. The
// weekly chores view itself is WP5D and is deliberately not built here.
import { useEffect, useMemo, useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState, PermissionDeniedState } from "@/components/design-system";
import { useSchemaCapability } from "@/lib/pilot/useSchemaCapability";
import { useWeeklyChores } from "@/lib/pilot/useWeeklyChores";
import { PilotUpgradePendingState } from "./PilotUpgradePendingState";
import { WeeklyChoresView } from "./WeeklyChoresView";
import {
  readCachedPerspectiveId,
  resolveSelectedPerspectiveProfile,
  writeCachedPerspectiveId,
  type PerspectiveProfile,
} from "@/lib/pilot/perspective";
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

  // Ask once whether the backend is new enough, then load the week only if it is.
  const capability = useSchemaCapability(status === "ready");
  const weekly = useWeeklyChores({
    enabled: status === "ready" && capability.status === "ready",
    householdId: household?.id ?? null,
  });

  const resolvedStorage = useMemo<Pick<Storage, "getItem" | "setItem"> | null>(() => {
    if (storage) return storage;
    return typeof window === "undefined" ? null : window.localStorage;
  }, [storage]);

  const [selectedPerspectiveProfileId, setSelectedPerspectiveProfileId] = useState<string | null>(
    null,
  );

  // The cached id is untrusted: it is only ever resolved against the profiles
  // RLS actually returned, so a stale or edited cache falls back safely.
  const selectedPerspectiveProfile = useMemo(
    () =>
      resolveSelectedPerspectiveProfile({
        profiles,
        cachedProfileId:
          selectedPerspectiveProfileId ??
          (resolvedStorage ? readCachedPerspectiveId(resolvedStorage) : null),
      }),
    [profiles, selectedPerspectiveProfileId, resolvedStorage],
  );

  useEffect(() => {
    if (selectedPerspectiveProfile && resolvedStorage) {
      writeCachedPerspectiveId(resolvedStorage, selectedPerspectiveProfile.id);
    }
  }, [selectedPerspectiveProfile, resolvedStorage]);

  function handleSelectPerspective(profile: PerspectiveProfile): void {
    setSelectedPerspectiveProfileId(profile.id);
  }

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
          // The failure is classified, so the screen names the actual fault
          // instead of blaming the network for an expired session, a permission
          // refusal or a missing migration. Retry is offered only when retrying
          // could plausibly help.
          failure?.kind === "permission" ? (
            <PermissionDeniedState title={failure.message} description={failure.hint} />
          ) : (
            <ErrorState
              title={failure?.message ?? "לא הצלחנו לטעון את בני הבית"}
              description={failure?.hint ?? "נסו שוב בעוד רגע."}
              action={
                failure?.retryable !== false ? (
                  <Button onClick={reload} variant="outline">
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
              onSelectPerspective={handleSelectPerspective}
            />

            <div className="mt-6">
              {/*
                The backend may legitimately be older than this build: WP5B/WP5C
                are merged here but applying them to the hosted project is a
                separate approval-gated step. Until then the family gets a calm
                upgrade-pending screen instead of an error, and the real view
                switches itself on the moment the tables appear — no redeploy.
              */}
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
                  profiles={profiles}
                  actingProfile={selectedPerspectiveProfile}
                />
              )}
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
