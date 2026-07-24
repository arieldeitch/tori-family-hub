import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Weekday } from "@/domain/shifts";
import { WEEKDAY_LABEL } from "./human";

interface Props {
  value: Partial<Record<Weekday, string>>;
  participantMemberIds: ReadonlyArray<string>;
  members: ReadonlyArray<{ id: string; name: string }>;
  onChange: (next: Partial<Record<Weekday, string>>) => void;
  disabled?: boolean;
}

const DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const UNASSIGNED = "__unassigned__";

export function WeekdayFixedEditor({
  value,
  participantMemberIds,
  members,
  onChange,
  disabled,
}: Props) {
  const options = members.filter((m) => participantMemberIds.includes(m.id));
  const update = (day: Weekday, id: string) => {
    const next = { ...value };
    if (id === UNASSIGNED) delete next[day];
    else next[day] = id;
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {DAYS.map((d) => (
        <div key={d} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] items-center gap-2">
          <label className="text-sm text-muted-foreground" htmlFor={`wd-${d}`}>
            {WEEKDAY_LABEL[d]}
          </label>
          <Select
            value={value[d] ?? UNASSIGNED}
            onValueChange={(v) => update(d, v)}
            disabled={disabled}
          >
            <SelectTrigger id={`wd-${d}`}>
              <SelectValue placeholder="ללא שיבוץ קבוע" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>ללא שיבוץ קבוע</SelectItem>
              {options.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
      {options.length === 0 && (
        <p className="text-xs text-muted-foreground">
          בחרו קודם משתתפים כדי להגדיר שיבוץ ליום קבוע.
        </p>
      )}
    </div>
  );
}
