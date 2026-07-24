import * as React from "react";
import { CloudUpload } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PendingSyncBadgeProps {
  /** How many local-only changes are waiting. */
  count?: number;
  label?: string;
  className?: string;
}

/**
 * Non-blocking indicator that some changes are held locally and haven't
 * reached the server yet. Never promises that they will sync automatically —
 * background sync is out of scope in this prototype.
 */
export function PendingSyncBadge({
  count,
  label = "ממתין לסנכרון",
  className,
}: PendingSyncBadgeProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning-foreground",
        className,
      )}
    >
      <CloudUpload aria-hidden="true" className="size-3.5" />
      <span>
        {label}
        {typeof count === "number" && count > 0 ? ` · ${count}` : ""}
      </span>
    </span>
  );
}
