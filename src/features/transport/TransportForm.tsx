import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { transportRepo, transportMembers } from "@/data/transportRepo";
import type { TransportRide, TransportDirection } from "@/domain/transport";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/design-system/FormField";

interface Props {
  mode: "create" | "edit";
  ride?: TransportRide;
  onDone?: () => void;
}

function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toISO(local: string): string | undefined {
  if (!local) return undefined;
  return new Date(local).toISOString();
}

const CHILDREN = Object.values(transportMembers).filter((m) => m.id === "m3" || m.id === "m4");
const ADULTS = Object.values(transportMembers).filter((m) => m.id === "m1" || m.id === "m2");

export function TransportForm({ mode, ride, onDone }: Props) {
  const navigate = useNavigate();
  const [childMemberId, setChildMemberId] = useState(ride?.childMemberId ?? CHILDREN[0]!.id);
  const [direction, setDirection] = useState<TransportDirection>(ride?.direction ?? "pickup");
  const [timeAt, setTimeAt] = useState(toLocalInput(ride?.timeAt) || toLocalInput(new Date(Date.now() + 60 * 60 * 1000).toISOString()));
  const [recommendedDepartureAt, setRecommendedDepartureAt] = useState(toLocalInput(ride?.recommendedDepartureAt));
  const [acceptanceDeadlineAt, setAcceptanceDeadlineAt] = useState(toLocalInput(ride?.acceptanceDeadlineAt));
  const [origin, setOrigin] = useState(ride?.origin ?? "");
  const [destination, setDestination] = useState(ride?.destination ?? "");
  const [assigneeMemberId, setAssigneeMemberId] = useState(ride?.assigneeMemberId ?? "");
  const [backupPlaceholder, setBackupPlaceholder] = useState(ride?.backupPlaceholder ?? "");
  const [equipment, setEquipment] = useState(ride?.equipment ?? "");
  const [notes, setNotes] = useState(ride?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => Boolean(childMemberId && timeAt && origin.trim() && destination.trim()),
    [childMemberId, timeAt, origin, destination],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      setError("חסרים שדות חובה.");
      return;
    }
    try {
      const patch = {
        childMemberId,
        direction,
        timeAt: toISO(timeAt)!,
        recommendedDepartureAt: toISO(recommendedDepartureAt),
        acceptanceDeadlineAt: toISO(acceptanceDeadlineAt),
        origin: origin.trim(),
        destination: destination.trim(),
        assigneeMemberId: assigneeMemberId || undefined,
        backupPlaceholder: backupPlaceholder.trim() || undefined,
        equipment: equipment.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (mode === "create") {
        const created = transportRepo.create(patch);
        onDone?.();
        void navigate({ to: "/transport/$rideId", params: { rideId: created.id } });
      } else if (ride) {
        transportRepo.edit(ride.id, patch);
        onDone?.();
        void navigate({ to: "/transport/$rideId", params: { rideId: ride.id } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירה");
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <FormField label="ילד/ה" id="tf-child">
        <select
          id="tf-child"
          className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
          value={childMemberId}
          onChange={(e) => setChildMemberId(e.target.value)}
        >
          {CHILDREN.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </FormField>

      <FormField label="סוג" id="tf-direction">
        <div id="tf-direction" className="grid grid-cols-2 gap-2">
          {(["pickup", "dropoff"] as const).map((d) => (
            <Button
              key={d}
              type="button"
              variant={direction === d ? "default" : "outline"}
              onClick={() => setDirection(d)}
              className="h-11"
            >
              {d === "pickup" ? "איסוף" : "הורדה"}
            </Button>
          ))}
        </div>
      </FormField>

      <FormField label="זמן" id="tf-time">
        <input
          id="tf-time"
          type="datetime-local"
          className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
          value={timeAt}
          onChange={(e) => setTimeAt(e.target.value)}
          required
        />
      </FormField>

      <FormField label="יציאה מומלצת (אופציונלי)" id="tf-dep">
        <input
          id="tf-dep"
          type="datetime-local"
          className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
          value={recommendedDepartureAt}
          onChange={(e) => setRecommendedDepartureAt(e.target.value)}
        />
      </FormField>

      <FormField label="יעד אישור (אופציונלי)" id="tf-dl">
        <input
          id="tf-dl"
          type="datetime-local"
          className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
          value={acceptanceDeadlineAt}
          onChange={(e) => setAcceptanceDeadlineAt(e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="מקור" id="tf-origin">
          <input
            id="tf-origin"
            type="text"
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            required
          />
        </FormField>
        <FormField label="יעד" id="tf-dest">
          <input
            id="tf-dest"
            type="text"
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
          />
        </FormField>
      </div>

      <FormField label="אחראי (אופציונלי)" id="tf-assignee">
        <select
          id="tf-assignee"
          className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
          value={assigneeMemberId}
          onChange={(e) => setAssigneeMemberId(e.target.value)}
        >
          <option value="">— ללא אחראי —</option>
          {ADULTS.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </FormField>

      <FormField label="גיבוי (placeholder — לא מנוע גיבוי אמיתי)" id="tf-backup">
        <input
          id="tf-backup"
          type="text"
          className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
          value={backupPlaceholder}
          onChange={(e) => setBackupPlaceholder(e.target.value)}
          placeholder="למשל: יואב"
        />
      </FormField>

      <FormField label="ציוד (אופציונלי)" id="tf-eq">
        <input
          id="tf-eq"
          type="text"
          className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
        />
      </FormField>

      <FormField label="הערות (אופציונלי)" id="tf-notes">
        <textarea
          id="tf-notes"
          className="min-h-20 w-full rounded-md border border-border bg-background p-2 text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </FormField>

      {error ? <p role="alert" className="text-sm text-error">{error}</p> : null}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={!canSubmit} className="min-w-32">
          {mode === "create" ? "צור הסעה" : "שמור שינויים"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            ride
              ? void navigate({ to: "/transport/$rideId", params: { rideId: ride.id } })
              : void navigate({ to: "/transport" })
          }
        >
          ביטול
        </Button>
      </div>
    </form>
  );
}
