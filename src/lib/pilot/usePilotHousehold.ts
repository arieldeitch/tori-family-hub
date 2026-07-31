// Family Pilot — load the authenticated household (WP5A).
//
// Everything here comes from PostgreSQL under the WP4 RLS policies. The client
// sends no household id and no profile id: the policies scope the rows to the
// caller's own household, so the query returns the four pilot profiles because
// the signed-in adult is an active member — not because the client asked for
// them (ADR-027).
import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/infrastructure/supabase";
import { classifyError, describeForLog, type ClassifiedError } from "@/lib/errors/classifyError";
import type { PerspectiveProfile } from "./perspective";

export interface PilotHousehold {
  id: string;
  name: string;
}

export interface PilotHouseholdState {
  status: "loading" | "ready" | "error";
  household: PilotHousehold | null;
  profiles: PerspectiveProfile[];
  /**
   * A classified failure, never a raw driver message. Reporting "no network" for
   * an expired session or a missing migration sends the family to reboot a
   * working router while the real fault stays invisible.
   */
  failure: ClassifiedError | null;
  reload: () => void;
}

export function usePilotHousehold(enabled: boolean): PilotHouseholdState {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [household, setHousehold] = useState<PilotHousehold | null>(null);
  const [profiles, setProfiles] = useState<PerspectiveProfile[]>([]);
  const [failure, setFailure] = useState<ClassifiedError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  const fail = useCallback((error: unknown, status?: number | null): void => {
    const classified = classifyError({ error, status: status ?? null });
    // Technical detail goes to the console, never to the screen: a PostgREST
    // message can carry row values.
    console.warn(describeForLog(classified));
    setFailure(classified);
    setStatus("error");
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setStatus("loading");
    setFailure(null);

    const load = async (): Promise<void> => {
      const client = getSupabaseClient();
      const [householdResult, profileResult] = await Promise.all([
        client.from("households").select("id, name").limit(1),
        // No household filter: RLS already scopes this to the caller's household.
        client
          .from("member_profiles")
          .select("id, display_name, is_child")
          .order("is_child", { ascending: true })
          .order("display_name", { ascending: true }),
      ]);

      if (!active) return;

      const queryError = householdResult.error ?? profileResult.error;
      if (queryError) {
        const status =
          (householdResult.error ? householdResult.status : profileResult.status) ?? null;
        fail(queryError, status);
        return;
      }

      const row = householdResult.data?.[0];
      setHousehold(row ? { id: row.id, name: row.name } : null);
      setProfiles(
        (profileResult.data ?? []).map((profile) => ({
          id: profile.id,
          displayName: profile.display_name,
          isChild: profile.is_child,
        })),
      );
      setStatus("ready");
    };

    void load().catch((err: unknown) => {
      if (!active) return;
      fail(err);
    });

    return () => {
      active = false;
    };
  }, [enabled, reloadToken, fail]);

  return { status, household, profiles, failure, reload };
}
