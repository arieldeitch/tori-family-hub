import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, SectionHeader } from "@/components/design-system";
import { toast } from "sonner";
import * as templatesRepo from "@/data/templatesRepo";
import * as tasksRepo from "@/data/tasksRepo";
import { canRestore, withinRestoreWindow, type ViewerRole } from "@/domain/recurrence";
import { useSyncExternalStore } from "react";

const ROLES: ViewerRole[] = ["owner", "adult", "child", "guest"];

function useDeletedTasks() {
  return useSyncExternalStore(
    tasksRepo.subscribe,
    tasksRepo.getDeleted,
    tasksRepo.getDeleted,
  );
}

export function TrashScreen() {
  const [role, setRole] = useState<ViewerRole>("owner");
  const templates = templatesRepo.useDeletedTemplates();
  const tasks = useDeletedTasks();
  const now = new Date().toISOString();

  const allowRestore = canRestore(role);

  const restoreTpl = (id: string) => {
    templatesRepo.restoreTemplate(id);
    toast.success("התבנית שוחזרה");
  };
  const restoreTask = (id: string) => {
    tasksRepo.restoreTask(id);
    toast.success("המשימה שוחזרה");
  };

  const empty = templates.length === 0 && tasks.length === 0;

  return (
    <div className="p-4 space-y-4">
      <SectionHeader
        title="סל שחזור"
        description="פריטים שנמחקו לאחרונה. חלון שחזור: 48 שעות. אין מחיקה סופית."
        actions={
          <div className="min-w-40">
            <Select value={role} onValueChange={(v) => setRole(v as ViewerRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    תפקיד תצוגה: {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />
      {!allowRestore && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          תפקיד זה אינו רואה כפתור שחזור (הגנת UX בלבד).
        </div>
      )}

      {empty ? (
        <EmptyState title="הסל ריק" description="אין פריטים שנמחקו." />
      ) : (
        <div className="space-y-4">
          {templates.length > 0 && (
            <section>
              <h2 className="text-lg font-medium mb-2">תבניות</h2>
              <div className="space-y-2">
                {templates.map((t) => {
                  const inWindow = withinRestoreWindow(t, now);
                  return (
                    <Card key={t.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{t.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          נמחק ב־{new Date(t.deletedAt!).toLocaleString("he-IL")}
                        </span>
                        {allowRestore && inWindow ? (
                          <Button size="sm" onClick={() => restoreTpl(t.id)}>
                            שחזר
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {!inWindow ? "מחוץ לחלון שחזור" : "אין הרשאה"}
                          </span>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {tasks.length > 0 && (
            <section>
              <h2 className="text-lg font-medium mb-2">משימות</h2>
              <div className="space-y-2">
                {tasks.map((t) => {
                  const inWindow = withinRestoreWindow(t, now);
                  return (
                    <Card key={t.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{t.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          נמחק ב־{new Date(t.deletedAt!).toLocaleString("he-IL")}
                        </span>
                        {allowRestore && inWindow ? (
                          <Button size="sm" onClick={() => restoreTask(t.id)}>
                            שחזר
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {!inWindow ? "מחוץ לחלון שחזור" : "אין הרשאה"}
                          </span>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
