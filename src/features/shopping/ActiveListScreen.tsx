import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Pencil, Search, ShoppingBasket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/design-system/EmptyState";
import { useShopping } from "@/lib/useShopping";
import {
  addItem,
  claimBuyer,
  findDuplicates,
  getList,
  markPurchased,
  markUnavailable,
  releaseBuyer,
  removeItem,
} from "@/application/shoppingService";
import { isOpen, type ShoppingItem } from "@/domain/shopping";
import { useHousehold } from "@/lib/useHousehold";
import { toast } from "sonner";
import { STATUS_LABEL, SYNC_LABEL } from "./labels";
import { DuplicateSuggestionDialog } from "./DuplicateSuggestionDialog";
import { EditItemDialog } from "./EditItemDialog";
import { BuyerPickerDialog } from "./BuyerPickerDialog";

interface Props {
  listId: string;
}

export function ActiveListScreen({ listId }: Props) {
  const { items } = useShopping();
  const { members } = useHousehold();
  const list = getList(listId);
  const [query, setQuery] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickQty, setQuickQty] = useState("1");
  const [dup, setDup] = useState<{ newItemId: string; candidates: ShoppingItem[] } | null>(null);
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [pickingBuyerFor, setPickingBuyerFor] = useState<ShoppingItem | null>(null);

  const actor = { role: "owner" as const };
  const currentMemberId = members[0]?.id ?? "seed";

  const listItemsAll = useMemo(() => items.filter((i) => i.listId === listId), [items, listId]);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? listItemsAll.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.category?.toLowerCase().includes(q) ?? false),
      )
    : listItemsAll;
  const openItems = filtered.filter((i) => isOpen(i.status));
  const purchasedItems = filtered.filter((i) => i.status === "purchased");
  const otherClosed = filtered.filter(
    (i) => i.status === "unavailable" || i.status === "removed",
  );

  if (!list) {
    return (
      <div className="px-4 py-8">
        <EmptyState
          icon={<ShoppingBasket className="h-8 w-8" />}
          title="הרשימה לא נמצאה"
          description="ייתכן שהרשימה נמחקה או שהקישור שגוי."
          action={
            <Button asChild variant="ghost">
              <Link to="/shopping">חזרה לרשימות</Link>
            </Button>
          }
        />
      </div>
    );
  }

  function submitQuickAdd() {
    const name = quickName.trim();
    const qty = Number(quickQty);
    if (!name || !Number.isFinite(qty) || qty <= 0) return;
    try {
      const { item, duplicates } = addItem(
        {
          listId,
          name,
          quantity: qty,
          requestedByMemberId: currentMemberId,
        },
        actor,
      );
      setQuickName("");
      setQuickQty("1");
      if (duplicates.length > 0) {
        setDup({ newItemId: item.id, candidates: duplicates });
      } else {
        toast.success("הפריט נוסף");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "לא הצלחנו להוסיף פריט");
    }
  }

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="חזרה">
          <Link to="/shopping">
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-lg font-semibold">{list.name}</h2>
      </div>

      {/* Quick add */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitQuickAdd();
        }}
        className="flex gap-2 rounded-lg border bg-card p-3"
        aria-label="הוספת פריט מהירה"
      >
        <Input
          value={quickName}
          onChange={(e) => setQuickName(e.target.value)}
          placeholder="שם פריט"
          aria-label="שם פריט"
        />
        <Input
          value={quickQty}
          onChange={(e) => setQuickQty(e.target.value)}
          type="number"
          min={1}
          className="w-20"
          aria-label="כמות"
        />
        <Button type="submit" disabled={!quickName.trim()}>
          הוספה
        </Button>
      </form>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש ברשימה"
          className="pe-9"
          aria-label="חיפוש ברשימה"
        />
      </div>

      {/* Open items */}
      <section aria-label="פריטים פתוחים" className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">פתוחים ({openItems.length})</h3>
        {openItems.length === 0 ? (
          <EmptyState
            icon={<ShoppingBasket className="h-6 w-6" />}
            title="הרשימה ריקה"
            description="הוסיפו פריט למעלה כדי להתחיל."
          />
        ) : (
          <ul className="space-y-2" role="list">
            {openItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                buyerName={
                  members.find((m) => m.id === item.assignedBuyerMemberId)?.name
                }
                onEdit={() => setEditing(item)}
                onPickBuyer={() => setPickingBuyerFor(item)}
                onClaimSelf={() => {
                  try {
                    claimBuyer(item.id, currentMemberId, actor);
                    toast.success("נרשמת כקונה");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "שגיאה");
                  }
                }}
                onRelease={() => {
                  try {
                    releaseBuyer(item.id, actor);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "שגיאה");
                  }
                }}
                onPurchased={() => {
                  try {
                    markPurchased(item.id, currentMemberId, actor);
                    toast.success("סומן כנרכש");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "שגיאה");
                  }
                }}
                onUnavailable={() => {
                  try {
                    markUnavailable(item.id, actor);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "שגיאה");
                  }
                }}
                onRemove={() => {
                  try {
                    removeItem(item.id, actor);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "שגיאה");
                  }
                }}
                onShowDuplicates={() => {
                  const cands = findDuplicates(listId, item.name).filter((c) => c.id !== item.id);
                  if (cands.length === 0) {
                    toast.info("לא נמצאו כפילויות פתוחות");
                  } else {
                    setDup({ newItemId: item.id, candidates: cands });
                  }
                }}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Purchased */}
      {purchasedItems.length > 0 && (
        <section aria-label="נרכשו" className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            נרכשו ({purchasedItems.length})
          </h3>
          <ul className="space-y-2 opacity-75" role="list">
            {purchasedItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-lg border bg-card p-3"
              >
                <div>
                  <div className="font-medium line-through">{item.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.quantity}
                    {item.unit ? ` ${item.unit}` : ""} · {STATUS_LABEL[item.status]}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {otherClosed.length > 0 && (
        <section aria-label="אחר" className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">סגורים אחרים</h3>
          <ul className="space-y-2 opacity-60" role="list">
            {otherClosed.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm"
              >
                <span>{item.name}</span>
                <span className="text-muted-foreground">{STATUS_LABEL[item.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DuplicateSuggestionDialog
        open={!!dup}
        newItemId={dup?.newItemId}
        candidates={dup?.candidates ?? []}
        onClose={() => setDup(null)}
        actor={actor}
      />
      <EditItemDialog item={editing} onClose={() => setEditing(null)} actor={actor} />
      <BuyerPickerDialog
        item={pickingBuyerFor}
        members={members}
        onClose={() => setPickingBuyerFor(null)}
        actor={actor}
      />
    </div>
  );
}

interface RowProps {
  item: ShoppingItem;
  buyerName?: string;
  onEdit: () => void;
  onPickBuyer: () => void;
  onClaimSelf: () => void;
  onRelease: () => void;
  onPurchased: () => void;
  onUnavailable: () => void;
  onRemove: () => void;
  onShowDuplicates: () => void;
}

function ItemRow(p: RowProps) {
  const { item } = p;
  return (
    <li className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.name}</span>
            {item.urgency === "high" && (
              <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                דחוף
              </span>
            )}
            {item.syncStatus !== "synced" && (
              <span
                className={
                  item.syncStatus === "failed"
                    ? "text-xs text-destructive"
                    : "text-xs text-muted-foreground"
                }
              >
                {SYNC_LABEL[item.syncStatus]}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {item.quantity}
            {item.unit ? ` ${item.unit}` : ""}
            {item.category ? ` · ${item.category}` : ""}
            {item.preferredStore ? ` · ${item.preferredStore}` : ""}
          </div>
          {item.assignedBuyerMemberId && (
            <div className="mt-1 text-xs">
              בקנייה אצל: <span className="font-medium">{p.buyerName ?? "לא ידוע"}</span>
            </div>
          )}
          {item.note && <div className="mt-1 text-xs text-muted-foreground">{item.note}</div>}
        </div>
        <div className="flex flex-col gap-1">
          <Button size="icon" variant="ghost" aria-label="עריכה" onClick={p.onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="בדיקת כפילויות"
            onClick={p.onShowDuplicates}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {item.status === "needed" ? (
          <>
            <Button size="sm" variant="secondary" onClick={p.onClaimSelf}>
              אני קונה
            </Button>
            <Button size="sm" variant="ghost" onClick={p.onPickBuyer}>
              בחירת קונה
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={p.onRelease}>
            שחרור קונה
          </Button>
        )}
        <Button size="sm" onClick={p.onPurchased}>
          <Check className="ms-1 h-4 w-4" /> נרכש
        </Button>
        <Button size="sm" variant="ghost" onClick={p.onUnavailable}>
          לא נמצא
        </Button>
        <Button size="sm" variant="ghost" aria-label="הסרה" onClick={p.onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
