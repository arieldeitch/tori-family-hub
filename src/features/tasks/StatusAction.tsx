import { Button } from "@/components/ui/button";
import {
  allowedNextStatuses,
  TaskDomainError,
  type TaskInstance,
  type TaskStatus,
} from "@/domain/task";
import * as tasksRepo from "@/data/tasksRepo";
import { toast } from "sonner";
import { STATUS_LABEL } from "./labels";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Props {
  task: TaskInstance;
  actorMemberId: string;
}

/**
 * Renders the *legal* next-status buttons for the given task. UI never
 * decides legality — it asks the domain via `allowedNextStatuses`, and
 * failed transitions surface the `TaskDomainError.message` verbatim.
 */
export function StatusAction({ task, actorMemberId }: Props) {
  const next = allowedNextStatuses(task.status);
  const [cancelOpen, setCancelOpen] = useState<null | TaskStatus>(null);
  const [reason, setReason] = useState("");

  function attempt(
    to: TaskStatus,
    extra?: { completedAt?: string; completedByMemberId?: string; cancelReason?: string },
  ) {
    try {
      tasksRepo.transition(task.id, {
        to,
        at: new Date().toISOString(),
        actorMemberId,
        ...extra,
      });
      toast.success(`המשימה עודכנה: ${STATUS_LABEL[to]}`);
    } catch (e) {
      if (e instanceof TaskDomainError) {
        toast.error(e.message);
      } else if (e instanceof Error) {
        toast.error(e.message);
      } else {
        toast.error("אירעה שגיאה");
      }
    }
  }

  if (next.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        המשימה בסטטוס סופי ({STATUS_LABEL[task.status]}) — אין פעולות זמינות.
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {next.map((to) => {
          const label = STATUS_LABEL[to];
          const isDone = to === "done";
          const isCancel = to === "cancelled" || to === "skipped";
          return (
            <Button
              key={to}
              variant={isDone ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (isDone) {
                  attempt(to, {
                    completedAt: new Date().toISOString(),
                    completedByMemberId: task.assignment?.memberId ?? actorMemberId,
                  });
                } else if (isCancel) {
                  setReason("");
                  setCancelOpen(to);
                } else {
                  attempt(to);
                }
              }}
            >
              {label}
            </Button>
          );
        })}
      </div>

      <Dialog open={cancelOpen !== null} onOpenChange={(o) => !o && setCancelOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {cancelOpen === "skipped" ? "דילוג על המשימה" : "ביטול המשימה"}
            </DialogTitle>
            <DialogDescription>
              יש להזין סיבה קצרה. הפעולה תיכתב בהיסטוריית המשימה.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">סיבה</Label>
            <Input
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="לדוגמה: כבר לא רלוונטי"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(null)}>
              חזרה
            </Button>
            <Button
              onClick={() => {
                if (!reason.trim()) {
                  toast.error("יש להזין סיבה");
                  return;
                }
                const to = cancelOpen!;
                setCancelOpen(null);
                attempt(to, { cancelReason: reason.trim() });
              }}
            >
              אישור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
