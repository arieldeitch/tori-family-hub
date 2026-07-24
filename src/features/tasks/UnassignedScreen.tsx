import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ListTodo } from "lucide-react";
import { requiresAssignment } from "@/domain/task";
import { useTasks } from "@/lib/useTasks";
import { TaskCard } from "./TaskCard";

interface Props {
  members: ReadonlyArray<{ id: string; name: string }>;
  viewerRole?: "owner" | "adult" | "child" | "guest";
}

export function UnassignedScreen({ members, viewerRole = "adult" }: Props) {
  const tasks = useTasks();
  const items = useMemo(
    () =>
      tasks.filter((t) => {
        if (viewerRole === "child" && t.adultsOnly) return false;
        return requiresAssignment(t) && t.status !== "done" && t.status !== "cancelled" && t.status !== "skipped";
      }),
    [tasks, viewerRole],
  );

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <Link to="/tasks" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          חזרה למשימות
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-semibold">דורש הקצאה</h1>
        <p className="text-sm text-muted-foreground">
          משימות ללא אחראי או ללא מועד יעד — הקצו כדי להעביר לתכנון.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
            <ListTodo className="h-8 w-8" aria-hidden />
            <div className="font-medium text-foreground">אין משימות שדורשות הקצאה</div>
            <div className="text-sm">כל הכבוד — הכל בטיפול.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {items.map((t) => (
            <TaskCard key={t.id} task={t} members={members} />
          ))}
        </div>
      )}
    </div>
  );
}
