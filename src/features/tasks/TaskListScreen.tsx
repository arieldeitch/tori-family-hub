import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Inbox, Plus, Loader2, WifiOff, ShieldAlert, AlertCircle, ListTodo } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { TaskInstance, TaskStatus } from "@/domain/task";
import { requiresAssignment } from "@/domain/task";
import { useTasks } from "@/lib/useTasks";
import { useHousehold } from "@/lib/useHousehold";
import * as tasksRepo from "@/data/tasksRepo";
import { STATUS_LABEL } from "./labels";
import { TaskCard } from "./TaskCard";
import { QuickTaskForm } from "./QuickTaskForm";

type ViewState = "normal" | "loading" | "empty" | "error" | "permission_denied";

interface Props {
  members: ReadonlyArray<{ id: string; name: string }>;
  currentActorId: string;
  /** UX-only role. Server-side enforcement (RLS) is out of scope for the prototype. */
  viewerRole?: "owner" | "adult" | "child" | "guest";
}

const ALL_STATUSES: TaskStatus[] = [
  "inbox",
  "planned",
  "assigned",
  "accepted",
  "in_progress",
  "waiting",
  "blocked",
  "done",
  "skipped",
  "cancelled",
];

export function TaskListScreen({ members, currentActorId, viewerRole = "adult" }: Props) {
  const tasks = useTasks();
  const [tab, setTab] = useState<"all" | "unassigned">("all");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [view, setView] = useState<ViewState>("normal");
  const [createOpen, setCreateOpen] = useState(false);

  const visible: TaskInstance[] = useMemo(() => {
    return tasks.filter((t) => {
      // UX-only role gating for adults-only. Real enforcement is server-side.
      if (viewerRole === "child" && t.adultsOnly) return false;
      if (tab === "unassigned" && !requiresAssignment(t)) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (assigneeFilter !== "all") {
        if (assigneeFilter === "__unassigned__") {
          if (t.assignment) return false;
        } else if (t.assignment?.memberId !== assigneeFilter) return false;
      }
      if (dateFilter) {
        if (!t.dueAt || t.dueAt.slice(0, 10) !== dateFilter) return false;
      }
      return true;
    });
  }, [tasks, tab, statusFilter, assigneeFilter, dateFilter, viewerRole]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">משימות</h1>
          <p className="text-sm text-muted-foreground">משימות חד־פעמיות של המשפחה</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/tasks/unassigned">
            <Button variant="outline" size="sm">
              <ListTodo className="ml-1 h-4 w-4" aria-hidden />
              דורש הקצאה
            </Button>
          </Link>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="ml-1 h-4 w-4" aria-hidden />
            משימה חדשה
          </Button>
        </div>
      </div>

      <ViewStatePicker view={view} onChange={setView} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "unassigned")}>
        <TabsList>
          <TabsTrigger value="all">הכל</TabsTrigger>
          <TabsTrigger value="unassigned">דורש הקצאה</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-2 sm:grid-cols-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as TaskStatus | "all")}
        >
          <SelectTrigger>
            <SelectValue placeholder="סטטוס" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="אחראי" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל האחראים</SelectItem>
            <SelectItem value="__unassigned__">ללא אחראי</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          aria-label="סינון לפי תאריך יעד"
        />
      </div>

      <TaskListBody view={view} tasks={visible} members={members} />

      <QuickTaskForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        members={members}
        currentActorId={currentActorId}
      />
    </div>
  );
}

function TaskListBody({
  view,
  tasks,
  members,
}: {
  view: ViewState;
  tasks: ReadonlyArray<TaskInstance>;
  members: ReadonlyArray<{ id: string; name: string }>;
}) {
  if (view === "loading") {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          טוען משימות…
        </CardContent>
      </Card>
    );
  }
  if (view === "error") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" aria-hidden />
        <AlertDescription>לא הצלחנו לטעון משימות כרגע. נסו שוב בעוד רגע.</AlertDescription>
      </Alert>
    );
  }
  if (view === "permission_denied") {
    return (
      <Alert>
        <ShieldAlert className="h-4 w-4" aria-hidden />
        <AlertDescription>אין לך הרשאה לצפייה במשימות אלו.</AlertDescription>
      </Alert>
    );
  }
  if (view === "empty" || tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
          <Inbox className="h-8 w-8" aria-hidden />
          <div className="font-medium text-foreground">אין משימות תואמות</div>
          <div className="text-sm">נסו לשנות מסננים או ליצור משימה חדשה.</div>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid gap-2">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} members={members} />
      ))}
    </div>
  );
}

function ViewStatePicker({
  view,
  onChange,
}: {
  view: ViewState;
  onChange: (v: ViewState) => void;
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-2 text-xs flex flex-wrap items-center gap-2">
      <WifiOff className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <span className="text-muted-foreground">מצב תצוגה (דמו):</span>
      {(["normal", "loading", "empty", "error", "permission_denied"] as ViewState[]).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded px-2 py-0.5 ${
            v === view ? "bg-primary text-primary-foreground" : "bg-background border"
          }`}
        >
          {v}
        </button>
      ))}
      <button
        onClick={() => tasksRepo.setSimulateFailure(!tasksRepo.getSimulateFailure())}
        className="rounded px-2 py-0.5 border bg-background"
      >
        toggle simulateFailure
      </button>
    </div>
  );
}
