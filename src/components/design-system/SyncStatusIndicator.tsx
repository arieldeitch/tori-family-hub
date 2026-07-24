import * as React from "react";
import { Check, CloudOff, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type SyncStatus = "synced" | "syncing" | "offline" | "error";

export interface SyncStatusIndicatorProps {
  status: SyncStatus;
  label: string;
  className?: string;
}

const MAP: Record<
  SyncStatus,
  { icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  synced: { icon: Check, tone: "text-success" },
  syncing: { icon: RefreshCw, tone: "text-info" },
  offline: { icon: CloudOff, tone: "text-warning-foreground" },
  error: { icon: AlertTriangle, tone: "text-error" },
};

export function SyncStatusIndicator({ status, label, className }: SyncStatusIndicatorProps) {
  const { icon: Icon, tone } = MAP[status];
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("size-4", tone, status === "syncing" && "motion-safe:animate-spin")}
      />
      <span>{label}</span>
    </span>
  );
}
