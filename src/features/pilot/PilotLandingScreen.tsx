// Family Pilot — landing shell (WP5A).
//
// Confirms the household loaded under RLS and hosts the profile selector. The
// weekly chores view itself is WP5D and is deliberately not built here.
import { useEffect, useMemo, useState } from "react";
import { CalendarRange, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PermissionDeniedState,
} from "@/components/design-system";
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
              <EmptyState
                icon={<CalendarRange className="h-8 w-8" aria-hidden="true" />}
                title="תצוגת המטלות השבועית עדיין לא נבנתה"
                description={
                  selectedPerspectiveProfile
                    ? `כשהתצוגה תיבנה, כאן יופיע השבוע של ${selectedPerspectiveProfile.displayName} מיום ראשון עד שבת.`
                    : "כאן תופיע תצוגת השבוע מיום ראשון עד שבת."
                }
              />
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
