import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useFollowUp } from "@/lib/useFollowUps";
import { useHousehold } from "@/lib/useHousehold";
import * as followUpRepo from "@/data/followUpRepo";
import { isDueForFollowUp, isTerminalStatus, type FollowUpCase } from "@/domain/followUp";
import {
  ACTION_KIND_LABEL,
  BALL_HOLDER_LABEL,
  SENSITIVITY_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
  formatDate,
  formatDateTime,
  resolveMemberName,
} from "./labels";
import { FollowUpFormDialog } from "./FollowUpFormDialog";
import { AddActionDialog } from "./AddActionDialog";

interface Props {
  caseId: string;
}

export function FollowUpDetailScreen({ caseId }: Props) {
  const followUp = useFollowUp(caseId);
  const { members } = useHousehold();
  const navigate = useNavigate();

  const memberOptions = useMemo(() => {
    const fromHousehold = members.map((m) => ({ id: m.id, name: m.name }));
    if (fromHousehold.length > 0) return fromHousehold;
    return [
      { id: "m_owner", name: "מנהל/ת הבית (דמו)" },
      { id: "m_adult", name: "מבוגר (דמו)" },
    ];
  }, [members]);

  const [editOpen, setEditOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!followUp) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-muted-foreground">המעקב לא נמצא.</p>
        <Button asChild variant="secondary" className="mt-4">
          <Link to="/follow-ups">חזרה לרשימה</Link>
        </Button>
      </div>
    );
  }

  const owner = resolveMemberName(followUp.responsibleMemberId, memberOptions);
  const due = isDueForFollowUp(followUp, new Date().toISOString());

  const markCompleted = () => {
    const before = followUp.nextFollowUpAt;
    followUpRepo.update(followUp.id, { status: "completed" });
    followUpRepo.addAction(followUp.id, {
      kind: "completed",
      description: "המעקב הושלם",
      byMemberId: followUp.responsibleMemberId,
    });
    if (before) {
      toast.success("המעקב הושלם — תזכורת דמו עתידית בוטלה");
    } else {
      toast.success("המעקב הושלם");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/follow-ups" className="hover:underline">
          מעקבים
        </Link>
        <span>›</span>
        <span className="truncate">{followUp.title}</span>
      </div>

      <Header followUp={followUp} owner={owner} due={due} />

      <HighlightBar followUp={followUp} members={memberOptions} />

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setActionOpen(true)}>הוספת פעולה</Button>
        <Button
          variant="secondary"
          onClick={markCompleted}
          disabled={isTerminalStatus(followUp.status)}
        >
          סמן כהושלם
        </Button>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          עריכה
        </Button>
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          מחיקה
        </Button>
      </div>

      <section aria-labelledby="timeline-h" className="space-y-3">
        <h2 id="timeline-h" className="text-lg font-semibold">
          Timeline
        </h2>
        <Timeline followUp={followUp} members={memberOptions} />
      </section>

      <FollowUpFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="עריכת מעקב"
        members={memberOptions}
        initial={{
          title: followUp.title,
          responsibleMemberId: followUp.responsibleMemberId,
          externalParty: followUp.externalParty,
          ballHolder: followUp.ballHolder,
          status: followUp.status,
          nextFollowUpAt: followUp.nextFollowUpAt,
          followUpDisabledReason: followUp.followUpDisabledReason,
          targetDate: followUp.targetDate,
          possibleAmount: followUp.possibleAmount,
          sensitivity: followUp.sensitivity,
        }}
        submitLabel="שמור שינויים"
        onSubmit={(v) => {
          const updated = followUpRepo.update(followUp.id, v);
          followUpRepo.addAction(followUp.id, {
            kind: "status_changed",
            description: `עודכן: ${STATUS_LABEL[v.status]}`,
            byMemberId: v.responsibleMemberId,
            nextFollowUpAt: v.nextFollowUpAt,
          });
          if (updated && isTerminalStatus(updated.status)) {
            toast.success("סטטוס עודכן — תזכורות עתידיות נוקו");
          } else {
            toast.success("המעקב עודכן");
          }
        }}
      />

      <AddActionDialog
        open={actionOpen}
        onOpenChange={setActionOpen}
        members={memberOptions}
        defaultMemberId={followUp.responsibleMemberId}
        onSubmit={(a) => {
          followUpRepo.addAction(followUp.id, a);
          toast.success("נוספה פעולה");
        }}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>למחוק את המעקב?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תסיר את המעקב מהתצוגה בדמו הנוכחי.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                followUpRepo.remove(followUp.id);
                toast.success("המעקב נמחק");
                navigate({ to: "/follow-ups" });
              }}
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Header({ followUp, owner, due }: { followUp: FollowUpCase; owner: string; due: boolean }) {
  return (
    <header className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{followUp.title}</h1>
        <span
          className={`rounded-md px-2 py-1 text-xs font-medium ${STATUS_TONE[followUp.status]}`}
        >
          {STATUS_LABEL[followUp.status]}
        </span>
        {due && <Badge variant="destructive">הגיע הזמן לעקוב</Badge>}
        {followUp.sensitivity !== "household" && (
          <Badge variant="outline">{SENSITIVITY_LABEL[followUp.sensitivity]}</Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {followUp.externalParty} · אחראי: {owner} · נפתח {formatDate(followUp.openedAt)}
      </p>
    </header>
  );
}

function HighlightBar({
  followUp,
  members,
}: {
  followUp: FollowUpCase;
  members: ReadonlyArray<{ id: string; name: string }>;
}) {
  const last = followUp.actions[0];
  const nextAction =
    followUp.status === "waiting_external"
      ? "לחכות לתגובה מהגורם החיצוני"
      : followUp.status === "action_required"
        ? "יש לבצע פעולה"
        : followUp.status === "more_info_required"
          ? "לאסוף מידע נוסף"
          : "לפי הצורך";

  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-4">
        <Cell label="מי מחזיק בכדור" value={BALL_HOLDER_LABEL[followUp.ballHolder]} />
        <Cell
          label="פעולה אחרונה"
          value={last ? last.description : "טרם בוצעה פעולה"}
          hint={last ? `${ACTION_KIND_LABEL[last.kind]} · ${formatDateTime(last.at)}` : undefined}
        />
        <Cell
          label="מעקב הבא"
          value={
            followUp.nextFollowUpAt
              ? formatDate(followUp.nextFollowUpAt)
              : followUp.followUpDisabledReason
                ? "ללא תזכורת"
                : "—"
          }
          hint={followUp.followUpDisabledReason}
        />
        <Cell
          label="הפעולה הבאה"
          value={nextAction}
          hint={followUp.targetDate ? `יעד: ${formatDate(followUp.targetDate)}` : undefined}
        />
      </CardContent>
      {members.length === 0 && <Separator />}
    </Card>
  );
}

function Cell({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Timeline({
  followUp,
  members,
}: {
  followUp: FollowUpCase;
  members: ReadonlyArray<{ id: string; name: string }>;
}) {
  if (followUp.actions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">עדיין לא נוספו פעולות. הוסיפו את הראשונה.</p>
    );
  }
  return (
    <ol className="relative border-s ps-4 space-y-3">
      {followUp.actions.map((a) => (
        <li key={a.id} className="relative">
          <span className="absolute -start-[7px] top-2 h-3 w-3 rounded-full bg-primary" />
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold">{ACTION_KIND_LABEL[a.kind]}</span>
                <span className="text-xs text-muted-foreground">{formatDateTime(a.at)}</span>
              </div>
              <p className="mt-1 text-sm">{a.description}</p>
              <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                <span>בוצע ע״י {resolveMemberName(a.byMemberId, members)}</span>
                {a.nextFollowUpAt && <span>מעקב הבא: {formatDate(a.nextFollowUpAt)}</span>}
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ol>
  );
}
