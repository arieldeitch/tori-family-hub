import * as React from "react";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RetryBannerProps {
  message: React.ReactNode;
  onRetry: () => void;
  retryLabel?: string;
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
}

/**
 * Compact top-of-screen banner offering a single retry action.
 * Announced via aria-live so screen readers pick it up without stealing focus.
 */
export function RetryBanner({
  message,
  onRetry,
  retryLabel = "נסה שוב",
  onDismiss,
  dismissLabel = "סגירה",
  className,
}: RetryBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-foreground",
        className,
      )}
    >
      <p className="min-w-0 flex-1">{message}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <RotateCw aria-hidden="true" className="size-4" />
          {retryLabel}
        </button>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted"
          >
            {dismissLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
