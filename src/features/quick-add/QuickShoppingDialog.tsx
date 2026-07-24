// Minimal shopping-item form used from Quick Add. Requires a list; if the
// household has none, offers the built-in "Home" list as fallback.
// Retains input on failure. Success only after the service returns.
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { addItem, listLists } from "@/application/shoppingService";
import { DEMO_VIEWER_ID } from "@/data/peopleDirectory";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickShoppingDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const lists = useMemo(() => listLists(), [open]);
  const [listId, setListId] = useState<string>(lists[0]?.id ?? "");
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");

  function reset() {
    setName("");
    setQty("1");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("יש להזין שם פריט");
      return;
    }
    const q = Number(qty);
    if (!Number.isFinite(q) || q <= 0) {
      toast.error("כמות לא תקינה");
      return;
    }
    if (!listId) {
      toast.error("אין רשימת קניות זמינה");
      return;
    }
    try {
      const { item, duplicates } = addItem(
        {
          listId,
          name: trimmed,
          quantity: q,
          requestedByMemberId: DEMO_VIEWER_ID,
        },
        { role: "adult" },
      );
      toast.success(duplicates.length > 0 ? "הפריט נוסף. נמצאו פריטים דומים ברשימה" : "הפריט נוסף");
      reset();
      onOpenChange(false);
      void item;
      void navigate({ to: "/shopping/$listId", params: { listId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "אירעה שגיאה בשמירה");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : onOpenChange(false))}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>פריט קניות חדש</DialogTitle>
          <DialogDescription>שם וכמות מספיקים. אפשר לערוך פרטים ברשימה.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sh-list">רשימה</Label>
            <Select value={listId} onValueChange={setListId}>
              <SelectTrigger id="sh-list">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lists.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-[1fr_5rem] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sh-name">שם *</Label>
              <Input
                id="sh-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="למשל: חלב"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sh-qty">כמות</Label>
              <Input
                id="sh-qty"
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              ביטול
            </Button>
            <Button type="submit">הוספה לרשימה</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
