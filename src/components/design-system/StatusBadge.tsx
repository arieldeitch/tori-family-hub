import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusKind =
  | "neutral"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "overdue"
  | "blocked";

const STYLES: Record<StatusKind, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success/15 text-success-foreground border-success/40",
  warning: "bg-warning/20 text-warning-foreground border-warning/40",
  error: "bg-error/15 text-error border-error/40",
  info: "bg-info/15 text-info border-info/40",
  overdue: "bg-overdue/15 text-overdue border-overdue/40",
  blocked: "bg-blocked/15 text-blocked border-blocked/40",
};

// Non-color redundancy: every status carries a leading glyph so information
// is never conveyed by color alone (WCAG 1.4.1).
const GLYPH: Record<StatusKind, string> = {
  neutral: "•",
  success: "✓",
  warning: "!",
  error: "✕",
  info: "i",
  overdue: "⏱",
  blocked: "⛔",
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  kind: StatusKind;
  /** Text label — required so the badge is not color-only. */
  children: React.ReactNode;
}

export function StatusBadge({ kind, className, children, ...rest }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        STYLES[kind],
        className,
      )}
      {...rest}
    >
      <span aria-hidden="true" className="font-bold">
        {GLYPH[kind]}
      </span>
      <span>{children}</span>
    </span>
  );
}
