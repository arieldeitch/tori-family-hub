import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CheckSquare,
  ShoppingCart,
  Car,
  CalendarDays,
  ClipboardList,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { t } from "@/lib/i18n";
import { useHousehold } from "@/lib/useHousehold";
import { CANONICAL_MEMBERS, DEMO_VIEWER_ID } from "@/data/peopleDirectory";
import { QuickTaskForm } from "@/features/tasks/QuickTaskForm";
import { ErrandFormDialog } from "@/features/errands/ErrandFormDialog";
import { FollowUpFormDialog } from "@/features/follow-ups/FollowUpFormDialog";
import * as followUpRepo from "@/data/followUpRepo";
import { QuickShoppingDialog } from "@/features/quick-add/QuickShoppingDialog";
import { QuickEventDialog } from "@/features/quick-add/QuickEventDialog";

interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Kind = "task" | "shopping" | "transport" | "event" | "errand" | "followUp";
type Item = { key: Kind; label: string; icon: LucideIcon };

const ITEMS: Item[] = [
  { key: "task", label: t("quickAdd.task"), icon: CheckSquare },
  { key: "shopping", label: t("quickAdd.shoppingItem"), icon: ShoppingCart },
  { key: "transport", label: t("quickAdd.transport"), icon: Car },
  { key: "event", label: t("quickAdd.event"), icon: CalendarDays },
  { key: "errand", label: t("quickAdd.errand"), icon: Sparkles },
  { key: "followUp", label: t("quickAdd.followUp"), icon: ClipboardList },
];

export function QuickAddSheet({ open, onOpenChange }: QuickAddSheetProps) {
  const navigate = useNavigate();
  const [active, setActive] = useState<Kind | null>(null);

  const household = useHousehold();
  // Prefer household members once onboarding is complete; otherwise fall back
  // to the canonical demo directory so Quick Add works from the get-go.
  const members =
    household.members.length > 0
      ? household.members.map((m) => ({ id: m.id, name: m.name }))
      : CANONICAL_MEMBERS.map((m) => ({ id: m.id, name: m.name }));
  const actorId = household.members[0]?.id ?? DEMO_VIEWER_ID;

  function pick(k: Kind) {
    onOpenChange(false);
    if (k === "transport") {
      // Transport has a full-page form; navigate rather than duplicate the UI.
      void navigate({ to: "/transport/new" });
      return;
    }
    // Defer opening the dialog until after the sheet's close animation so
    // focus management doesn't fight itself.
    setTimeout(() => setActive(k), 50);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="text-start">
            <SheetTitle>{t("quickAdd.title")}</SheetTitle>
            <SheetDescription>{t("quickAdd.subtitle")}</SheetDescription>
          </SheetHeader>
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => pick(item.key)}
                    className="flex min-h-[88px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface p-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                    <span className="text-center">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>

      <QuickTaskForm
        open={active === "task"}
        onOpenChange={(o) => !o && setActive(null)}
        members={members}
        currentActorId={actorId}
      />
      <ErrandFormDialog
        open={active === "errand"}
        onOpenChange={(o) => !o && setActive(null)}
        members={members}
        currentActorId={actorId}
      />
      <FollowUpFormDialog
        open={active === "followUp"}
        onOpenChange={(o) => !o && setActive(null)}
        title="מעקב חדש"
        members={members}
        submitLabel="צור מעקב"
        onSubmit={(v) => {
          try {
            const created = followUpRepo.create(v);
            toast.success("נוצר מעקב חדש");
            setActive(null);
            void navigate({ to: "/follow-ups/$caseId", params: { caseId: created.id } });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "אירעה שגיאה בשמירה");
          }
        }}
      />
      <QuickShoppingDialog
        open={active === "shopping"}
        onOpenChange={(o) => !o && setActive(null)}
      />
      <QuickEventDialog open={active === "event"} onOpenChange={(o) => !o && setActive(null)} />
    </>
  );
}
