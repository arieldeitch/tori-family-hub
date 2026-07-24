import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, HelpCircle, Repeat } from "lucide-react";
import { t } from "@/lib/i18n";
import { useHousehold } from "@/lib/useHousehold";
import { canRoleSee } from "@/domain/household";
import { childTasksRepo } from "@/data/childTasksRepo";
import { toast } from "sonner";

export function ChildHome() {
  const { members } = useHousehold();
  const children = useMemo(() => members.filter((m) => m.role === "child"), [members]);
  const [activeChildId, setActiveChildId] = useState<string | null>(() => children[0]?.id ?? null);
  const activeChild = children.find((c) => c.id === activeChildId) ?? children[0] ?? null;
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [approvalIds, setApprovalIds] = useState<Set<string>>(new Set());

  const visibleTasks = DEMO_TASKS.filter((t) => canRoleSee("child", t));

  if (children.length === 0) {
    return (
      <div className="mx-auto max-w-md px-5 py-10 text-center">
        <p className="text-muted-foreground">אין ילדים במשק הבית עדיין.</p>
        <Button asChild variant="link" className="mt-3">
          <Link to="/household">{t("home.goHousehold")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-6">
      <header className="mb-4">
        <div className="flex flex-wrap gap-2">
          {children.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={c.id === activeChild?.id ? "default" : "outline"}
              onClick={() => setActiveChildId(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
      </header>

      {activeChild ? (
        <div className="mb-6 flex items-center gap-3">
          <Avatar className="h-14 w-14 border-2" style={{ borderColor: activeChild.color }}>
            <AvatarFallback
              className="text-lg font-semibold"
              style={{ backgroundColor: `${activeChild.color}22` }}
            >
              {activeChild.initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-muted-foreground">{t("child.hello")},</p>
            <h1 className="text-2xl font-bold">{activeChild.name}</h1>
          </div>
        </div>
      ) : null}

      <h2 className="mb-3 text-xl font-semibold">{t("child.title")}</h2>

      <ul className="flex-1 space-y-3">
        {visibleTasks.length === 0 ? (
          <li className="text-center text-muted-foreground">{t("child.empty")}</li>
        ) : (
          visibleTasks.map((task) => {
            const isDone = doneIds.has(task.id);
            const isPending = approvalIds.has(task.id);
            return (
              <li key={task.id}>
                <Card className="p-4">
                  <p className={`text-lg ${isDone ? "text-muted-foreground line-through" : ""}`}>
                    {task.title}
                  </p>
                  {isPending ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("child.sentForApproval")}
                    </p>
                  ) : null}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Button
                      size="lg"
                      className="h-14 text-base"
                      disabled={isDone || isPending}
                      onClick={() => {
                        if (task.requiresApproval) {
                          setApprovalIds((s) => new Set(s).add(task.id));
                          toast(t("child.sentForApproval"));
                        } else {
                          setDoneIds((s) => new Set(s).add(task.id));
                        }
                      }}
                    >
                      <Check className="ms-1 h-5 w-5" aria-hidden />
                      {t("child.done")}
                    </Button>
                    <Button
                      size="lg"
                      variant="secondary"
                      className="h-14 text-base"
                      onClick={() => toast("נשלחה בקשת עזרה")}
                    >
                      <HelpCircle className="ms-1 h-5 w-5" aria-hidden />
                      {t("child.help")}
                    </Button>
                    <Button
                      size="lg"
                      variant="secondary"
                      className="h-14 text-base"
                      onClick={() => toast("נשלחה בקשת החלפה")}
                    >
                      <Repeat className="ms-1 h-5 w-5" aria-hidden />
                      {t("child.swap")}
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })
        )}
      </ul>

      <footer className="mt-6 text-center">
        <Button asChild variant="ghost" size="sm">
          <Link to="/household">{t("child.switchToAdult")}</Link>
        </Button>
      </footer>
    </div>
  );
}
