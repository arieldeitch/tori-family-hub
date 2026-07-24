import * as React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./IconButton";

export interface MobilePageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
  trailing?: React.ReactNode;
  className?: string;
}

/**
 * Sticky mobile-first page header. Back arrow points to the trailing edge
 * (right side in RTL) via lucide's ArrowRight, which visually points to the
 * previous page in an RTL context.
 */
export function MobilePageHeader({
  title,
  subtitle,
  onBack,
  backLabel = "חזרה",
  trailing,
  className,
}: MobilePageHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/90 px-3 py-2 backdrop-blur",
        className,
      )}
    >
      {onBack ? (
        <IconButton aria-label={backLabel} icon={<ArrowRight />} onClick={onBack} />
      ) : (
        <span className="min-w-11" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1 text-center">
        <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="flex min-w-11 shrink-0 items-center justify-end">{trailing}</div>
    </header>
  );
}
