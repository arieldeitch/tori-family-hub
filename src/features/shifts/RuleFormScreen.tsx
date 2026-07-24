import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Save, Trash2 } from "lucide-react";
import * as shiftsRepo from "@/data/shiftsRepo";
import type { ShiftRule } from "@/data/shiftsRepo";
import type { FallbackStrategy, ShiftStrategy, Weekday } from "@/domain/shifts";
import { ParticipantsEditor } from "./ParticipantsEditor";
import { SequenceEditor } from "./SequenceEditor";
import { WeekdayFixedEditor } from "./WeekdayFixedEditor";
import { AvailabilityEditor } from "./AvailabilityEditor";
import { AssignmentPreview } from "./AssignmentPreview";
import { HistoryDemo } from "./HistoryDemo";
import { STRATEGY_LABEL, WEEKDAY_LABEL } from "./human";

interface Props {
  rule?: ShiftRule;
  members: ReadonlyArray<{ id: string; name: string }>;
}

interface FormState {
  name: string;
  strategy: ShiftStrategy;
  participantMemberIds: string[];
  sequence: string[];
  weekday: Partial<Record<Weekday, string>>;
  avoidConsecutive: boolean;
  fallback: FallbackStrategy;
  frequency: "daily" | "weekly";
  weeklyOn: Weekday;
}

function initial(rule?: ShiftRule): FormState {
  return {
    name: rule?.name ?? "",
    strategy: rule?.strategy ?? "fixed_sequence",
    participantMemberIds: rule?.participantMemberIds ? [...rule.participantMemberIds] : [],
    sequence: rule?.sequence ? [...rule.sequence] : [],
    weekday: rule?.weekday ? { ...rule.weekday } : {},
    avoidConsecutive: rule?.avoidConsecutive ?? false,
    fallback: rule?.fallback ?? "unassigned",
    frequency: rule?.frequency ?? "daily",
    weeklyOn: (rule?.weeklyOn ?? 0) as Weekday,
  };
}

export function RuleFormScreen({ rule, members }: Props) {
  const isEdit = !!rule;
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(() => initial(rule));
  const [error, setError] = useState<string | null>(null);

  const patch = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onParticipantsChange = (ids: string[]) => {
    // keep sequence in sync: drop removed, append newly added.
    const filteredSeq = form.sequence.filter((id) => ids.includes(id));
    const missing = ids.filter((id) => !filteredSeq.includes(id));
    const nextWeekday: Partial<Record<Weekday, string>> = {};
    for (const [k, v] of Object.entries(form.weekday)) {
      if (v && ids.includes(v)) nextWeekday[Number(k) as Weekday] = v;
    }
    setForm((f) => ({
      ...f,
      participantMemberIds: ids,
      sequence: [...filteredSeq, ...missing],
      weekday: nextWeekday,
    }));
  };

  // Snapshot rule for preview so it reflects the in-progress form values
  // WITHOUT persisting to the repo. Preview never mutates.
  const previewRule: ShiftRule = useMemo(
    () => ({
      id: rule?.id ?? "__preview__",
      name: form.name || "(ללא שם)",
      strategy: form.strategy,
      participantMemberIds: form.participantMemberIds,
      sequence: form.strategy === "fixed_sequence" ? form.sequence : undefined,
      weekday: form.strategy === "weekday_fixed" ? form.weekday : undefined,
      avoidConsecutive: form.avoidConsecutive,
      fallback: form.fallback,
      frequency: form.frequency,
      weeklyOn: form.frequency === "weekly" ? form.weeklyOn : undefined,
      createdAt: rule?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [form, rule],
  );

  const save = () => {
    setError(null);
    try {
      if (!form.name.trim()) throw new Error("שם התורנות חובה");
      if (form.strategy === "fixed_sequence" && form.sequence.length === 0) {
        throw new Error("סבב קבוע דורש לפחות משתתף אחד בסדר.");
      }
      const payload = {
        name: form.name,
        strategy: form.strategy,
        participantMemberIds: form.participantMemberIds,
        sequence: form.strategy === "fixed_sequence" ? form.sequence : undefined,
        weekday: form.strategy === "weekday_fixed" ? form.weekday : undefined,
        avoidConsecutive: form.avoidConsecutive,
        fallback: form.fallback,
        frequency: form.frequency,
        weeklyOn: form.frequency === "weekly" ? form.weeklyOn : undefined,
      };
      if (isEdit && rule) {
        shiftsRepo.updateRule(rule.id, payload);
        toast.success("הכלל עודכן");
      } else {
        const created = shiftsRepo.createRule(payload);
        toast.success("הכלל נוצר");
        void navigate({ to: "/shifts/$ruleId", params: { ruleId: created.id } });
        return;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "שגיאה לא צפויה";
      setError(msg);
    }
  };

  const remove = () => {
    if (!rule) return;
    shiftsRepo.deleteRule(rule.id);
    toast.success("הכלל נמחק");
    void navigate({ to: "/shifts" });
  };

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">
          {isEdit ? "עריכת כלל תורנות" : "כלל תורנות חדש"}
        </h1>
        <p className="text-sm text-muted-foreground">
          הגדרות שנשמרות כאן הן דמו בלבד ואינן נשמרות בין רענונים.
        </p>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">פרטי כלל</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="rule-name">שם התורנות</Label>
            <Input
              id="rule-name"
              value={form.name}
              onChange={(e) => patch("name", e.target.value)}
              placeholder="לדוגמה: פינוי אשפה"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rule-strategy">אסטרטגיה</Label>
              <Select
                value={form.strategy}
                onValueChange={(v) => patch("strategy", v as ShiftStrategy)}
              >
                <SelectTrigger id="rule-strategy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_sequence">
                    {STRATEGY_LABEL.fixed_sequence}
                  </SelectItem>
                  <SelectItem value="weekday_fixed">
                    {STRATEGY_LABEL.weekday_fixed}
                  </SelectItem>
                  <SelectItem value="manual">{STRATEGY_LABEL.manual}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rule-frequency">מקצב</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => patch("frequency", v as "daily" | "weekly")}
              >
                <SelectTrigger id="rule-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">יומי</SelectItem>
                  <SelectItem value="weekly">שבועי</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.frequency === "weekly" && (
            <div className="space-y-1.5">
              <Label htmlFor="rule-weeklyOn">יום בשבוע</Label>
              <Select
                value={String(form.weeklyOn)}
                onValueChange={(v) => patch("weeklyOn", Number(v) as Weekday)}
              >
                <SelectTrigger id="rule-weeklyOn">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {WEEKDAY_LABEL[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">משתתפים</CardTitle>
        </CardHeader>
        <CardContent>
          <ParticipantsEditor
            selected={form.participantMemberIds}
            members={members}
            onChange={onParticipantsChange}
          />
        </CardContent>
      </Card>

      {form.strategy === "fixed_sequence" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">סדר בסבב</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SequenceEditor
              order={form.sequence}
              members={members}
              onChange={(next) => patch("sequence", next)}
            />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                id="avoid-consecutive"
                checked={form.avoidConsecutive}
                onCheckedChange={(v) => patch("avoidConsecutive", v === true)}
              />
              הימנעות מרצף — לא לבחור את אותו אדם פעמיים ברצף כשיש חלופה זמינה
            </label>
          </CardContent>
        </Card>
      )}

      {form.strategy === "weekday_fixed" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">שיבוץ קבוע לפי יום</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <WeekdayFixedEditor
              value={form.weekday}
              participantMemberIds={form.participantMemberIds}
              members={members}
              onChange={(next) => patch("weekday", next)}
            />
            <div className="space-y-1.5">
              <Label htmlFor="rule-fallback">מה עושים אם המשובץ לא זמין?</Label>
              <Select
                value={form.fallback}
                onValueChange={(v) => patch("fallback", v as FallbackStrategy)}
              >
                <SelectTrigger id="rule-fallback">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">להשאיר ללא שיבוץ (שיבוץ ידני)</SelectItem>
                  <SelectItem value="next_available_in_sequence">
                    לעבור לפי סבב מבין המשתתפים
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">זמינות בסיסית</CardTitle>
        </CardHeader>
        <CardContent>
          <AvailabilityEditor
            participantMemberIds={form.participantMemberIds}
            members={members}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">תצוגה מקדימה של הקצאות</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignmentPreview rule={previewRule} members={members} count={7} />
        </CardContent>
      </Card>

      {isEdit && rule && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">היסטוריה (הדגמה)</CardTitle>
          </CardHeader>
          <CardContent>
            <HistoryDemo ruleId={rule.id} members={members} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:justify-between">
        <div className="text-xs text-muted-foreground">
          אין שמירה אמיתית — הכל נשמר בזיכרון בדפדפן בלבד.
        </div>
        <div className="flex shrink-0 gap-2">
          {isEdit && rule && (
            <Button type="button" variant="ghost" onClick={remove}>
              <Trash2 className="ml-1 h-4 w-4" aria-hidden />
              מחיקה
            </Button>
          )}
          <Button type="button" onClick={save}>
            <Save className="ml-1 h-4 w-4" aria-hidden />
            {isEdit ? "שמירת שינויים" : "יצירת כלל"}
          </Button>
        </div>
      </div>
    </div>
  );
}
