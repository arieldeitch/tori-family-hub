import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { FollowUpActionKind } from "@/domain/followUp";
import { ACTION_KIND_LABEL, fromDateInputValue, toDateInputValue } from "./labels";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  members: ReadonlyArray<{ id: string; name: string }>;
  defaultMemberId?: string;
  onSubmit: (input: {
    kind: FollowUpActionKind;
    description: string;
    byMemberId: string;
    nextFollowUpAt?: string;
  }) => void;
}

const KINDS: FollowUpActionKind[] = [
  "called",
  "emailed",
  "message_sent",
  "meeting",
  "response_received",
  "note",
  "reminder_set",
  "status_changed",
];

export function AddActionDialog({ open, onOpenChange, members, defaultMemberId, onSubmit }: Props) {
  const [kind, setKind] = useState<FollowUpActionKind>("called");
  const [description, setDescription] = useState("");
  const [byMemberId, setByMemberId] = useState(defaultMemberId ?? members[0]?.id ?? "");
  const [nextFollowUpAt, setNextFollowUpAt] = useState<string | undefined>();

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !byMemberId) return;
    onSubmit({
      kind,
      description: description.trim(),
      byMemberId,
      nextFollowUpAt,
    });
    setDescription("");
    setNextFollowUpAt(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>הוספת פעולה ל־timeline</DialogTitle>
        </DialogHeader>
        <form onSubmit={handle} className="space-y-3">
          <div className="space-y-1">
            <Label>סוג פעולה</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as FollowUpActionKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {ACTION_KIND_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="a-desc">תיאור קצר</Label>
            <Textarea
              id="a-desc"
              rows={2}
              value={description}
              maxLength={280}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <Label>מי ביצע</Label>
            <Select value={byMemberId} onValueChange={setByMemberId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="a-next">תאריך מעקב הבא (אופציונלי)</Label>
            <Input
              id="a-next"
              type="date"
              value={toDateInputValue(nextFollowUpAt)}
              onChange={(e) => setNextFollowUpAt(fromDateInputValue(e.target.value))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
            <Button type="submit">הוסף</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
