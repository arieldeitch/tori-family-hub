import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ALL_STATUSES,
  isDueForFollowUp,
  isWaitingExternal,
  canRoleSeeFollowUp,
  type FollowUpCase,
  type FollowUpStatus,
} from "@/domain/followUp";
import { useFollowUps } from "@/lib/useFollowUps";
import { useHousehold } from "@/lib/useHousehold";
import * as followUpRepo from "@/data/followUpRepo";
import {
  STATUS_LABEL,
  STATUS_TONE,
  BALL_HOLDER_LABEL,
  SENSITIVITY_LABEL,
  formatDate,
  resolveMemberName,
} from "./labels";
import { FollowUpFormDialog } from "./FollowUpFormDialog";

const NOW = () => new Date().toISOString();

export function FollowUpListScreen() {
  const cases = useFollowUps();
  const { members } = useHousehold();

  const memberOptions = useMemo(() => {
    const fromHousehold = members.map((m) => ({ id: m.id, name: m.name }));
    if (fromHousehold.length > 0) return fromHousehold;
    // Fallback demo members so the form remains usable before onboarding.
    return [
      { id: "m_owner", name: "מנהל/ת הבית (דמו)" },
      { id: "m_adult", name: "מבוגר (דמו)" },
    ];
  }, [members]);

  const [tab, setTab] = useState<"all" | "due" | "waiting">("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<FollowUpStatus | "all">("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [openCreate, setOpenCreate] = useState(false);

  const visible = useMemo(() => {
    const now = NOW();
    return cases.filter((c) => {
      // UX-only role gating: prototype assumes current viewer is an adult
      // (child mode is a separate route). See docs/LOVABLE_CHANGELOG.md.
      if (!canRoleSeeFollowUp("adult", c)) return false;
      if (tab === "due" && !isDueForFollowUp(c, now)) return false;
      if (tab === "waiting" && !isWaitingExternal(c)) return false;
      if (ownerFilter !== "all" && c.responsibleMemberId !== ownerFilter)
        return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (dateFilter) {
        const cmp = new Date(`${dateFilter}T00:00:00.000Z`).toISOString();
        if (!c.nextFollowUpAt || c.nextFollowUpAt.slice(0, 10) > dateFilter) {
          return false;
        }
        void cmp;
      }
      return true;
    });
  }, [cases, tab, ownerFilter, statusFilter, dateFilter]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">מעקבים</h1>
          <p className="text-sm text-muted-foreground">
            נושאים שלא נסגרים בפעולה אחת — מי מחזיק בכדור ומתי לחזור.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              followUpRepo.resetToSeed();
              toast.success("נטענו מעקבי דמו");
            }}
          >
            אפס דמו
          </Button>
          <Button onClick={() => setOpenCreate(true)}>מעקב חדש</Button>
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="all">הכל</TabsTrigger>
          <TabsTrigger value="due">הגיע הזמן לעקוב</TabsTrigger>
          <TabsTrigger value="waiting">ממתין לגורם חיצוני</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger>
                <SelectValue placeholder="אחראי" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל האחראים</SelectItem>
                {memberOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v === "all" ? "all" : (v as FollowUpStatus))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="מעקב עד תאריך"
            />
          </div>

          {visible.length === 0 ? (
            <EmptyState onCreate={() => setOpenCreate(true)} />
          ) : (
            <ul className="space-y-2">
              {visible.map((c) => (
                <li key={c.id}>
                  <FollowUpRow
                    followUp={c}
                    members={memberOptions}
                  />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <FollowUpFormDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        title="מעקב חדש"
        members={memberOptions}
        submitLabel="צור מעקב"
        onSubmit={(v) => {
          followUpRepo.create(v);
          toast.success("נוצר מעקב חדש");
        }}
      />
    </div>
  );
}

function FollowUpRow({
  followUp,
  members,
}: {
  followUp: FollowUpCase;
  members: ReadonlyArray<{ id: string; name: string }>;
}) {
  const now = NOW();
  const due = isDueForFollowUp(followUp, now);
  const owner = resolveMemberName(followUp.responsibleMemberId, members);
  const last = followUp.actions[0];

  return (
    <Link
      to="/follow-ups/$caseId"
      params={{ caseId: followUp.id }}
      className="block"
    >
      <Card className="hover:border-primary/60 transition-colors">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{followUp.title}</h3>
                {due && (
                  <Badge variant="destructive" className="text-xs">
                    הגיע הזמן לעקוב
                  </Badge>
                )}
                {followUp.sensitivity !== "household" && (
                  <Badge variant="outline" className="text-xs">
                    {SENSITIVITY_LABEL[followUp.sensitivity]}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {followUp.externalParty} · אחראי: {owner}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${STATUS_TONE[followUp.status]}`}
            >
              {STATUS_LABEL[followUp.status]}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
            <div>
              <dt className="font-medium text-foreground">מי מחזיק בכדור</dt>
              <dd>{BALL_HOLDER_LABEL[followUp.ballHolder]}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">מעקב הבא</dt>
              <dd>
                {followUp.nextFollowUpAt
                  ? formatDate(followUp.nextFollowUpAt)
                  : followUp.followUpDisabledReason
                    ? "ללא תזכורת"
                    : "—"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">פעולה אחרונה</dt>
              <dd className="truncate">{last?.description ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">נפתח</dt>
              <dd>{formatDate(followUp.openedAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center">
      <p className="text-sm text-muted-foreground">אין מעקבים בקטגוריה זו.</p>
      <Button variant="secondary" className="mt-3" onClick={onCreate}>
        פתיחת מעקב חדש
      </Button>
    </div>
  );
}
