import { useNavigate } from "@tanstack/react-router";
import {
  CheckSquare,
  ShoppingCart,
  Car,
  CalendarDays,
  ClipboardList,
  MessageCircle,
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

interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Item = {
  key: string;
  label: string;
  icon: LucideIcon;
  action: () => void;
};

export function QuickAddSheet({ open, onOpenChange }: QuickAddSheetProps) {
  const navigate = useNavigate();

  const notAvailable = () => {
    toast.info(t("quickAdd.notAvailable"));
    onOpenChange(false);
  };

  const items: Item[] = [
    { key: "task", label: t("quickAdd.task"), icon: CheckSquare, action: notAvailable },
    {
      key: "shopping",
      label: t("quickAdd.shoppingItem"),
      icon: ShoppingCart,
      action: notAvailable,
    },
    { key: "transport", label: t("quickAdd.transport"), icon: Car, action: notAvailable },
    { key: "event", label: t("quickAdd.event"), icon: CalendarDays, action: notAvailable },
    { key: "errand", label: t("quickAdd.errand"), icon: Sparkles, action: notAvailable },
    {
      key: "followUp",
      label: t("quickAdd.followUp"),
      icon: ClipboardList,
      action: () => {
        onOpenChange(false);
        navigate({ to: "/follow-ups" });
      },
    },
    {
      key: "familyMessage",
      label: t("quickAdd.familyMessage"),
      icon: MessageCircle,
      action: notAvailable,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader className="text-start">
          <SheetTitle>{t("quickAdd.title")}</SheetTitle>
          <SheetDescription>{t("quickAdd.subtitle")}</SheetDescription>
        </SheetHeader>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={item.action}
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
  );
}
