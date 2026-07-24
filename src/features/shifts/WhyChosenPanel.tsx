import type { EngineResult } from "@/domain/shifts";
import type { Named } from "./human";
import { humanFor } from "./human";
import { AlertTriangle, Info } from "lucide-react";

interface Props {
  result: EngineResult;
  members: ReadonlyArray<Named>;
  /** When true, adds a small "הדגמה" chip next to the headline. */
  demo?: boolean;
}

/**
 * "Why was this person chosen?" panel. Primary view = human line + warnings.
 * Advanced details (algorithmVersion, candidateSnapshot) are collapsed inside
 * a <details> so they don't dominate the UI.
 */
export function WhyChosenPanel({ result, members, demo }: Props) {
  const line = humanFor(result, members);
  return (
    <section className="space-y-3 rounded-lg border bg-card p-3">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">{line.headline}</h3>
          {demo && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              הדגמה
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{line.reason}</p>
      </header>

      {result.warnings.length > 0 && (
        <ul className="space-y-1">
          {result.warnings.map((w) => (
            <li
              key={w.code + w.message}
              className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-sm"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              <span className="min-w-0">
                <span className="font-medium">{w.code}</span>
                <span className="mr-1 text-muted-foreground"> — {w.message}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <details className="rounded-md bg-muted/30 p-2 text-xs">
        <summary className="flex cursor-pointer items-center gap-1.5 text-muted-foreground">
          <Info className="h-3.5 w-3.5" aria-hidden />
          פרטים מתקדמים (טכני)
        </summary>
        <dl className="mt-2 grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-1">
          <dt className="text-muted-foreground">reasonCode</dt>
          <dd className="font-mono">{result.reasonCode}</dd>
          <dt className="text-muted-foreground">algorithmVersion</dt>
          <dd className="font-mono">{result.algorithmVersion}</dd>
          <dt className="text-muted-foreground">selectedProfileId</dt>
          <dd className="font-mono">{result.selectedProfileId ?? "null"}</dd>
        </dl>
        <div className="mt-2">
          <div className="mb-1 text-muted-foreground">candidateSnapshot</div>
          <ul className="space-y-1">
            {result.candidateSnapshot.map((c) => (
              <li key={c.memberId} className="grid grid-cols-4 gap-1 font-mono">
                <span className="truncate">{c.memberId}</span>
                <span>eligible: {String(c.eligible)}</span>
                <span>available: {String(c.available)}</span>
                <span>seq: {c.sequenceIndex ?? "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </section>
  );
}
