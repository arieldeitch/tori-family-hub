import * as React from "react";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "./PersonAvatar";

export interface FamilyMemberChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  color?: string;
  /** Optional short role suffix, e.g. "אמא" */
  role?: string;
}

/**
 * Compact family-member chip: avatar + name (+ optional role).
 * The color is redundant with the name text — no color-only meaning.
 */
export function FamilyMemberChip({
  name,
  color,
  role,
  className,
  ...rest
}: FamilyMemberChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-surface py-1 ps-1 pe-3 text-sm",
        className,
      )}
      {...rest}
    >
      <PersonAvatar name={name} color={color} size="sm" />
      <span className="font-medium text-foreground">{name}</span>
      {role ? <span className="text-xs text-muted-foreground">· {role}</span> : null}
    </span>
  );
}
