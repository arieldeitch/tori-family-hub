// Family Pilot — the authenticated actor (WP5A).
//
// `authenticatedActor` is the Supabase Auth identity: WHO IS SIGNED IN. It is
// the only source of authority, and the server re-derives it from auth.uid() on
// every request — this hook is purely for rendering.
//
// It is deliberately NOT called `currentUser`, because the pilot also has a
// `selectedPerspectiveProfile` (whose week is shown). Conflating the two is the
// mistake that would turn a display choice into a permission (ADR-035).
//
// Works unchanged against the local Supabase stack and the hosted preview: the
// environment supplies the two browser-safe values. A missing or unsafe
// configuration yields the "unconfigured" status so the UI can explain itself
// instead of rendering a blank page.
import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/infrastructure/supabase";
import { classifyError, describeForLog, type ClassifiedError } from "@/lib/errors/classifyError";
import { readPilotRuntimeConfig, type PilotRuntimeConfigError } from "./runtimeConfig";

export interface AuthenticatedActor {
  /** auth.users.id — the value the server sees as auth.uid(). */
  authUserId: string;
  email: string | null;
}

export type PilotSessionStatus = "loading" | "signed-in" | "signed-out" | "unconfigured";

export interface PilotSessionState {
  status: PilotSessionStatus;
  authenticatedActor: AuthenticatedActor | null;
  /** Present only when status is "unconfigured". Names only, never values. */
  configError: PilotRuntimeConfigError | null;
  /**
   * Returns a CLASSIFIED failure, never a raw driver string. The sign-in screen
   * used to render one hard-coded "wrong credentials" message for every failure,
   * so a server with the Email provider switched off told the family their
   * password was wrong — a fault they could never fix by retrying (ADR-042).
   */
  signIn: (email: string, password: string) => Promise<{ failure: ClassifiedError | null }>;
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
  const [configError, setConfigError] = useState<PilotRuntimeConfigError | null>(null);

  useEffect(() => {
    const config = readPilotRuntimeConfig();
    if (!config.ok) {
      setConfigError(config);
      setStatus("unconfigured");
      return;
    }

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

    void client.auth
      .getSession()
      .then(({ data }) => apply(data.session?.user))
      // A transport failure must not leave the UI stuck on "loading" forever.
      .catch(() => apply(null));

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      apply(session?.user);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const config = readPilotRuntimeConfig();
    if (!config.ok) {
      return { failure: classifyError({ error: { code: "MISSING_RUNTIME_CONFIG" } }) };
    }
    try {
      const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
      if (!error) return { failure: null };
      const failure = classifyError({ error, status: error.status ?? null });
      // Kind and code only — never the address, the password or a token.
      console.warn(describeForLog(failure));
      return { failure };
    } catch (err: unknown) {
      const failure = classifyError({ error: err });
      console.warn(describeForLog(failure));
      return { failure };
    }
  }, []);

  const signOut = useCallback(async () => {
    const config = readPilotRuntimeConfig();
    if (!config.ok) return;
    await getSupabaseClient().auth.signOut();
  }, []);

  return { status, authenticatedActor, configError, signIn, signOut };
}
