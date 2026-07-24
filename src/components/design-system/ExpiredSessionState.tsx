import * as React from "react";
import { KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExpiredSessionStateProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  onSignIn?: () => void;
  signInLabel?: string;
  className?: string;
}

/**
 * Displayed when the session is no longer valid. The message is neutral —
 * we do NOT say "someone else logged in" or leak reasons. Also: no user
 * data is shown here; the caller is responsible for clearing sensitive
 * content from view before rendering this state.
 */
export function ExpiredSessionState({
  title = "פג תוקף החיבור",
  description = "מטעמי אבטחה, נבקש להתחבר מחדש כדי להמשיך.",
  onSignIn,
  signInLabel = "התחברות מחדש",
  className,
}: ExpiredSessionStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface p-6 text-center",
        className,
      )}
    >
      <KeyRound aria-hidden="true" className="size-6 text-muted-foreground" />
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {onSignIn ? (
        <button
          type="button"
          onClick={onSignIn}
          className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {signInLabel}
        </button>
      ) : null}
    </div>
  );
}
