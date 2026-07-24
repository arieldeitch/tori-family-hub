import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FormFieldProps {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactElement<{
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
    "aria-required"?: boolean;
  }>;
}

/**
 * Wraps a form control with a visible label, optional hint, and error message.
 * Automatically wires id/aria-describedby/aria-invalid to the child input.
 */
export function FormField({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const control = React.cloneElement(children, {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": Boolean(error) || undefined,
    "aria-required": required || undefined,
  });

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-error">
            {" *"}
          </span>
        ) : null}
      </Label>
      {control}
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
