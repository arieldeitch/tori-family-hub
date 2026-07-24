import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Inbox, ChevronDown, ChevronUp } from "lucide-react";
import type { ShiftRule } from "@/data/shiftsRepo";
import * as shiftsRepo from "@/data/shiftsRepo";
import { useShiftAvailability, useShiftHistory } from "@/lib/useShifts";
import { computePreview } from "./preview";
import { humanFor, formatDate, WEEKDAY_LABEL, type Named } from "./human";
import { WhyChosenPanel } from "./WhyChosenPanel";

interface Props {
  rule: ShiftRule;
  members: ReadonlyArray<Named>;
  count?: number;
}

export function AssignmentPreview({ rule, members, count = 7 }: Props) {
  const availability = useShiftAvailability();
  const history = useShiftHistory(rule.id);
  const [expandedIso, setExpandedIso] = useState<string | null>(null);

  const lastAssigneeIdBefore = useMemo(() => {
    // Deterministically pick the most recent history row's assignee, if any.
    const sorted = [...history].sort((a, b) => (a.occurrenceIso < b.occurrenceIso ? -1 : 1));
    for (let i = sorted.length - 1; i >= 0; i--) {
      const row = sorted[i]!;
      if (row.memberId) return row.memberId;
    }
    return null;
  }, [history]);

  const preview = useMemo(
    () =>
      computePreview({
        rule,
        members,
        availability,
        from: new Date(),
        count,
        lastAssigneeIdBefore,
      }),
    [rule, members, availability, count, lastAssigneeIdBefore],
  );

  if (rule.participantMemberIds.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
          <Inbox className="h-6 w-6" aria-hidden />
          <div className="font-medium text-foreground">אין מועמדים בתצוגה המקדימה</div>
          <div className="text-sm">בחרו משתתפים כדי לראות את ההקצאות הבאות.</div>
        </CardContent>
      </Card>
    );
  }

  const recordDemo = (iso: string, idx: number) => {
    const entry = preview[idx]!;
    shiftsRepo.recordHistory({
      ruleId: rule.id,
      occurrenceIso: iso,
      memberId: entry.result.selectedProfileId,
      reasonCode: entry.result.reasonCode,
      humanExplanation: entry.result.humanExplanation,
      algorithmVersion: entry.result.algorithmVersion,
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        התצוגה המקדימה היא הדגמה בלבד ואינה משנה נתונים היסטוריים.
      </p>
      {preview.map((row, idx) => {
        const line = humanFor(row.result, members);
        const open = expandedIso === row.occurrenceIso;
        return (
          <article
            key={row.occurrenceIso}
            className="rounded-lg border bg-card"
            aria-label={`מופע ${formatDate(row.occurrenceIso)}`}
          >
            <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDate(row.occurrenceIso)}</span>
                  <span aria-hidden>·</span>
                  <span>{WEEKDAY_LABEL[row.weekday]}</span>
                </div>
                <div className="truncate font-medium">{line.headline}</div>
                <div className="truncate text-sm text-muted-foreground">{line.reason}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpandedIso(open ? null : row.occurrenceIso)}
                  aria-expanded={open}
                  aria-controls={`why-${row.occurrenceIso}`}
                >
                  {open ? (
                    <ChevronUp className="h-4 w-4" aria-hidden />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  )}
                  למה?
                </Button>
              </div>
            </header>
            {open && (
              <div id={`why-${row.occurrenceIso}`} className="border-t p-3">
                <WhyChosenPanel result={row.result} members={members} demo />
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => recordDemo(row.occurrenceIso, idx)}
                  >
                    שמור להיסטוריית הדגמה
                  </Button>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
