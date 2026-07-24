import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface IconButtonProps extends Omit<ButtonProps, "size" | "children"> {
  /** Required accessible name. Icon-only buttons must expose their purpose to AT. */
  "aria-label": string;
  icon: React.ReactNode;
  /** Ensures 44x44 minimum tap target regardless of visual size. */
  tone?: "default" | "muted";
}

/**
 * Icon-only button. Enforces:
 *  - accessible name via aria-label (TS-required)
 *  - 44x44 minimum tap target
 *  - focus-visible ring from tokens
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, className, variant = "ghost", tone = "default", ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size="icon"
        className={cn(
          "min-h-11 min-w-11",
          tone === "muted" && "text-muted-foreground",
          className,
        )}
        {...props}
      >
        <span aria-hidden="true">{icon}</span>
      </Button>
    );
  },
);
IconButton.displayName = "IconButton";
