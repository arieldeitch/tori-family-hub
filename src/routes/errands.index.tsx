import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { ErrandListScreen } from "@/features/errands/ErrandListScreen";
import { useHousehold } from "@/lib/useHousehold";

export const Route = createFileRoute("/errands/")({
  component: ErrandsIndex,
});

function ErrandsIndex() {
  const { members } = useHousehold();
  const list = useMemo(() => {
    if (members.length > 0) return members.map((m) => ({ id: m.id, name: m.name }));
    return [
      { id: "m_owner", name: "מנהל/ת הבית (דמו)" },
      { id: "m_adult", name: "מבוגר (דמו)" },
    ];
  }, [members]);
  return (
    <AppShell title="סידורים">
      <ErrandListScreen members={list} currentActorId={list[0]!.id} viewerRole="adult" />
    </AppShell>
  );
}
