import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Props {
  value: string | null;
  onChange: (value: string | null) => void;
  members: ReadonlyArray<{ id: string; name: string }>;
  label?: string;
  id?: string;
  allowUnassign?: boolean;
}

const UNASSIGNED = "__unassigned__";

export function AssignmentPicker({
  value,
  onChange,
  members,
  label = "אחראי",
  id = "assignee",
  allowUnassign = true,
}: Props) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value ?? UNASSIGNED}
        onValueChange={(v) => onChange(v === UNASSIGNED ? null : v)}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="בחר/י אחראי" />
        </SelectTrigger>
        <SelectContent>
          {allowUnassign && <SelectItem value={UNASSIGNED}>ללא אחראי</SelectItem>}
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
