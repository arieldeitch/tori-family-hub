import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import * as shiftsRepo from "@/data/shiftsRepo";
import { useShiftAvailability } from "@/lib/useShifts";
import { formatDate } from "./human";

interface Props {
  participantMemberIds: ReadonlyArray<string>;
  members: ReadonlyArray<{ id: string; name: string }>;
}

/**
 * Basic per-date unavailability marker. Prototype-only.
 */
export function AvailabilityEditor({ participantMemberIds, members }: Props) {
  const availability = useShiftAvailability();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState<string>(today);
  const activeMembers = members.filter((m) => participantMemberIds.includes(m.id));
  const unavailable = availability[date] ?? [];

  if (activeMembers.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">בחרו משתתפים כדי לסמן חוסר זמינות.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="תאריך לסימון חוסר זמינות"
        />
        <span className="shrink-0 text-xs text-muted-foreground">{formatDate(date)}</span>
      </div>
      <ul className="space-y-1">
        {activeMembers.map((m) => {
          const off = unavailable.includes(m.id);
          const id = `av-${m.id}`;
          return (
            <li key={m.id}>
              <label
                htmlFor={id}
                className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm"
              >
                <Checkbox
                  id={id}
                  checked={off}
                  onCheckedChange={() => shiftsRepo.toggleUnavailable(date, m.id)}
                  aria-label={`${m.name} לא זמין ב־${formatDate(date)}`}
                />
                <span className="min-w-0 truncate">{m.name}</span>
                {off && (
                  <span className="mr-auto text-xs text-muted-foreground">לא זמין</span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => unavailable.forEach((id) => shiftsRepo.toggleUnavailable(date, id))}
          disabled={unavailable.length === 0}
        >
          איפוס לתאריך זה
        </Button>
      </div>
    </div>
  );
}
