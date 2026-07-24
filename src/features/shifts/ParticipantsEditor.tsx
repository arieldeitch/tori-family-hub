import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  selected: ReadonlyArray<string>;
  members: ReadonlyArray<{ id: string; name: string }>;
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

export function ParticipantsEditor({ selected, members, onChange, disabled }: Props) {
  if (members.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        אין בני בית להצגה. הוסיפו קודם בני משפחה במסך בני הבית.
      </p>
    );
  }
  const toggle = (id: string, on: boolean) => {
    if (on) onChange([...selected, id]);
    else onChange(selected.filter((x) => x !== id));
  };
  return (
    <ul className="space-y-1">
      {members.map((m) => {
        const checked = selected.includes(m.id);
        const inputId = `pt-${m.id}`;
        return (
          <li key={m.id}>
            <label
              htmlFor={inputId}
              className="flex cursor-pointer items-center gap-2 rounded-md border bg-card p-2 text-sm"
            >
              <Checkbox
                id={inputId}
                checked={checked}
                onCheckedChange={(v) => toggle(m.id, v === true)}
                disabled={disabled}
                aria-label={`שיוך ${m.name} לתורנות`}
              />
              <span className="min-w-0 truncate">{m.name}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
