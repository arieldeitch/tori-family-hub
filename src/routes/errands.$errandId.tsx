import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { ErrandDetailsScreen } from "@/features/errands/ErrandDetailsScreen";
import { useErrand } from "@/lib/useErrands";
import { useHousehold } from "@/lib/useHousehold";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/errands/$errandId")({
  component: ErrandDetailsRoute,
});

function ErrandDetailsRoute() {
  const { errandId } = useParams({ from: "/errands/$errandId" });
  const errand = useErrand(errandId);
  const { members } = useHousehold();
  const list = useMemo(() => {
    if (members.length > 0) return members.map((m) => ({ id: m.id, name: m.name }));
    return [
      { id: "m_owner", name: "מנהל/ת הבית (דמו)" },
      { id: "m_adult", name: "מבוגר (דמו)" },
    ];
  }, [members]);

  return (
    <AppShell title="פרטי סידור">
      {errand ? (
        <ErrandDetailsScreen
          errand={errand}
          members={list}
          currentActorId={list[0]!.id}
          viewerRole="adult"
        />
      ) : (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <div className="text-lg font-medium">הסידור לא נמצא</div>
            <div className="text-sm text-muted-foreground">ייתכן שהוא נמחק או שה־ID שגוי.</div>
            <Link to="/errands">
              <Button variant="outline">חזרה לסידורים</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
