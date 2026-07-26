// Family Pilot — visible configuration failure (WP5A hosted conversion).
//
// A misconfigured environment must never render a blank page. This screen names
// the missing variables — NAMES ONLY, never values — so the fix is obvious in
// both local development and the hosted preview.
import { AlertTriangle } from "lucide-react";
import type { PilotRuntimeConfigError } from "@/lib/pilot/runtimeConfig";

export interface PilotConfigurationErrorProps {
  configError: PilotRuntimeConfigError;
}

export function PilotConfigurationError({ configError }: PilotConfigurationErrorProps) {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-background px-4 py-10"
    >
      <div className="w-full max-w-md text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold text-foreground">האפליקציה אינה מוגדרת</h1>
        <p className="mt-2 text-sm text-muted-foreground">{configError.message}</p>

        <div className="mt-6 rounded-md border border-input bg-muted/40 p-4 text-start">
          <p className="text-xs font-medium text-muted-foreground">
            משתני הסביבה החסרים או השגויים:
          </p>
          <ul className="mt-2 space-y-1" dir="ltr">
            {configError.missing.map((name) => (
              <li key={name} className="font-mono text-xs text-foreground">
                {name}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          שני הערכים הללו ציבוריים ואינם סודות. מפתח service-role או סיסמה לעולם אינם מוגדרים כמשתני
          דפדפן.
        </p>
      </div>
    </main>
  );
}
