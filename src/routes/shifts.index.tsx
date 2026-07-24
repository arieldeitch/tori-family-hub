import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { RuleListScreen } from "@/features/shifts/RuleListScreen";
import { useHousehold } from "@/lib/useHousehold";

export const Route = createFileRoute("/shifts/")({
  component: ShiftsIndex,
});

function ShiftsIndex() {
  const { members } = useHousehold();
  const list = useMemo(() => {
    if (members.length > 0) return members.map((m) => ({ id: m.id, name: m.name }));
    return [
      { id: "m_owner", name: "מנהל/ת הבית (דמו)" },
      { id: "m_adult", name: "מבוגר (דמו)" },
      { id: "m_teen", name: "בן/בת נוער (דמו)" },
    ];
  }, [members]);
  return <RuleListScreen members={list} />;
}
