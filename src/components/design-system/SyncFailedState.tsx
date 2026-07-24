import * as React from "react";
import { CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SyncFailedStateProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Called when the user asks to try syncing again. */
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * Shown when a sync attempt has failed. Presents the failure plainly and
 * lets the user retry. Never overwrites data silently.
 */
export function SyncFailedState({
  title = "הסנכרון נכשל",
  description = "השינויים שלך שמורים אצלך. אפשר לנסות שוב בכל רגע.",
  onRetry,
  retryLabel = "נסה שוב לסנכרן",
  className,
}: SyncFailedStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-error/30 bg-error/10 p-6 text-center",
        className,
      )}
    >
      <CloudOff aria-hidden="true" className="size-6 text-error" />
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
