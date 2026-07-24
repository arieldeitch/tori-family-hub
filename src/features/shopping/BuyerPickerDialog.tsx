import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { claimBuyer } from "@/application/shoppingService";
import type { Role, ShoppingItem } from "@/domain/shopping";
import type { Member } from "@/domain/household";
import { toast } from "sonner";

interface Props {
  item: ShoppingItem | null;
  members: ReadonlyArray<Member>;
  onClose: () => void;
  actor: { role: Role };
}

export function BuyerPickerDialog({ item, members, onClose, actor }: Props) {
  const eligible = members.filter((m) => m.role === "owner" || m.role === "adult");
  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>מי קונה?</DialogTitle>
        </DialogHeader>
        {eligible.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין מבוגרים זמינים במשק הבית.</p>
        ) : (
          <ul className="space-y-2" role="list">
            {eligible.map((m) => (
              <li key={m.id}>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    if (!item) return;
                    try {
                      claimBuyer(item.id, m.id, actor);
                      toast.success(`${m.name} סומן/ה כקונה`);
                      onClose();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "שגיאה");
                    }
                  }}
                >
                  <span
                    className="ms-2 inline-block h-3 w-3 rounded-full"
                    style={{ background: m.color }}
                    aria-hidden
                  />
                  {m.name}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
