// Family Pilot — the authenticated actor (WP5A).
//
// `authenticatedActor` is the Supabase Auth identity: WHO IS SIGNED IN. It is
// the only source of authority, and the server re-derives it from auth.uid() on
// every request — this hook is purely for rendering.
//
// It is deliberately NOT called `currentUser`, because the pilot also has a
// `selectedPerspectiveProfile` (whose week is shown). Conflating the two is the
// mistake that would turn a display choice into a permission (ADR-035).
import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/infrastructure/supabase";

export interface AuthenticatedActor {
  /** auth.users.id — the value the server sees as auth.uid(). */
  authUserId: string;
  email: string | null;
}

export type PilotSessionStatus = "loading" | "signed-in" | "signed-out";

export interface PilotSessionState {
  status: PilotSessionStatus;
  authenticatedActor: AuthenticatedActor | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

/**
 * NOTE: the authenticated actor cannot yet be mapped to a member profile in the
 * browser. WP4 deliberately withholds `household_members.auth_user_id` from
 * every client (ADR-029), and the helper that resolves it lives in the
 * non-exposed `private` schema (ADR-027). Binding actor → profile therefore
 * needs a small exposed server function, which belongs with the WP5B/WP5C
 * server operations. WP5A does not need it: perspective selection is attribution
 * only, and nothing here grants authority.
 */
export function usePilotSession(): PilotSessionState {
  const [status, setStatus] = useState<PilotSessionStatus>("loading");
  const [authenticatedActor, setAuthenticatedActor] = useState<AuthenticatedActor | null>(null);

  useEffect(() => {
    let active = true;
    const client = getSupabaseClient();

    const apply = (user: { id: string; email?: string | null } | null | undefined): void => {
      if (!active) return;
      if (user) {
        setAuthenticatedActor({ authUserId: user.id, email: user.email ?? null });
        setStatus("signed-in");
      } else {
        setAuthenticatedActor(null);
        setStatus("signed-out");
      }
    };

    void client.auth.getSession().then(({ data }) => apply(data.session?.user));

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      apply(session?.user);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    // Surface a message, never the raw credential or token.
    return { error: error ? error.message : null };
  }, []);

  const signOut = useCallback(async () => {
    await getSupabaseClient().auth.signOut();
  }, []);

  return { status, authenticatedActor, signIn, signOut };
}
