// Family Pilot — local sign-in (WP5A).
//
// The MINIMUM viable sign-in: email + password only. Deliberately no signup, no
// password recovery, no invitation flow, no user management, no child PIN, no
// account deletion — all of those remain deferred work (ADR-033).
import { useState, type FormEvent } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/design-system";
import type { ClassifiedError } from "@/lib/errors/classifyError";

export interface PilotSignInScreenProps {
  onSignIn: (email: string, password: string) => Promise<{ failure: ClassifiedError | null }>;
  /** Prefilled for the local pilot; still editable. */
  defaultEmail?: string;
}

export function PilotSignInScreen({ onSignIn, defaultEmail = "" }: PilotSignInScreenProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [failure, setFailure] = useState<ClassifiedError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFailure(null);

    const result = await onSignIn(email.trim(), password);
    // Name the actual fault. A wrong password and a server with the Email
    // provider switched off are different problems, and only one of them is
    // something the person at the keyboard can do anything about. The message is
    // still non-enumerating: it never reveals whether the ADDRESS exists, and it
    // never echoes the credential.
    setFailure(result.failure);
    setSubmitting(false);
  }

  const error = failure ? `${failure.message}. ${failure.hint}` : null;

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-background px-4 py-10"
    >
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
            פיילוט מקומי — אינו סביבת ייצור
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-foreground">כניסה לפיילוט המשפחתי</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            הכניסה מיועדת למכשיר המקומי בלבד, עם חשבון מבוגר יחיד.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <FormField label="דוא״ל" id="pilot-email">
            <Input
              id="pilot-email"
              type="email"
              inputMode="email"
              autoComplete="username"
              dir="ltr"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? true : undefined}
            />
          </FormField>

          <FormField label="סיסמה" id="pilot-password">
            <Input
              id="pilot-password"
              type="password"
              autoComplete="current-password"
              dir="ltr"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? true : undefined}
            />
          </FormField>

          {error ? (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
                מתחבר…
              </>
            ) : (
              "כניסה"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          אין הרשמה, שחזור סיסמה או ניהול משתמשים בפיילוט. הסיסמה מגיעה מהסביבה המקומית.
        </p>
      </div>
    </main>
  );
}
