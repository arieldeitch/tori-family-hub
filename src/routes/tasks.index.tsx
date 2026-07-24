import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { TaskListScreen } from "@/features/tasks/TaskListScreen";
import { useHousehold } from "@/lib/useHousehold";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/tasks/")({
  component: TasksIndex,
});

function TasksIndex() {
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
    <AppShell title={t("nav.tasks")}>
      <TaskListScreen members={list} currentActorId={currentActorId} viewerRole="adult" />
    </AppShell>
  );
}
