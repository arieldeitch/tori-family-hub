import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import * as tasksRepo from "@/data/tasksRepo";
import type { TaskInstance, TaskPriority } from "@/domain/task";
import { PRIORITY_LABEL } from "./labels";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskInstance;
}

export function EditTaskDialog({ open, onOpenChange, task }: Props) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState<string>(task.dueAt ? task.dueAt.slice(0, 10) : "");
  const [adultsOnly, setAdultsOnly] = useState<boolean>(!!task.adultsOnly);

  useEffect(() => {
    if (open) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setPriority(task.priority);
      setDueDate(task.dueAt ? task.dueAt.slice(0, 10) : "");
      setAdultsOnly(!!task.adultsOnly);
    }
  }, [open, task]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("כותרת חובה");
      return;
    }
    try {
      tasksRepo.updateManualTask(task.id, {
        title,
        description,
        priority,
        dueAt: dueDate ? new Date(`${dueDate}T09:00:00`).toISOString() : null,
        adultsOnly,
      });
      toast.success("המשימה עודכנה");
      onOpenChange(false);
    } catch (e) {
      // Retain form input on failure.
      toast.error(e instanceof Error ? e.message : "שמירה נכשלה");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>עריכת משימה</DialogTitle>
          <DialogDescription>סטטוס משתנה רק דרך הכפתורים ב"פעולות".</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">כותרת *</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-due">מועד</Label>
              <Input
                id="edit-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-priority">עדיפות</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger id="edit-priority">
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
            <Label htmlFor="edit-desc">תיאור / הערה</Label>
            <Textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="edit-adults" className="cursor-pointer">
              למבוגרים בלבד
            </Label>
            <Switch id="edit-adults" checked={adultsOnly} onCheckedChange={setAdultsOnly} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
            <Button type="submit">שמירה</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
