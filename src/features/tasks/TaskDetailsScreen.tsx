import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Edit3, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import type { TaskInstance } from "@/domain/task";
import { isTaskOverdue } from "@/domain/task";
import * as tasksRepo from "@/data/tasksRepo";
import { AssignmentPicker } from "./AssignmentPicker";
import { StatusAction } from "./StatusAction";
import { EditTaskDialog } from "./EditTaskDialog";
import {
  STATUS_LABEL,
  PRIORITY_LABEL,
  formatDate,
  formatDateTime,
  resolveMemberName,
} from "./labels";

interface Props {
  task: TaskInstance;
  members: ReadonlyArray<{ id: string; name: string }>;
  currentActorId: string;
}

export function TaskDetailsScreen({ task, members, currentActorId }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const overdue = isTaskOverdue(task, new Date().toISOString());

  function changeAssignee(memberId: string | null) {
    try {
      tasksRepo.assignTask(task.id, { memberId, actorMemberId: currentActorId });
      toast.success(memberId ? "האחריות עודכנה" : "האחריות הוסרה");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שמירה נכשלה");
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <Link to="/tasks" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          חזרה למשימות
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold leading-tight">{task.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{STATUS_LABEL[task.status]}</Badge>
            <Badge variant="secondary">{PRIORITY_LABEL[task.priority]}</Badge>
            {task.adultsOnly && <Badge variant="outline">למבוגרים בלבד</Badge>}
            {overdue && <Badge variant="destructive">באיחור</Badge>}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Edit3 className="ml-1 h-4 w-4" aria-hidden />
          עריכה
        </Button>
      </div>

      {task.description && (
        <Card>
          <CardContent className="p-4 text-sm whitespace-pre-wrap">{task.description}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">פרטי המשימה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <Field label="מועד יעד" value={formatDate(task.dueAt)} />
            <Field
              label="אחראי נוכחי"
              value={resolveMemberName(members, task.assignment?.memberId)}
            />
            <Field label="נוצר" value={formatDateTime(task.createdAt)} />
            <Field label="עודכן" value={formatDateTime(task.updatedAt)} />
            {task.completedAt && (
              <>
                <Field label="הושלם" value={formatDateTime(task.completedAt)} />
                <Field
                  label="על ידי"
                  value={resolveMemberName(members, task.completedByMemberId)}
                />
              </>
            )}
            {task.cancelledAt && (
              <>
                <Field label="בוטל" value={formatDateTime(task.cancelledAt)} />
                {task.cancelReason && <Field label="סיבה" value={task.cancelReason} />}
              </>
            )}
          </div>

          <div className="pt-2 border-t">
            <AssignmentPicker
              value={task.assignment?.memberId ?? null}
              onChange={changeAssignee}
              members={members}
              label="שינוי אחראי"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">פעולות</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusAction task={task} actorMemberId={currentActorId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">היסטוריה</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm">
            {task.activity.map((a) => (
              <li key={a.id} className="flex items-start gap-2">
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                <div>
                  <div>
                    {activityLabel(a.kind)}
                    {a.from && a.to && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {STATUS_LABEL[a.from]} → {STATUS_LABEL[a.to]}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(a.at)} · {resolveMemberName(members, a.byMemberId)}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <EditTaskDialog open={editOpen} onOpenChange={setEditOpen} task={task} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function activityLabel(k: string): string {
  switch (k) {
    case "created":
      return "נוצרה";
    case "assigned":
      return "הוקצה אחראי";
    case "unassigned":
      return "הוסרה הקצאה";
    case "status_changed":
      return "סטטוס עודכן";
    case "completed":
      return "הושלמה";
    case "cancelled":
      return "בוטלה";
    case "skipped":
      return "דולגה";
    case "reopened":
      return "נפתחה מחדש";
    default:
      return k;
  }
}
