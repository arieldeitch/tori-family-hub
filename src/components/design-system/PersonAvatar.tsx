import * as React from "react";
import { cn } from "@/lib/utils";
import { toInitials } from "@/domain/household";

export interface PersonAvatarProps {
  name: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE = {
  sm: "size-8 text-xs",
  md: "size-11 text-sm",
  lg: "size-14 text-base",
};

/**
 * Circular avatar. Shows initials on top of the family color so
 * identification never depends on color alone.
 */
export function PersonAvatar({ name, color, size = "md", className }: PersonAvatarProps) {
  const initials = toInitials(name);
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-sm",
        SIZE[size],
        className,
      )}
      style={{ backgroundColor: color ?? "var(--color-muted)" }}
    >
      <span aria-hidden="true">{initials}</span>
    </span>
  );
}
