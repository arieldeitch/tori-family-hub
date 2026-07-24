import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  /** Fewer rows in dense contexts. */
  rows?: number;
}

/**
 * Standard loading placeholder for a screen or section.
 * Uses `motion-safe:animate-*` so users with `prefers-reduced-motion`
 * see a static, non-flashing state.
 */
export function LoadingState({ title, description, className, rows = 3 }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn("flex flex-col gap-3", className)}
    >
      {(title || description) && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />
          <div>
            {title ? <p className="text-sm font-medium text-foreground">{title}</p> : null}
            {description ? <p className="text-xs">{description}</p> : null}
          </div>
        </div>
      )}
      <div className="space-y-2" aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-lg border border-border bg-muted/60 motion-safe:animate-pulse"
          />
        ))}
      </div>
      <span className="sr-only">טוען…</span>
    </div>
  );
}
