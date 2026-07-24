import { toast } from "sonner";
import { useToday } from "@/lib/useToday";
import { todayRepo, type TodayViewState } from "@/data/todayRepo";
import {
  memberById,
  selectFollowUpsDue,
  selectMyTasks,
  selectNext,
  selectRisks,
  selectTransportsToday,
  selectUnassignedTasks,
  selectWaitingApproval,
  visibleToRole,
  type TaskItem,
  type TransportItem,
} from "@/domain/today";
import { SectionHeader } from "@/components/design-system/SectionHeader";
import { StatusBadge } from "@/components/design-system/StatusBadge";
import { EmptyState } from "@/components/design-system/EmptyState";
import { ErrorState } from "@/components/design-system/ErrorState";
import { OfflineState } from "@/components/design-system/OfflineState";
import { PermissionDeniedState } from "@/components/design-system/PermissionDeniedState";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { TaskCard } from "./TaskCard";
import { TransportCard } from "./TransportCard";
import { ChildTodayScreen } from "./ChildTodayScreen";
import { formatTime } from "./format";

const VIEW_OPTIONS: Array<{ value: TodayViewState; label: string }> = [
  { value: "normal", label: "רגיל" },
  { value: "busy", label: "עמוס" },
  { value: "nearly_empty", label: "כמעט ריק" },
  { value: "loading", label: "טעינה" },
  { value: "error", label: "שגיאה" },
  { value: "offline", label: "לא מקוון" },
  { value: "permission_denied", label: "אין הרשאה" },
  { value: "child", label: "תצוגת ילד" },
];

export function TodayScreen() {
  const { view, dataset } = useToday();

  const picker = (
    <div
      role="group"
      aria-label="בחירת מצב תצוגה לבדיקה"
      className="flex flex-wrap gap-2 rounded-lg border border-dashed border-border bg-surface p-3"
    >
      <span className="w-full text-xs text-muted-foreground">מצבי בדיקה (דמו בזיכרון בלבד):</span>
      {VIEW_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          size="sm"
          variant={view === opt.value ? "default" : "outline"}
          onClick={() => todayRepo.setView(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );

  if (view === "loading") {
    return (
      <div className="space-y-4">
        {picker}
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface p-10 text-center text-muted-foreground"
        >
          <Loader2 className="size-6 animate-spin" aria-hidden="true" />
          <p>טוען את סדר היום…</p>
        </div>
      </div>
    );
  }

  if (view === "error") {
    return (
      <div className="space-y-4">
        {picker}
        <ErrorState
          title="לא הצלחנו לטעון את סדר היום"
          description="אפשר לנסות שוב. הנתונים לא נפגעו."
          action={
            <Button size="sm" onClick={() => todayRepo.setView("normal")}>
              נסו שוב
            </Button>
          }
        />
      </div>
    );
  }

  if (view === "offline") {
    return (
      <div className="space-y-4">
        {picker}
        <OfflineState
          title="אתם במצב לא מקוון"
          description="חלק מהעדכונים יסונכרנו כשתחזור החיבור. אפשר להמשיך לצפות במה שכבר נטען."
        />
      </div>
    );
  }

  if (view === "permission_denied") {
    return (
      <div className="space-y-4">
        {picker}
        <PermissionDeniedState
          title="אין לך גישה לסדר היום המלא"
          description="פני/פנה למנהל/ת הבית לקבלת הרשאות מתאימות."
        />
      </div>
    );
  }

  if (view === "child") {
    return (
      <div className="space-y-4">
        {picker}
        <ChildTodayScreen dataset={dataset} />
      </div>
    );
  }

  const risks = selectRisks(dataset);
  const next = selectNext(dataset);
  const transports = selectTransportsToday(dataset);
  const myTasks = selectMyTasks(dataset);
  const waiting = selectWaitingApproval(dataset);
  const followUps = selectFollowUpsDue(dataset);
  const unassigned = selectUnassignedTasks(dataset);
  const shopping = dataset.shopping;

  const hasAny =
    risks.overdueTasks.length +
      risks.unassignedTransports.length +
      transports.length +
      myTasks.length +
      waiting.length +
      followUps.length +
      unassigned.length >
      0 || !!shopping;

  if (!hasAny) {
    return (
      <div className="space-y-4">
        {picker}
        <EmptyState
          title="אין מה לעשות היום"
          description="נראה שהכל בשליטה. אפשר לנוח או להוסיף פריט חדש."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {picker}

      {/* 1. Operational risk */}
      {(risks.overdueTasks.length > 0 || risks.unassignedTransports.length > 0) && (
        <section aria-labelledby="risk-heading">
          <SectionHeader
            title={
              <span id="risk-heading" className="inline-flex items-center gap-2">
                <AlertTriangle className="size-5 text-warning-foreground" aria-hidden="true" />
                דורש תשומת לב עכשיו
              </span>
            }
          />
          <div className="space-y-3">
            {risks.unassignedTransports.map((t) => (
              <TransportCard
                key={t.id}
                transport={t}
                child={memberById(dataset, t.childId)}
                responsible={null}
                primaryLabel="שיוך אליי"
                onPrimary={() => {
                  todayRepo.assignTransport(t.id, dataset.viewerId);
                  toast.success("שויך אליך (דמו — לא נשמר בשרת)");
                }}
              />
            ))}
            {risks.overdueTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                assignee={memberById(dataset, task.assigneeId)}
                primaryLabel="סימון כבוצע"
                onPrimary={() => {
                  todayRepo.completeTask(task.id);
                  toast.success("המשימה סומנה כבוצעה (דמו)");
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* 2. Next in time */}
      {next && (
        <section aria-labelledby="next-heading">
          <SectionHeader title={<span id="next-heading">הדבר הבא בזמן</span>} />
          <div className="rounded-lg border border-info/30 bg-info/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {next.kind === "event" ? "אירוע" : next.direction === "pickup" ? "איסוף" : "הורדה"}
                </p>
                <h3 className="mt-1 text-base font-semibold text-foreground">
                  {next.kind === "event" ? next.title : (memberById(dataset, next.childId)?.name ?? "")}
                </h3>
                {next.kind === "transport" ? (
                  <p className="text-sm text-muted-foreground">{next.place}</p>
                ) : next.location ? (
                  <p className="text-sm text-muted-foreground">{next.location}</p>
                ) : null}
              </div>
              <StatusBadge kind="info">{formatTime(next.timeAt)}</StatusBadge>
            </div>
          </div>
        </section>
      )}

      {/* 3. Pickups & drop-offs */}
      {transports.length > 0 && (
        <section aria-labelledby="transports-heading">
          <SectionHeader title={<span id="transports-heading">איסופים והורדות</span>} />
          <div className="space-y-3">
            {transports.map((t) => (
              <TransportCard
                key={t.id}
                transport={t}
                child={memberById(dataset, t.childId)}
                responsible={memberById(dataset, t.responsibleId)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 4. My tasks */}
      {myTasks.length > 0 && (
        <section aria-labelledby="mine-heading">
          <SectionHeader title={<span id="mine-heading">המשימות שלי היום</span>} />
          <div className="space-y-3">
            {myTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                assignee={memberById(dataset, task.assigneeId)}
                primaryLabel="סימון כבוצע"
                onPrimary={() => {
                  todayRepo.completeTask(task.id);
                  toast.success("המשימה סומנה כבוצעה (דמו)");
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* 5. Waiting for approval */}
      {waiting.length > 0 && (
        <section aria-labelledby="waiting-heading">
          <SectionHeader title={<span id="waiting-heading">ממתין לאישור</span>} />
          <div className="space-y-3">
            {waiting.map((item) =>
              item.kind === "task" ? (
                <TaskCard
                  key={item.id}
                  task={item as TaskItem}
                  assignee={memberById(dataset, (item as TaskItem).assigneeId)}
                  primaryLabel="אישור"
                  onPrimary={() => {
                    todayRepo.approveItem(item.id);
                    toast.success("אושר (דמו)");
                  }}
                />
              ) : (
                <TransportCard
                  key={item.id}
                  transport={item as TransportItem}
                  child={memberById(dataset, (item as TransportItem).childId)}
                  responsible={memberById(dataset, (item as TransportItem).responsibleId)}
                  primaryLabel="אישור"
                  onPrimary={() => {
                    todayRepo.approveItem(item.id);
                    toast.success("אושר (דמו)");
                  }}
                />
              ),
            )}
          </div>
        </section>
      )}

      {/* 6. Follow-ups due */}
      {followUps.length > 0 && (
        <section aria-labelledby="followups-heading">
          <SectionHeader title={<span id="followups-heading">מעקבים שהגיע זמנם</span>} />
          <div className="space-y-3">
            {followUps.map((f) => {
              const owner = memberById(dataset, f.responsibleId);
              return (
                <article
                  key={f.id}
                  className="rounded-lg border border-border bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        מול {f.externalParty}
                        {owner ? ` · אחראי/ת: ${owner.name}` : ""}
                      </p>
                    </div>
                    <StatusBadge kind="overdue">הגיע זמן מעקב</StatusBadge>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* 7. Unassigned tasks */}
      {unassigned.length > 0 && (
        <section aria-labelledby="unassigned-heading">
          <SectionHeader title={<span id="unassigned-heading">משימות ללא אחראי</span>} />
          <div className="space-y-3">
            {unassigned.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                assignee={null}
                primaryLabel="שיוך אליי"
                onPrimary={() => {
                  todayRepo.claimTask(task.id, dataset.viewerId);
                  toast.success("המשימה שויכה אליך (דמו)");
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* 8. Shopping summary */}
      {shopping && (
        <section aria-labelledby="shopping-heading">
          <SectionHeader title={<span id="shopping-heading">תקציר קניות</span>} />
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-foreground">{shopping.activeListName}</p>
                <p className="text-sm text-muted-foreground">
                  {shopping.itemsCount} פריטים
                  {shopping.urgentCount > 0 ? ` · ${shopping.urgentCount} דחופים` : ""}
                </p>
              </div>
              {shopping.urgentCount > 0 ? (
                <StatusBadge kind="warning">דחוף</StatusBadge>
              ) : (
                <StatusBadge kind="neutral">פעילה</StatusBadge>
              )}
            </div>
          </div>
        </section>
      )}

      <p className="pt-2 text-xs text-muted-foreground">
        פעולות במסך זה משנות מצב בזיכרון בלבד. אין שמירה בשרת בשלב הפרוטוטייפ.
      </p>
    </div>
  );
}

// re-exports for tests / storybook-like showcases
export { visibleToRole };
