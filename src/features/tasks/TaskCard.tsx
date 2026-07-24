import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, AlertTriangle } from "lucide-react";
import { isTaskOverdue, type TaskInstance } from "@/domain/task";
import {
  STATUS_LABEL,
  PRIORITY_LABEL,
  formatDate,
  resolveMemberName,
} from "./labels";

interface Props {
  task: TaskInstance;
  members: ReadonlyArray<{ id: string; name: string }>;
}

export function TaskCard({ task, members }: Props) {
  const overdue = isTaskOverdue(task, new Date().toISOString());
  return (
    <Link
      to="/tasks/$taskId"
      params={{ taskId: task.id }}
      className="block outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <Card className="transition-colors hover:bg-accent/40">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="font-medium text-base leading-tight">{task.title}</div>
            <Badge variant="outline">{STATUS_LABEL[task.status]}</Badge>
          </div>
          {task.description && (
            <div className="text-sm text-muted-foreground line-clamp-2">
              {task.description}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" aria-hidden />
              {resolveMemberName(members, task.assignment?.memberId)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {formatDate(task.dueAt)}
            </span>
            <Badge variant="secondary" className="text-xs">
              {PRIORITY_LABEL[task.priority]}
            </Badge>
            {task.adultsOnly && (
              <Badge variant="outline" className="text-xs">
                למבוגרים בלבד
              </Badge>
            )}
            {overdue && (
              <span className="inline-flex items-center gap-1 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                באיחור
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
