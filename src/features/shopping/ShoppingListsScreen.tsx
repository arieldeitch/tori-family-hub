import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, ShoppingBasket } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/design-system/EmptyState";
import { useShopping } from "@/lib/useShopping";
import { createList, listItems } from "@/application/shoppingService";
import { isOpen } from "@/domain/shopping";
import { toast } from "sonner";

export function ShoppingListsScreen() {
  const { lists } = useShopping();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      createList({ name: trimmed }, { role: "owner" });
      setName("");
      setOpen(false);
      toast.success("הרשימה נוצרה");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "לא הצלחנו ליצור רשימה");
    }
  }

  if (lists.length === 0) {
    return (
      <div className="px-4 py-6">
        <EmptyState
          icon={<ShoppingBasket className="h-8 w-8" />}
          title="עדיין אין רשימות קניות"
          description="פתחו רשימה ראשונה כדי לרכז מה חסר בבית."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="ms-2 h-4 w-4" />
              יצירת רשימה
            </Button>
          }
        />
        <CreateListDialog
          open={open}
          onOpenChange={setOpen}
          name={name}
          setName={setName}
          onSubmit={submit}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">רשימות פעילות</h2>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="ms-2 h-4 w-4" />
          רשימה חדשה
        </Button>
      </div>
      <ul className="space-y-2" role="list">
        {lists.map((list) => {
          const items = listItems(list.id);
          const openCount = items.filter((i) => isOpen(i.status)).length;
          return (
            <li key={list.id}>
              <Link
                to="/shopping/$listId"
                params={{ listId: list.id }}
                className="flex items-center justify-between rounded-lg border bg-card p-4 hover:bg-accent"
              >
                <div>
                  <div className="font-medium">{list.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {openCount === 0 ? "אין פריטים פתוחים" : `${openCount} פריטים פתוחים`}
                  </div>
                </div>
                <span aria-hidden className="text-muted-foreground">
                  ‹
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <CreateListDialog
        open={open}
        onOpenChange={setOpen}
        name={name}
        setName={setName}
        onSubmit={submit}
      />
    </div>
  );
}

function CreateListDialog({
  open,
  onOpenChange,
  name,
  setName,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
  setName: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>רשימת קניות חדשה</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="new-list-name">שם הרשימה</Label>
          <Input
            id="new-list-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="לדוגמה: קניות שבועיות"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button onClick={onSubmit} disabled={!name.trim()}>
            יצירה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
