import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { mergeInto } from "@/application/shoppingService";
import type { Role, ShoppingItem } from "@/domain/shopping";
import { toast } from "sonner";

interface Props {
  open: boolean;
  newItemId?: string;
  candidates: ShoppingItem[];
  onClose: () => void;
  actor: { role: Role };
}

// Never merges automatically. The user must pick Merge or Add anyway.
export function DuplicateSuggestionDialog({
  open,
  newItemId,
  candidates,
  onClose,
  actor,
}: Props) {
  const primary = candidates[0];
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>יש פריט דומה פתוח</DialogTitle>
          <DialogDescription>
            {primary
              ? `כבר קיים פריט פתוח בשם "${primary.name}" (כמות ${primary.quantity}${primary.unit ? ` ${primary.unit}` : ""}).`
              : "נמצאו פריטים דומים."}
            <br />
            אף פריט לא אוחד אוטומטית — אתם מחליטים.
          </DialogDescription>
        </DialogHeader>
        {candidates.length > 1 && (
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground" role="list">
            {candidates.map((c) => (
              <li key={c.id}>
                • {c.name} · {c.quantity}
                {c.unit ? ` ${c.unit}` : ""}
              </li>
            ))}
          </ul>
        )}
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={onClose}>
            ביטול
          </Button>
          <Button variant="secondary" onClick={onClose}>
            הוספה בכל זאת
          </Button>
          <Button
            onClick={() => {
              if (!primary || !newItemId) return onClose();
              try {
                mergeInto(primary.id, newItemId, actor);
                toast.success("הפריטים אוחדו");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "שגיאה באיחוד");
              }
              onClose();
            }}
            disabled={!primary || !newItemId}
          >
            איחוד
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
