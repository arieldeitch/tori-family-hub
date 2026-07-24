import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { UnassignedScreen } from "@/features/tasks/UnassignedScreen";
import { useHousehold } from "@/lib/useHousehold";

export const Route = createFileRoute("/tasks/unassigned")({
  component: UnassignedRoute,
});

function UnassignedRoute() {
  const { members } = useHousehold();
  const list = useMemo(() => {
    if (members.length > 0) return members.map((m) => ({ id: m.id, name: m.name }));
    return [
      { id: "m_owner", name: "מנהל/ת הבית (דמו)" },
      { id: "m_adult", name: "מבוגר (דמו)" },
    ];
  }, [members]);
  return (
    <AppShell title="דורש הקצאה">
      <UnassignedScreen members={list} viewerRole="adult" />
    </AppShell>
  );
}
