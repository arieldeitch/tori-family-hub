import * as React from "react";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OfflineStateProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function OfflineState({ title, description, action, className }: OfflineStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-warning/40 bg-warning/15 p-6 text-center",
        className,
      )}
    >
      <WifiOff aria-hidden="true" className="size-6 text-warning-foreground" />
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}
