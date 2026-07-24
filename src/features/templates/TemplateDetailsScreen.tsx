import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ConfirmationDialog,
  EmptyState,
  SectionHeader,
} from "@/components/design-system";
import * as templatesRepo from "@/data/templatesRepo";
import * as tasksRepo from "@/data/tasksRepo";
import {
  generateOccurrences,
  isSoftDeleted,
  type EditScope,
} from "@/domain/recurrence";
import { toast } from "sonner";
import { ArrowRight, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useTasks } from "@/lib/useTasks";

const ACTOR = "m_owner";

interface Props {
  templateId: string;
}

export function TemplateDetailsScreen({ templateId }: Props) {
  const tpl = templatesRepo.useTemplate(templateId);
  const allTasks = useTasks();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scope, setScope] = useState<EditScope>("template");

  const now = new Date();
  const horizonEnd = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString();

  const futureOccurrences = useMemo(
    () => (tpl ? generateOccurrences(tpl, now.toISOString(), horizonEnd) : []),
    [tpl, now, horizonEnd],
  );
  const instances = allTasks.filter((t) => t.templateId === templateId);
  const past = instances
    .filter((i) => i.dueAt && Date.parse(i.dueAt) < now.getTime())
    .sort((a, b) => (b.dueAt ?? "").localeCompare(a.dueAt ?? ""));

  if (!tpl || isSoftDeleted(tpl)) {
    return (
      <div className="p-4">
        <EmptyState
          title="תבנית לא נמצאה"
          description="ייתכן שהיא נמחקה. אפשר לבדוק בסל השחזור."
          actions={
            <Button asChild>
              <Link to="/templates">חזרה לרשימה</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const materialize = (iso: string) => {
    try {
      tasksRepo.materializeOccurrence(tpl, iso, ACTOR);
      toast.success("המופע נוצר");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה");
    }
  };

  const openScope = () => setScopeOpen(true);
  const applyScope = () => {
    // Prototype only: the choice is logged so UX flow is testable.
    toast.info(
      scope === "this_only"
        ? "השינוי יחול על המופע הזה בלבד (הדגמה)"
        : scope === "this_and_future"
          ? "השינוי יחול על המופע הזה והעתידיים (הדגמה)"
          : "השינוי יחול על התבנית למופעים עתידיים (הדגמה)",
    );
    setScopeOpen(false);
  };

  const del = () => {
    templatesRepo.softDeleteTemplate(tpl.id, ACTOR);
    toast.success("התבנית הועברה לסל השחזור");
    setConfirmDelete(false);
  };

  return (
    <div className="p-4 space-y-4">
      <SectionHeader
        title={tpl.title}
        description={tpl.description ?? tpl.humanRule}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openScope}>
              עריכה
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="ms-1 size-4" /> מחיקה
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">הגדרות</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>כלל: {tpl.humanRule ?? "ללא חזרה"}</div>
          <div>גרסה: {tpl.revision}</div>
          {tpl.missedAction && <div>אם לא בוצעה: {tpl.missedAction}</div>}
          {tpl.adultsOnly && <Badge variant="secondary">מבוגרים בלבד</Badge>}
        </CardContent>
      </Card>

      <section>
        <h2 className="text-lg font-medium mb-2">מופעים עתידיים (30 יום)</h2>
        {futureOccurrences.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין מופעים בטווח.</p>
        ) : (
          <ul className="space-y-2">
            {futureOccurrences.slice(0, 10).map((iso) => {
              const materialised = instances.some(
                (i) => i.scheduledAt === iso || i.dueAt === iso,
              );
              return (
                <li
                  key={iso}
                  className="flex items-center justify-between rounded-md border p-2 text-sm"
                >
                  <span>{new Date(iso).toLocaleString("he-IL")}</span>
                  {materialised ? (
                    <Badge variant="secondary">קיים</Badge>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => materialize(iso)}>
                      צור מופע <ArrowRight className="me-1 size-4" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">היסטוריית מופעים</h2>
        {past.length === 0 ? (
          <p className="text-sm text-muted-foreground">עדיין לא היו מופעים.</p>
        ) : (
          <ul className="space-y-2">
            {past.map((i) => (
              <li key={i.id} className="rounded-md border p-2 text-sm">
                <div className="flex justify-between">
                  <span>{i.title}</span>
                  <Badge variant="outline">{i.status}</Badge>
                </div>
                <div className="text-muted-foreground text-xs">
                  {i.dueAt && new Date(i.dueAt).toLocaleString("he-IL")} · snapshot rev{" "}
                  {i.templateSnapshot?.revision ?? "?"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="להעביר לסל שחזור?"
        description="ניתן לשחזר במשך 48 שעות. היסטוריית המופעים תישמר."
        confirmLabel="כן, מחק"
        cancelLabel="ביטול"
        tone="destructive"
        onConfirm={del}
      />

      <Dialog open={scopeOpen} onOpenChange={setScopeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>על מה השינוי יחול?</DialogTitle>
          </DialogHeader>
          <RadioGroup value={scope} onValueChange={(v) => setScope(v as EditScope)}>
            <label className="flex items-center gap-2 py-1">
              <RadioGroupItem value="this_only" id="s1" />
              <Label htmlFor="s1">המופע הזה בלבד</Label>
            </label>
            <label className="flex items-center gap-2 py-1">
              <RadioGroupItem value="this_and_future" id="s2" />
              <Label htmlFor="s2">המופע הזה והעתידיים</Label>
            </label>
            <label className="flex items-center gap-2 py-1">
              <RadioGroupItem value="template" id="s3" />
              <Label htmlFor="s3">התבנית למופעים עתידיים</Label>
            </label>
          </RadioGroup>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setScopeOpen(false)}>
              ביטול
            </Button>
            <Button onClick={applyScope}>אישור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
