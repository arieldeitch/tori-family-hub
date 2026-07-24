import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, MapPin, Loader2, AlertCircle } from "lucide-react";
import { useErrands } from "@/lib/useErrands";
import { groupByArea, groupByAssignee, groupByDay, type Errand, type Group } from "@/domain/errand";
import { ErrandCard } from "./ErrandCard";
import { ErrandFormDialog } from "./ErrandFormDialog";

type ViewState = "normal" | "loading" | "empty" | "error";
type GroupBy = "area" | "person" | "day";

interface Props {
  members: ReadonlyArray<{ id: string; name: string }>;
  currentActorId: string;
  viewerRole?: "owner" | "adult" | "child" | "guest";
}

export function ErrandListScreen({ members, currentActorId, viewerRole = "adult" }: Props) {
  const errands = useErrands();
  const [groupBy, setGroupBy] = useState<GroupBy>("area");
  const [formOpen, setFormOpen] = useState(false);
  const [view, setView] = useState<ViewState>("normal");

  const readOnly = viewerRole === "child" || viewerRole === "guest";

  const active = useMemo(
    () =>
      errands.filter(
        (e) => e.status !== "done" && e.status !== "cancelled" && e.status !== "skipped",
      ),
    [errands],
  );

  const groups: ReadonlyArray<Group<Errand>> = useMemo(() => {
    if (groupBy === "area") return groupByArea(active);
    if (groupBy === "person") return groupByAssignee(active, members);
    return groupByDay(active);
  }, [active, groupBy, members]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground">סידורים</h2>
          <p className="text-sm text-muted-foreground">
            משימות הקשורות למיקום או ליציאה. ללא מפות וללא מעקב מיקום.
          </p>
        </div>
        {!readOnly && (
          <Button onClick={() => setFormOpen(true)} size="sm">
            <Plus className="me-1 h-4 w-4" aria-hidden="true" />
            סידור חדש
          </Button>
        )}
      </div>

      <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="area">לפי אזור</TabsTrigger>
          <TabsTrigger value="person">לפי אדם</TabsTrigger>
          <TabsTrigger value="day">לפי יום</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Debug-only view state toggles — mirrors tasks screen convention */}
      <div className="flex flex-wrap gap-1 text-xs">
        {(["normal", "loading", "empty", "error"] as ViewState[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded border px-2 py-1 ${view === v ? "bg-primary text-primary-foreground" : "bg-surface"}`}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "loading" && (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            טוען סידורים…
          </CardContent>
        </Card>
      )}

      {view === "error" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
            <div className="font-medium">לא הצלחנו לטעון את הסידורים</div>
            <div className="text-sm text-muted-foreground">נסו שוב בעוד רגע.</div>
          </CardContent>
        </Card>
      )}

      {view === "empty" || (view === "normal" && active.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div className="font-medium">אין סידורים פעילים</div>
            <div className="text-sm text-muted-foreground">כל היציאות מהבית מסודרות כרגע.</div>
            {!readOnly && (
              <Button variant="outline" onClick={() => setFormOpen(true)} className="mt-2">
                <Plus className="me-1 h-4 w-4" aria-hidden="true" />
                יצירת סידור ראשון
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      {view === "normal" && active.length > 0 && (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.key} aria-labelledby={`grp-${g.key}`} className="space-y-2">
              <h3 id={`grp-${g.key}`} className="text-sm font-semibold text-muted-foreground">
                {g.label}
                <span className="ms-2 rounded bg-muted px-1.5 py-0.5 text-xs">
                  {g.items.length}
                </span>
              </h3>
              <div className="space-y-2">
                {g.items.map((e) => (
                  <ErrandCard key={e.id} errand={e} members={members} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <ErrandFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        members={members}
        currentActorId={currentActorId}
      />
    </div>
  );
}
