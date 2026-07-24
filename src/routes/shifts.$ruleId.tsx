import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RuleFormScreen } from "@/features/shifts/RuleFormScreen";
import { useShiftRule } from "@/lib/useShifts";
import { useHousehold } from "@/lib/useHousehold";

export const Route = createFileRoute("/shifts/$ruleId")({
  component: EditRule,
});

function EditRule() {
  const { ruleId } = Route.useParams();
  const rule = useShiftRule(ruleId);
  const { members } = useHousehold();
  const list = useMemo(() => {
    if (members.length > 0) return members.map((m) => ({ id: m.id, name: m.name }));
    return [
      { id: "m_owner", name: "מנהל/ת הבית (דמו)" },
      { id: "m_adult", name: "מבוגר (דמו)" },
      { id: "m_teen", name: "בן/בת נוער (דמו)" },
    ];
  }, [members]);

  if (!rule) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">כלל לא נמצא</h1>
        <p className="text-sm text-muted-foreground">
          ייתכן שהכלל נמחק או שהוא לא קיים בזיכרון הנוכחי (הכל דמו, ללא persistence).
        </p>
        <Link to="/shifts">
          <Button variant="outline">חזרה לרשימת התורנויות</Button>
        </Link>
      </div>
    );
  }

  return <RuleFormScreen rule={rule} members={list} />;
}
