import { useState } from "react";
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
import { ChevronDown, ChevronUp } from "lucide-react";
import * as tasksRepo from "@/data/tasksRepo";
import { toast } from "sonner";
import { PRIORITY_LABEL } from "./labels";
import type { TaskPriority } from "@/domain/task";
import { AssignmentPicker } from "./AssignmentPicker";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: ReadonlyArray<{ id: string; name: string }>;
  currentActorId: string;
}

interface FormState {
  title: string;
  assigneeId: string | null;
  dueDate: string;
  priority: TaskPriority;
  note: string;
  adultsOnly: boolean;
}

const initial: FormState = {
  title: "",
  assigneeId: null,
  dueDate: "",
  priority: "normal",
  note: "",
  adultsOnly: false,
};

export function QuickTaskForm({ open, onOpenChange, members, currentActorId }: Props) {
  const [form, setForm] = useState<FormState>(initial);
  const [showAdvanced, setShowAdvanced] = useState(false);

  function reset() {
    setForm(initial);
    setShowAdvanced(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("יש להזין כותרת למשימה");
      return;
    }
    try {
      const dueAt = form.dueDate ? new Date(`${form.dueDate}T09:00:00`).toISOString() : null;
      const task = tasksRepo.createManualTask({
        title: form.title,
        assigneeMemberId: form.assigneeId,
        assignedByMemberId: currentActorId,
        dueAt,
        priority: form.priority,
        note: form.note,
        adultsOnly: form.adultsOnly,
        createdByMemberId: currentActorId,
      });
      // Success only after repository update — see rule in prompt.
      toast.success("המשימה נוצרה");
      reset();
      onOpenChange(false);
      void task;
    } catch (e) {
      // Retain input on failure.
      const msg = e instanceof Error ? e.message : "אירעה שגיאה בשמירה";
      toast.error(msg);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(true) : (onOpenChange(false), reset()))}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>משימה חדשה</DialogTitle>
          <DialogDescription>
            מלא/י את השדות המרכזיים. ניתן להוסיף אחראי ומועד גם מאוחר יותר.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">כותרת *</Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="למשל: לרשום לחוג ציור"
              required
              autoFocus
            />
          </div>

          <AssignmentPicker
            id="quick-assignee"
            value={form.assigneeId}
            onChange={(v) => setForm((f) => ({ ...f, assigneeId: v }))}
            members={members}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-due">מועד</Label>
              <Input
                id="task-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-priority">עדיפות</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm((f) => ({ ...f, priority: v as TaskPriority }))}
              >
                <SelectTrigger id="task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["low", "normal", "high", "urgent"] as const).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-note">הערה</Label>
            <Textarea
              id="task-note"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="פרטים נוספים או תזכורת קצרה"
              rows={2}
            />
          </div>

          <button
            type="button"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setShowAdvanced((s) => !s)}
          >
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            אפשרויות נוספות
          </button>

          {showAdvanced && (
            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="task-adults" className="cursor-pointer">
                  למבוגרים בלבד
                </Label>
                <Switch
                  id="task-adults"
                  checked={form.adultsOnly}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, adultsOnly: v }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                משימה זו לא תוצג בתצוגת ילדים. (הסתרה בממשק בלבד — האכיפה בפועל תגיע עם השרת.)
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              ביטול
            </Button>
            <Button type="submit">יצירה</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
