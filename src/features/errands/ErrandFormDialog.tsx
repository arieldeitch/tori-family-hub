import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import * as errandsRepo from "@/data/errandsRepo";
import * as tasksRepo from "@/data/tasksRepo";
import type { Errand } from "@/domain/errand";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: ReadonlyArray<{ id: string; name: string }>;
  currentActorId: string;
  /** When set — edit mode. */
  errand?: Errand;
  onSaved?: (e: Errand) => void;
}

const UNASSIGNED = "__unassigned__";
const NO_LINK = "__nolink__";

export function ErrandFormDialog({
  open,
  onOpenChange,
  members,
  currentActorId,
  errand,
  onSaved,
}: Props) {
  const isEdit = !!errand;
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [areaLabel, setAreaLabel] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>(UNASSIGNED);
  const [dueDate, setDueDate] = useState("");
  const [canDoWhenNearby, setCanDoWhenNearby] = useState(false);
  const [linkedTaskId, setLinkedTaskId] = useState<string>(NO_LINK);
  const [note, setNote] = useState("");

  const openTasks = tasksRepo
    .getAll()
    .filter((t) => t.status !== "done" && t.status !== "cancelled" && t.status !== "skipped");

  useEffect(() => {
    if (!open) return;
    if (errand) {
      setTitle(errand.title);
      setLocation(errand.location);
      setAreaLabel(errand.areaLabel);
      setAssigneeId(errand.assignment?.memberId ?? UNASSIGNED);
      setDueDate(errand.dueAt ? errand.dueAt.slice(0, 16) : "");
      setCanDoWhenNearby(errand.canDoWhenNearby);
      setLinkedTaskId(errand.linkedTaskInstanceId ?? NO_LINK);
      setNote(errand.note ?? "");
    } else {
      setTitle("");
      setLocation("");
      setAreaLabel("");
      setAssigneeId(UNASSIGNED);
      setDueDate("");
      setCanDoWhenNearby(false);
      setLinkedTaskId(NO_LINK);
      setNote("");
    }
  }, [open, errand]);

  const submit = () => {
    try {
      const dueAt = dueDate ? new Date(dueDate).toISOString() : null;
      const assigneeMemberId = assigneeId === UNASSIGNED ? null : assigneeId;
      const linkedTaskInstanceId = linkedTaskId === NO_LINK ? undefined : linkedTaskId;

      const saved = isEdit
        ? errandsRepo.updateErrand(errand!.id, {
            title,
            location,
            areaLabel,
            assigneeMemberId,
            actorMemberId: currentActorId,
            dueAt,
            canDoWhenNearby,
            linkedTaskInstanceId: linkedTaskInstanceId ?? null,
            note,
          })
        : errandsRepo.createErrand({
            title,
            location,
            areaLabel,
            assigneeMemberId,
            dueAt,
            canDoWhenNearby,
            linkedTaskInstanceId,
            note,
            createdByMemberId: currentActorId,
          });
      toast.success(isEdit ? "הסידור עודכן" : "הסידור נוצר");
      onOpenChange(false);
      onSaved?.(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="text-start">
          <DialogTitle>{isEdit ? "עריכת סידור" : "סידור חדש"}</DialogTitle>
          <DialogDescription>
            סידור הוא משימה הקשורה למיקום או ליציאה. מיקום הוא טקסט חופשי — ללא מפות או מעקב.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="err-title">כותרת</Label>
            <Input
              id="err-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="למשל: איסוף חבילה מהדואר"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="err-location">מיקום (טקסט חופשי)</Label>
              <Input
                id="err-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="למשל: סניף דואר, הרצל 12"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="err-area">אזור לקיבוץ</Label>
              <Input
                id="err-area"
                value={areaLabel}
                onChange={(e) => setAreaLabel(e.target.value)}
                placeholder="למשל: מרכז / צפון"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>אחראי</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>ללא אחראי</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="err-due">תאריך יעד</Label>
              <Input
                id="err-due"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>קישור למשימה קיימת (אופציונלי)</Label>
            <Select value={linkedTaskId} onValueChange={setLinkedTaskId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_LINK}>ללא קישור</SelectItem>
                {openTasks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="min-w-0 space-y-0.5">
              <div className="text-sm font-medium">אפשר לבצע כשמישהו נמצא באזור</div>
              <div className="text-xs text-muted-foreground">
                מידע בלבד. המערכת לא יודעת בפועל מי נמצא היכן.
              </div>
            </div>
            <Switch checked={canDoWhenNearby} onCheckedChange={setCanDoWhenNearby} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="err-note">הערה</Label>
            <Textarea
              id="err-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button onClick={submit} disabled={!title.trim()}>
            {isEdit ? "שמור שינויים" : "צור סידור"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
