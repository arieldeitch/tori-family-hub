import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Info } from "lucide-react";
import { t } from "@/lib/i18n";
import { useHousehold } from "@/lib/useHousehold";
import { householdRepo } from "@/data/householdRepo";
import { isPrivilegedRole } from "@/domain/household";
import { MemberCard } from "@/features/household/MemberCard";
import { AddMemberDialog } from "@/features/household/AddMemberDialog";

// Demo assumption: current active viewer = the owner (if one exists).
// Real auth wiring will replace this later.
function useViewer() {
  const { members } = useHousehold();
  return members.find((m) => m.role === "owner") ?? members[0] ?? null;
}

export function HouseholdScreen() {
  const { household, members } = useHousehold();
  const viewer = useViewer();
  const canManage = viewer ? isPrivilegedRole(viewer.role) : true;
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const pendingMember = members.find((m) => m.id === pendingRemoveId) ?? null;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{household?.name ?? "—"}</p>
          <h1 className="text-2xl font-semibold">{t("household.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("household.subtitle")}</p>
        </div>
        <Badge variant="outline">{t("household.demoBadge")}</Badge>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {canManage ? (
          <>
            <AddMemberDialog
              kind="adult"
              trigger={<Button size="sm">{t("onboarding.members.addAdult")}</Button>}
            />
            <AddMemberDialog
              kind="child"
              trigger={
                <Button size="sm" variant="secondary">
                  {t("onboarding.members.addChild")}
                </Button>
              }
            />
            <AddMemberDialog
              kind="guest"
              trigger={
                <Button size="sm" variant="secondary">
                  {t("onboarding.members.addGuest")}
                </Button>
              }
            />
          </>
        ) : null}
        {members.length === 0 ? (
          <Button size="sm" variant="ghost" onClick={() => householdRepo.seedDemo()}>
            {t("household.seedDemo")}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => householdRepo.reset()}>
            {t("household.resetDemo")}
          </Button>
        )}
      </div>

      <Alert className="mb-4">
        <Info className="h-4 w-4" aria-hidden />
        <AlertDescription>{t("household.permissionsNote")}</AlertDescription>
      </Alert>

      <section className="space-y-2">
        {members.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            {t("household.empty")}
          </Card>
        ) : (
          members.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              canRemove={canManage && m.role !== "owner"}
              onRemove={(id) => setPendingRemoveId(id)}
            />
          ))
        )}
      </section>

      {members.some((m) => m.role === "child") ? (
        <div className="mt-6 text-center">
          <Button asChild variant="link">
            <Link to="/child">{t("home.goChild")} →</Link>
          </Button>
        </div>
      ) : null}

      <AlertDialog
        open={pendingRemoveId !== null}
        onOpenChange={(o) => !o && setPendingRemoveId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("household.confirmRemoveTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingMember?.name} — {t("household.confirmRemoveBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("memberForm.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRemoveId) householdRepo.removeMember(pendingRemoveId);
                setPendingRemoveId(null);
              }}
            >
              {t("household.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
