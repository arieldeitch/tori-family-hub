import { toast } from "sonner";
import type { TodayDataset } from "@/domain/today";
import { memberById, selectMyTasks, selectTransportsToday, visibleToRole } from "@/domain/today";
import { todayRepo } from "@/data/todayRepo";
import { Button } from "@/components/ui/button";
import { formatTime } from "./format";

interface Props {
  dataset: TodayDataset;
}

/**
 * Child mode — minimal, large text, today only, 3 actions per task.
 * adultsOnly items are filtered out (UX-only; server must enforce).
 */
export function ChildTodayScreen({ dataset }: Props) {
  const tasks = visibleToRole(selectMyTasks(dataset), "child");
  // Transports don't carry adultsOnly — filter to this child only.
  const transports = selectTransportsToday(dataset).filter(
    (t) => t.childId === dataset.viewerId,
  );

  const viewer = memberById(dataset, dataset.viewerId);

  return (
    <div className="space-y-6" dir="rtl">
      <header className="rounded-lg bg-primary/10 p-5">
        <p className="text-sm text-muted-foreground">שלום</p>
        <h2 className="text-3xl font-bold text-foreground">{viewer?.name ?? "חבר/ה"}</h2>
        <p className="mt-1 text-lg text-muted-foreground">אלה הדברים שלך היום</p>
      </header>

      {transports.length > 0 && (
        <section>
          <h3 className="mb-3 text-xl font-semibold text-foreground">איסופים שלי</h3>
          <div className="space-y-3">
            {transports.map((t) => {
              const responsible = memberById(dataset, t.responsibleId);
              return (
                <div key={t.id} className="rounded-lg border border-border bg-surface p-5">
                  <p className="text-xl font-semibold text-foreground">
                    {t.direction === "pickup" ? "איסוף" : "הורדה"} · {t.place}
                  </p>
                  <p className="mt-1 text-lg text-muted-foreground">
                    בשעה {formatTime(t.timeAt)}
                    {responsible ? ` · ${responsible.name} אוסף/ת אותך` : " · עדיין ללא אחראי"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-3 text-xl font-semibold text-foreground">המשימות שלי</h3>
        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center text-lg text-muted-foreground">
            אין משימות היום. יופי!
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-lg border border-border bg-surface p-5">
                <p className="text-xl font-semibold text-foreground">{task.title}</p>
                {task.dueAt ? (
                  <p className="mt-1 text-base text-muted-foreground">עד {formatTime(task.dueAt)}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="lg"
                    className="min-h-12 flex-1 text-base"
                    onClick={() => {
                      todayRepo.completeTask(task.id);
                      toast.success("סימנו שבוצע!");
                    }}
                  >
                    בוצע
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="min-h-12 flex-1 text-base"
                    onClick={() => toast.info("בקשת עזרה נשלחה למבוגר (דמו)")}
                  >
                    צריך עזרה
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="min-h-12 flex-1 text-base"
                    onClick={() => toast.info("בקשה להחלפה נשלחה (דמו)")}
                  >
                    רוצה להחליף
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
