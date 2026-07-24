import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Repeat, CalendarClock, Hand, Sparkles } from "lucide-react";
import * as shiftsRepo from "@/data/shiftsRepo";
import { useShiftRules } from "@/lib/useShifts";
import type { ShiftRule } from "@/data/shiftsRepo";
import { STRATEGY_LABEL } from "./human";

interface Props {
  members: ReadonlyArray<{ id: string; name: string }>;
}

const strategyIcon = {
  fixed_sequence: Repeat,
  weekday_fixed: CalendarClock,
  manual: Hand,
} as const;

export function RuleListScreen({ members }: Props) {
  const rules = useShiftRules();

  return (
    <div className="space-y-4">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">תורנויות</h1>
          <p className="truncate text-sm text-muted-foreground">
            כללי תורנות של המשפחה — הכל בזיכרון (דמו).
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {rules.length === 0 && members.length >= 2 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => shiftsRepo.seedDemo([...members])}
            >
              <Sparkles className="ml-1 h-4 w-4" aria-hidden />
              טעינת דמו
            </Button>
          )}
          <Link to="/shifts/new">
            <Button size="sm">
              <Plus className="ml-1 h-4 w-4" aria-hidden />
              כלל חדש
            </Button>
          </Link>
        </div>
      </header>

      {rules.length === 0 ? (
        <EmptyList hasMembers={members.length >= 2} />
      ) : (
        <ul className="grid gap-2">
          {rules.map((r) => (
            <RuleRow key={r.id} rule={r} members={members} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyList({ hasMembers }: { hasMembers: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
        <Repeat className="h-8 w-8" aria-hidden />
        <div className="font-medium text-foreground">עדיין אין כללי תורנות</div>
        <div className="text-sm">
          {hasMembers
            ? "צרו כלל ראשון כדי להתחיל, או טענו נתוני דמו כדי לראות דוגמה."
            : "כדי ליצור כלל תורנות צריך לפחות שני בני בית."}
        </div>
      </CardContent>
    </Card>
  );
}

function RuleRow({
  rule,
  members,
}: {
  rule: ShiftRule;
  members: ReadonlyArray<{ id: string; name: string }>;
}) {
  const Icon = strategyIcon[rule.strategy];
  const participantNames = rule.participantMemberIds
    .map((id) => members.find((m) => m.id === id)?.name)
    .filter(Boolean)
    .join(", ");
  return (
    <li>
      <Link
        to="/shifts/$ruleId"
        params={{ ruleId: rule.id }}
        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 space-y-0.5">
          <span className="block truncate font-medium">{rule.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {STRATEGY_LABEL[rule.strategy]}
            {participantNames ? ` · ${participantNames}` : " · ללא משתתפים"}
          </span>
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {rule.frequency === "daily" ? "יומי" : "שבועי"}
        </span>
      </Link>
    </li>
  );
}
