// Minimal "basic event" form used from Quick Add. Essential fields only.
// Retains input on validation failure. Announces success only after the
// repository has been updated. Navigates the user to the calendar view.
import { useState } from "react";
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
import { calendarRepo, calendarMembers } from "@/data/calendarRepo";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MEMBERS = Object.values(calendarMembers);

export function QuickEventDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState(MEMBERS[0]!.id);
  const [start, setStart] = useState("");
  const [durationMin, setDurationMin] = useState("60");
  const [location, setLocation] = useState("");

  function reset() {
    setTitle("");
    setOwnerId(MEMBERS[0]!.id);
    setStart("");
    setDurationMin("60");
    setLocation("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("יש להזין כותרת לאירוע");
      return;
    }
    if (!start) {
      toast.error("יש לבחור מועד התחלה");
      return;
    }
    const dur = Number(durationMin);
    if (!Number.isFinite(dur) || dur <= 0) {
      toast.error("משך האירוע לא תקין");
      return;
    }
    try {
      const startDate = new Date(start);
      const endDate = new Date(startDate.getTime() + dur * 60 * 1000);
      calendarRepo.create({
        title: trimmed,
        ownerMemberId: ownerId,
        startISO: startDate.toISOString(),
        endISO: endDate.toISOString(),
        location: location.trim() || undefined,
      });
      toast.success("האירוע נוסף ללוח");
      reset();
      onOpenChange(false);
      void navigate({ to: "/calendar" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "אירעה שגיאה בשמירה");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : onOpenChange(false))}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>אירוע חדש</DialogTitle>
          <DialogDescription>שדות חיוניים בלבד. פרטים נוספים אפשר להוסיף בלוח.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ev-title">כותרת *</Label>
            <Input
              id="ev-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="למשל: חוג ציור"
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-owner">שייך ל</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger id="ev-owner">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEMBERS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-start">מתחיל *</Label>
              <Input
                id="ev-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-dur">משך (דקות)</Label>
              <Input
                id="ev-dur"
                type="number"
                min={5}
                step={5}
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-loc">מיקום</Label>
            <Input
              id="ev-loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="לא חובה"
            />
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
            <Button type="submit">הוספה ללוח</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
