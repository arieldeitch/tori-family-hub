import * as React from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PermissionDeniedStateProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function PermissionDeniedState({
  title,
  description,
  action,
  className,
}: PermissionDeniedStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-blocked/30 bg-blocked/10 p-6 text-center",
        className,
      )}
    >
      <Lock aria-hidden="true" className="size-6 text-blocked" />
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}
