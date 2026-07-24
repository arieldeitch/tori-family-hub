import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateItem } from "@/application/shoppingService";
import type { Role, ShoppingItem, ShoppingUrgency } from "@/domain/shopping";
import { toast } from "sonner";

interface Props {
  item: ShoppingItem | null;
  onClose: () => void;
  actor: { role: Role };
}

export function EditItemDialog({ item, onClose, actor }: Props) {
  const [form, setForm] = useState<ShoppingItem | null>(item);
  useEffect(() => setForm(item), [item]);

  if (!form) return null;

  function set<K extends keyof ShoppingItem>(k: K, v: ShoppingItem[K]) {
    setForm((f) => (f ? { ...f, [k]: v } : f));
  }

  function save() {
    if (!form) return;
    try {
      updateItem(
        form.id,
        {
          name: form.name,
          quantity: form.quantity,
          unit: form.unit,
          category: form.category,
          preferredStore: form.preferredStore,
          urgency: form.urgency,
          estimatedPrice: form.estimatedPrice,
          allowSubstitute: form.allowSubstitute,
          note: form.note,
        },
        actor,
      );
      toast.success("הפריט עודכן");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בעדכון");
    }
  }

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>עריכת פריט</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="ei-name">שם</Label>
            <Input id="ei-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="ei-qty">כמות</Label>
              <Input
                id="ei-qty"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => set("quantity", Number(e.target.value))}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="ei-unit">יחידה</Label>
              <Input
                id="ei-unit"
                value={form.unit ?? ""}
                onChange={(e) => set("unit", e.target.value || undefined)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="ei-cat">קטגוריה</Label>
              <Input
                id="ei-cat"
                value={form.category ?? ""}
                onChange={(e) => set("category", e.target.value || undefined)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="ei-store">חנות מועדפת</Label>
              <Input
                id="ei-store"
                value={form.preferredStore ?? ""}
                onChange={(e) => set("preferredStore", e.target.value || undefined)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label>דחיפות</Label>
              <Select
                value={form.urgency}
                onValueChange={(v) => set("urgency", v as ShoppingUrgency)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">נמוכה</SelectItem>
                  <SelectItem value="normal">רגילה</SelectItem>
                  <SelectItem value="high">דחוף</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="ei-price">מחיר מוערך</Label>
              <Input
                id="ei-price"
                type="number"
                min={0}
                value={form.estimatedPrice ?? ""}
                onChange={(e) =>
                  set("estimatedPrice", e.target.value === "" ? undefined : Number(e.target.value))
                }
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="ei-sub">אפשר תחליף</Label>
            <Switch
              id="ei-sub"
              checked={form.allowSubstitute}
              onCheckedChange={(v) => set("allowSubstitute", v)}
            />
          </div>
          <div>
            <Label htmlFor="ei-note">הערה</Label>
            <Textarea
              id="ei-note"
              value={form.note ?? ""}
              onChange={(e) => set("note", e.target.value || undefined)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            ביטול
          </Button>
          <Button onClick={save}>שמירה</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
