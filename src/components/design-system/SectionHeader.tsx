import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  as?: "h2" | "h3";
}

export function SectionHeader({
  title,
  description,
  actions,
  className,
  as: Heading = "h2",
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 pb-3", className)}>
      <div className="min-w-0">
        <Heading className="text-lg font-semibold text-foreground">{title}</Heading>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
