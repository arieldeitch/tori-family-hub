import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { History } from "lucide-react";
import { useShiftHistory } from "@/lib/useShifts";
import { formatDate, type Named } from "./human";

interface Props {
  ruleId: string;
  members: ReadonlyArray<Named>;
}

export function HistoryDemo({ ruleId, members }: Props) {
  const rows = useShiftHistory(ruleId);
  const sorted = useMemo(
    () => [...rows].sort((a, b) => (a.occurrenceIso < b.occurrenceIso ? 1 : -1)),
    [rows],
  );
  const nameOf = (id: string | null) => (id ? (members.find((m) => m.id === id)?.name ?? id) : "—");

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
          <History className="h-5 w-5" aria-hidden />
          <div className="text-sm">אין עדיין רשומות היסטוריה להדגמה.</div>
          <div className="text-xs">אפשר לשמור מופע מהתצוגה המקדימה כדי להוסיף רשומה.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ol className="space-y-2">
      {sorted.map((h) => (
        <li
          key={h.id}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-lg border bg-card p-3"
        >
          <div className="min-w-0 space-y-0.5">
            <div className="text-xs text-muted-foreground">{formatDate(h.occurrenceIso)}</div>
            <div className="truncate font-medium">
              {h.memberId ? `הוקצה ל${nameOf(h.memberId)}` : "לא הוקצה"}
            </div>
            <div className="truncate text-sm text-muted-foreground">{h.humanExplanation}</div>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            הדגמה
          </span>
        </li>
      ))}
    </ol>
  );
}
