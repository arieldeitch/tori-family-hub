// Shown when this build is newer than the backend it is talking to.
//
// The repository carries WP5B/WP5C; applying them to the hosted project is a
// separate approval-gated step. Between those two moments the app is simply
// ahead of its database — which is a known, temporary, expected state, and the
// family must not be shown an error for it. Errors imply something is broken and
// invite retrying; nothing here is broken and no amount of retrying helps.
//
// So: calm, factual, and honest about what happens next. Never the offline
// screen (ADR-042), because the network is fine.
import { Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PilotUpgradePendingStateProps {
  /** Re-probes the backend. The real weekly view appears the moment it lands. */
  onCheckAgain: () => void;
  checking?: boolean;
}

export function PilotUpgradePendingState({
  onCheckAgain,
  checking = false,
}: PilotUpgradePendingStateProps) {
  return (
    <section
      dir="rtl"
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-border bg-card p-6 text-center"
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Database className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>

      <h2 className="text-lg font-semibold text-foreground">שדרוג הפיילוט ממתין</h2>

      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        תצוגת המטלות השבועית מוכנה באפליקציה, אך טבלאות המטלות עדיין לא הוקמו בשרת. זו אינה תקלה
        ואין צורך לעשות דבר — הכל ימשיך לעבוד כרגיל עד שהשדרוג יורץ.
      </p>

      <p className="mx-auto mt-3 max-w-sm text-xs text-muted-foreground">
        ברגע שהשדרוג יבוצע, התצוגה השבועית תופיע כאן מעצמה. אין צורך בעדכון נוסף של האפליקציה.
      </p>

      <Button
        variant="outline"
        className="mt-5 min-h-11"
        onClick={onCheckAgain}
        disabled={checking}
      >
        <RefreshCw
          className={`me-1.5 h-4 w-4${checking ? " animate-spin" : ""}`}
          aria-hidden="true"
        />
        {checking ? "בודק…" : "בדקו שוב"}
      </Button>
    </section>
  );
}
