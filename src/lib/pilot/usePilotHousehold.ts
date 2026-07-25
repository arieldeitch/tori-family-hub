// Family Pilot — load the authenticated household (WP5A).
//
// Everything here comes from PostgreSQL under the WP4 RLS policies. The client
// sends no household id and no profile id: the policies scope the rows to the
// caller's own household, so the query returns the four pilot profiles because
// the signed-in adult is an active member — not because the client asked for
// them (ADR-027).
import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/infrastructure/supabase";
import type { PerspectiveProfile } from "./perspective";

export interface PilotHousehold {
  id: string;
  name: string;
}

export interface PilotHouseholdState {
  status: "loading" | "ready" | "error";
  household: PilotHousehold | null;
  profiles: PerspectiveProfile[];
  error: string | null;
  reload: () => void;
}

export function usePilotHousehold(enabled: boolean): PilotHouseholdState {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [household, setHousehold] = useState<PilotHousehold | null>(null);
  const [profiles, setProfiles] = useState<PerspectiveProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setStatus("loading");
    setError(null);

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

      const failure = householdResult.error ?? profileResult.error;
      if (failure) {
        setError(failure.message);
        setStatus("error");
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
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    });

    return () => {
      active = false;
    };
  }, [enabled, reloadToken]);

  return { status, household, profiles, error, reload };
}
