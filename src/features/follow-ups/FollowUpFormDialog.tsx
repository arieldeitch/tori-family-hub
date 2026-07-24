import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ALL_STATUSES,
  ALL_BALL_HOLDERS,
  validateFollowUp,
  type FollowUpCase,
  type FollowUpStatus,
  type BallHolder,
  type Sensitivity,
} from "@/domain/followUp";
import {
  STATUS_LABEL,
  BALL_HOLDER_LABEL,
  SENSITIVITY_LABEL,
  toDateInputValue,
  fromDateInputValue,
} from "./labels";

export interface FollowUpFormValues {
  title: string;
  responsibleMemberId: string;
  externalParty: string;
  ballHolder: BallHolder;
  status: FollowUpStatus;
  nextFollowUpAt?: string;
  followUpDisabledReason?: string;
  targetDate?: string;
  possibleAmount?: number;
  sensitivity: Sensitivity;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initial?: Partial<FollowUpFormValues> & Pick<FollowUpCase, "id"> extends never
    ? never
    : Partial<FollowUpFormValues>;
  members: ReadonlyArray<{ id: string; name: string }>;
  onSubmit: (values: FollowUpFormValues) => void;
  submitLabel?: string;
}

export function FollowUpFormDialog({
  open,
  onOpenChange,
  title,
  initial,
  members,
  onSubmit,
  submitLabel = "שמור",
}: Props) {
  const [values, setValues] = useState<FollowUpFormValues>(() => ({
    title: initial?.title ?? "",
    responsibleMemberId: initial?.responsibleMemberId ?? members[0]?.id ?? "",
    externalParty: initial?.externalParty ?? "",
    ballHolder: initial?.ballHolder ?? "us",
    status: initial?.status ?? "action_required",
    nextFollowUpAt: initial?.nextFollowUpAt,
    followUpDisabledReason: initial?.followUpDisabledReason,
    targetDate: initial?.targetDate,
    possibleAmount: initial?.possibleAmount,
    sensitivity: initial?.sensitivity ?? "household",
  }));

  const errors = useMemo(() => validateFollowUp(values), [values]);
  const errorFor = (field: string) =>
    errors.find((e) => e.field === field)?.message;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (errors.length > 0) return;
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            נושאים שנסחבים מול גורמים חיצוניים — בנק, ביטוח, עירייה, אחריות ועוד.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="fu-title">כותרת</Label>
            <Input
              id="fu-title"
              value={values.title}
              onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
              maxLength={140}
              required
            />
            {errorFor("title") && (
              <p className="text-xs text-destructive">{errorFor("title")}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>אחראי</Label>
              <Select
                value={values.responsibleMemberId}
                onValueChange={(v) =>
                  setValues((s) => ({ ...s, responsibleMemberId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר/י אחראי" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errorFor("responsibleMemberId") && (
                <p className="text-xs text-destructive">
                  {errorFor("responsibleMemberId")}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="fu-ext">גורם חיצוני</Label>
              <Input
                id="fu-ext"
                value={values.externalParty}
                onChange={(e) =>
                  setValues((s) => ({ ...s, externalParty: e.target.value }))
                }
                placeholder="למשל: בנק דיסקונט"
                maxLength={140}
              />
              {errorFor("externalParty") && (
                <p className="text-xs text-destructive">
                  {errorFor("externalParty")}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>מי מחזיק בכדור</Label>
              <Select
                value={values.ballHolder}
                onValueChange={(v) =>
                  setValues((s) => ({ ...s, ballHolder: v as BallHolder }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_BALL_HOLDERS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {BALL_HOLDER_LABEL[b]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>סטטוס</Label>
              <Select
                value={values.status}
                onValueChange={(v) =>
                  setValues((s) => ({ ...s, status: v as FollowUpStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_STATUSES.map((st) => (
                    <SelectItem key={st} value={st}>
                      {STATUS_LABEL[st]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {values.status === "waiting_external" && (
            <Alert>
              <AlertDescription>
                במצב <b>ממתין לגורם חיצוני</b> חובה למלא תאריך מעקב הבא, או לציין
                סיבה מפורשת לביטול התזכורת.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="fu-next">תאריך מעקב הבא</Label>
              <Input
                id="fu-next"
                type="date"
                value={toDateInputValue(values.nextFollowUpAt)}
                onChange={(e) =>
                  setValues((s) => ({
                    ...s,
                    nextFollowUpAt: fromDateInputValue(e.target.value),
                  }))
                }
              />
              {errorFor("nextFollowUpAt") && (
                <p className="text-xs text-destructive">
                  {errorFor("nextFollowUpAt")}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="fu-target">תאריך יעד (אופציונלי)</Label>
              <Input
                id="fu-target"
                type="date"
                value={toDateInputValue(values.targetDate)}
                onChange={(e) =>
                  setValues((s) => ({
                    ...s,
                    targetDate: fromDateInputValue(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="fu-reason">סיבה לביטול תזכורת (אם אין תאריך)</Label>
            <Textarea
              id="fu-reason"
              value={values.followUpDisabledReason ?? ""}
              onChange={(e) =>
                setValues((s) => ({
                  ...s,
                  followUpDisabledReason: e.target.value || undefined,
                }))
              }
              rows={2}
              maxLength={280}
              placeholder="למשל: ממתין להחלטה משפחתית"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="fu-amount">סכום אפשרי (אופציונלי)</Label>
              <Input
                id="fu-amount"
                type="number"
                inputMode="numeric"
                min={0}
                value={values.possibleAmount ?? ""}
                onChange={(e) =>
                  setValues((s) => ({
                    ...s,
                    possibleAmount: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>רגישות</Label>
              <Select
                value={values.sensitivity}
                onValueChange={(v) =>
                  setValues((s) => ({ ...s, sensitivity: v as Sensitivity }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["household", "adults_only", "restricted"] as const).map(
                    (s) => (
                      <SelectItem key={s} value={s}>
                        {SENSITIVITY_LABEL[s]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                אכיפה אמיתית תבוצע ב־RLS ובשרת. כרגע UX בלבד.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              ביטול
            </Button>
            <Button type="submit" disabled={errors.length > 0}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
