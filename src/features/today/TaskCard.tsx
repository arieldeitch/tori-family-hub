import type { TaskItem, TodayMember } from "@/domain/today";
import { StatusBadge, type StatusKind } from "@/components/design-system/StatusBadge";
import { PersonAvatar } from "@/components/design-system/PersonAvatar";
import { Button } from "@/components/ui/button";
import { formatTime } from "./format";

const STATUS_TO_KIND: Record<TaskItem["status"], StatusKind> = {
  open: "neutral",
  in_progress: "info",
  done: "success",
  overdue: "overdue",
  waiting_approval: "warning",
};

const STATUS_LABEL: Record<TaskItem["status"], string> = {
  open: "פתוח",
  in_progress: "בביצוע",
  done: "בוצע",
  overdue: "באיחור",
  waiting_approval: "ממתין לאישור",
};

interface Props {
  task: TaskItem;
  assignee: TodayMember | null;
  primaryLabel: string;
  onPrimary?: () => void;
}

export function TaskCard({ task, assignee, primaryLabel, onPrimary }: Props) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">{task.title}</h3>
        <StatusBadge kind={STATUS_TO_KIND[task.status]}>{STATUS_LABEL[task.status]}</StatusBadge>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {assignee ? (
          <span className="inline-flex items-center gap-2">
            <PersonAvatar name={assignee.name} color={assignee.color} size="sm" />
            <span className="text-foreground">{assignee.name}</span>
          </span>
        ) : (
          <span className="text-warning-foreground">ללא אחראי</span>
        )}
        {task.dueAt ? <span>· {formatTime(task.dueAt)}</span> : null}
      </div>
      {onPrimary ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={onPrimary}>
            {primaryLabel}
          </Button>
        </div>
      ) : null}
    </article>
  );
}
