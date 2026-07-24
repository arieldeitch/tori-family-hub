import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Users, CalendarClock, Link2, Pencil, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Errand } from "@/domain/errand";
import { allowedNextStatuses, type TaskStatus } from "@/domain/task";
import * as errandsRepo from "@/data/errandsRepo";
import * as tasksRepo from "@/data/tasksRepo";
import { toast } from "sonner";
import { STATUS_LABEL, formatDateTime, resolveMemberName } from "@/features/tasks/labels";
import { ErrandFormDialog } from "./ErrandFormDialog";

interface Props {
  errand: Errand;
  members: ReadonlyArray<{ id: string; name: string }>;
  currentActorId: string;
  viewerRole?: "owner" | "adult" | "child" | "guest";
}

export function ErrandDetailsScreen({
  errand,
  members,
  currentActorId,
  viewerRole = "adult",
}: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const readOnly = viewerRole === "child" || viewerRole === "guest";
  const nextStatuses = allowedNextStatuses(errand.status);
  const linked = errand.linkedTaskInstanceId
    ? tasksRepo.getById(errand.linkedTaskInstanceId)
    : undefined;

  const doTransition = (to: TaskStatus) => {
    try {
      const at = new Date().toISOString();
      errandsRepo.transition(errand.id, {
        to,
        at,
        actorMemberId: currentActorId,
        completedAt: to === "done" ? at : undefined,
        completedByMemberId: to === "done" ? currentActorId : undefined,
        cancelReason: to === "cancelled" ? "בוטל דרך פרטי סידור" : undefined,
      });
      toast.success(`עודכן לסטטוס: ${STATUS_LABEL[to]}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    }
  };

  return (
    <div className="space-y-4">
      <Link to="/errands" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        חזרה לרשימת סידורים
      </Link>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{errand.title}</h1>
          <div className="mt-1">
            <Badge variant="outline">{STATUS_LABEL[errand.status]}</Badge>
          </div>
        </div>
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="me-1 h-4 w-4" aria-hidden="true" />
            עריכה
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="space-y-2 p-4 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <div>
              <div className="text-xs text-muted-foreground">מיקום</div>
              <div>
                {errand.location || <span className="italic text-muted-foreground">ללא מיקום</span>}
              </div>
              {errand.areaLabel && (
                <div className="text-xs text-muted-foreground">אזור: {errand.areaLabel}</div>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Users className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <div>
              <div className="text-xs text-muted-foreground">אחראי</div>
              <div>{resolveMemberName(members, errand.assignment?.memberId)}</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CalendarClock className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <div>
              <div className="text-xs text-muted-foreground">תאריך יעד</div>
              <div>{errand.dueAt ? formatDateTime(errand.dueAt) : "—"}</div>
            </div>
          </div>
          {errand.canDoWhenNearby && (
            <div className="rounded-md border border-border bg-muted/40 p-2 text-xs">
              אפשר לבצע כשמישהו נמצא באזור. מידע בלבד — המערכת לא יודעת בפועל מי נמצא היכן.
            </div>
          )}
          {linked && (
            <div className="flex items-start gap-2">
              <Link2 className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <div className="text-xs text-muted-foreground">מקושר למשימה</div>
                <Link
                  to="/tasks/$taskId"
                  params={{ taskId: linked.id }}
                  className="text-primary underline"
                >
                  {linked.title}
                </Link>
              </div>
            </div>
          )}
          {errand.note && (
            <div>
              <div className="text-xs text-muted-foreground">הערה</div>
              <div className="whitespace-pre-wrap">{errand.note}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {!readOnly && nextStatuses.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 text-sm font-medium">שינוי סטטוס</div>
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => doTransition(s)}>
                  {STATUS_LABEL[s]}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="mb-2 text-sm font-medium">היסטוריה</div>
          <ol className="space-y-1 text-xs text-muted-foreground">
            {errand.activity.map((a) => (
              <li key={a.id}>
                {formatDateTime(a.at)} — {a.kind}
                {a.to ? ` → ${STATUS_LABEL[a.to]}` : ""}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <ErrandFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        members={members}
        currentActorId={currentActorId}
        errand={errand}
      />
    </div>
  );
}
