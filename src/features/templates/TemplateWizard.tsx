import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import * as templatesRepo from "@/data/templatesRepo";
import {
  describeRule,
  type MissedAction,
  type RecurrenceFrequency,
  type RecurrenceRule,
  type Weekday,
} from "@/domain/recurrence";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const WEEKDAYS: Array<{ v: Weekday; label: string }> = [
  { v: 0, label: "א" },
  { v: 1, label: "ב" },
  { v: 2, label: "ג" },
  { v: 3, label: "ד" },
  { v: 4, label: "ה" },
  { v: 5, label: "ו" },
  { v: 6, label: "ש" },
];

const MEMBERS = [
  { id: "m_owner", name: "אמא" },
  { id: "m_adult", name: "אבא" },
  { id: "m_child", name: "יעל (ילדה)" },
];

const MISSED: Array<{ v: MissedAction; label: string }> = [
  { v: "nothing", label: "לא לעשות כלום" },
  { v: "skip", label: "לדלג" },
  { v: "reschedule_next", label: "לתזמן למועד הבא" },
  { v: "escalate", label: "להעביר לתשומת לב מבוגר" },
];

export function TemplateWizard({ open, onOpenChange }: Props) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("weekly");
  const [interval, setInterval] = useState(1);
  const [byWeekday, setByWeekday] = useState<Weekday[]>([1, 3, 5]);
  const [timeOfDay, setTimeOfDay] = useState("07:30");
  const [participants, setParticipants] = useState<string[]>([]);
  const [missedAction, setMissedAction] = useState<MissedAction>("nothing");

  const rule: RecurrenceRule = useMemo(
    () => ({
      frequency,
      interval,
      byWeekday: frequency === "weekly" ? byWeekday : undefined,
      timeOfDay,
    }),
    [frequency, interval, byWeekday, timeOfDay],
  );
  const human = describeRule(rule);

  const reset = () => {
    setStep(0);
    setTitle("");
    setDescription("");
    setFrequency("weekly");
    setInterval(1);
    setByWeekday([1, 3, 5]);
    setTimeOfDay("07:30");
    setParticipants([]);
    setMissedAction("nothing");
  };

  const save = () => {
    if (!title.trim()) {
      toast.error("יש להזין שם משימה");
      setStep(0);
      return;
    }
    try {
      templatesRepo.createTemplate({
        title,
        description,
        recurrence: rule,
        participantMemberIds: participants,
        missedAction,
      });
      toast.success("התבנית נוצרה");
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה בשמירה");
    }
  };

  const toggleDay = (d: Weekday) =>
    setByWeekday((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  const toggleMember = (id: string) =>
    setParticipants((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const steps = ["מה המשימה", "מתי", "מי משתתף", "אם לא בוצעה", "סיכום"];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            תבנית חדשה — שלב {step + 1}/{steps.length}: {steps[step]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {step === 0 && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="tpl-title">שם המשימה</Label>
                <Input
                  id="tpl-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="למשל: הכנת תיק לבית ספר"
                />
              </div>
              <div>
                <Label htmlFor="tpl-desc">תיאור (אופציונלי)</Label>
                <Textarea
                  id="tpl-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label>תדירות</Label>
                  <Select
                    value={frequency}
                    onValueChange={(v) => setFrequency(v as RecurrenceFrequency)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">יומי</SelectItem>
                      <SelectItem value="weekly">שבועי</SelectItem>
                      <SelectItem value="monthly">חודשי</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Label>כל</Label>
                  <Input
                    type="number"
                    min={1}
                    value={interval}
                    onChange={(e) => setInterval(Math.max(1, Number(e.target.value)))}
                  />
                </div>
                <div className="w-28">
                  <Label>בשעה</Label>
                  <Input
                    type="time"
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(e.target.value)}
                  />
                </div>
              </div>
              {frequency === "weekly" && (
                <div>
                  <Label className="block mb-2">בימים</Label>
                  <div className="flex gap-1">
                    {WEEKDAYS.map((d) => (
                      <Button
                        key={d.v}
                        type="button"
                        variant={byWeekday.includes(d.v) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleDay(d.v)}
                        className="min-w-11"
                      >
                        {d.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <Card className="p-3 text-sm bg-muted/40">תצוגה מקדימה: {human}</Card>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <Label className="block">מי משתתף?</Label>
              {MEMBERS.map((m) => (
                <label key={m.id} className="flex items-center gap-2 py-1">
                  <Checkbox
                    checked={participants.includes(m.id)}
                    onCheckedChange={() => toggleMember(m.id)}
                  />
                  <span>{m.name}</span>
                </label>
              ))}
            </div>
          )}

          {step === 3 && (
            <div>
              <Label>אם לא בוצעה</Label>
              <Select
                value={missedAction}
                onValueChange={(v) => setMissedAction(v as MissedAction)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MISSED.map((m) => (
                    <SelectItem key={m.v} value={m.v}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {step === 4 && (
            <Card className="p-4 space-y-2 text-sm">
              <div>
                <strong>משימה:</strong> {title || <em>(ללא שם)</em>}
              </div>
              {description && (
                <div>
                  <strong>תיאור:</strong> {description}
                </div>
              )}
              <div>
                <strong>כלל:</strong> {human}
              </div>
              <div>
                <strong>משתתפים:</strong>{" "}
                {participants.length
                  ? MEMBERS.filter((m) => participants.includes(m.id))
                      .map((m) => m.name)
                      .join(", ")
                  : "—"}
              </div>
              <div>
                <strong>אם לא בוצעה:</strong> {MISSED.find((m) => m.v === missedAction)?.label}
              </div>
            </Card>
          )}
        </div>

        <DialogFooter className="flex justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            חזרה
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>הבא</Button>
          ) : (
            <Button onClick={save}>שמור תבנית</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
