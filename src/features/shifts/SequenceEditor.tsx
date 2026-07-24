import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, X } from "lucide-react";

interface Props {
  order: string[]; // memberIds in current sequence
  members: ReadonlyArray<{ id: string; name: string }>;
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

/**
 * Buttons-only sequence editor (no drag-and-drop). Keyboard accessible.
 * If drag support is added later, it MUST remain in addition to these buttons.
 */
export function SequenceEditor({ order, members, onChange, disabled }: Props) {
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...order];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap]!, next[idx]!];
    onChange(next);
  };
  const remove = (idx: number) => {
    const next = [...order];
    next.splice(idx, 1);
    onChange(next);
  };

  if (order.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        עדיין לא נקבע סדר בסבב. בחרו משתתפים כדי להגדיר סדר.
      </p>
    );
  }

  return (
    <ol className="space-y-1.5" aria-label="סדר המשתתפים בסבב">
      {order.map((id, idx) => (
        <li
          key={id}
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border bg-card p-2"
        >
          <span
            aria-hidden
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold"
          >
            {idx + 1}
          </span>
          <span className="min-w-0 truncate text-sm">{nameOf(id)}</span>
          <span className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => move(idx, -1)}
              disabled={disabled || idx === 0}
              aria-label={`להעביר את ${nameOf(id)} למעלה בסבב`}
            >
              <ArrowUp className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => move(idx, 1)}
              disabled={disabled || idx === order.length - 1}
              aria-label={`להעביר את ${nameOf(id)} למטה בסבב`}
            >
              <ArrowDown className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => remove(idx)}
              disabled={disabled}
              aria-label={`להסיר את ${nameOf(id)} מהסבב`}
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </span>
        </li>
      ))}
    </ol>
  );
}
