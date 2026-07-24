import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { TaskDetailsScreen } from "@/features/tasks/TaskDetailsScreen";
import { useTask } from "@/lib/useTasks";
import { useHousehold } from "@/lib/useHousehold";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/tasks/$taskId")({
  component: TaskDetailsRoute,
});

function TaskDetailsRoute() {
  const { taskId } = useParams({ from: "/tasks/$taskId" });
  const task = useTask(taskId);
  const { members } = useHousehold();
  const list = useMemo(() => {
    if (members.length > 0) return members.map((m) => ({ id: m.id, name: m.name }));
    return [
      { id: "m_owner", name: "מנהל/ת הבית (דמו)" },
      { id: "m_adult", name: "מבוגר (דמו)" },
    ];
  }, [members]);
  const currentActorId = list[0]!.id;

  return (
    <AppShell title="פרטי משימה">
      {task ? (
        <TaskDetailsScreen task={task} members={list} currentActorId={currentActorId} />
      ) : (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <div className="text-lg font-medium">המשימה לא נמצאה</div>
            <div className="text-sm text-muted-foreground">
              ייתכן שהיא נמחקה או שה־ID שגוי.
            </div>
            <Link to="/tasks">
              <Button variant="outline">חזרה למשימות</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
