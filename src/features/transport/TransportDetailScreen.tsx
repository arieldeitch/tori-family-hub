import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  PRIMARY_ACTION_BY_STATUS,
  TransportDomainError,
  type TransportRide,
  type TransportStatus,
} from "@/domain/transport";
import { transportRepo, transportMembers, DEMO_VIEWER_ID } from "@/data/transportRepo";
import { StatusBadge } from "@/components/design-system/StatusBadge";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/design-system/ConfirmationDialog";
import {
  DIRECTION_LABEL,
  STATUS_KIND,
  STATUS_LABEL,
  formatDayTime,
  formatDeadline,
} from "./format";
import { Pencil, MapPin, Car, Clock, PackageOpen, StickyNote } from "lucide-react";

interface Props {
  ride: TransportRide;
}

const ADULTS = ["m1", "m2"];

export function TransportDetailScreen({ ride }: Props) {
  const navigate = useNavigate();
  const [assignPickerOpen, setAssignPickerOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTo, setTransferTo] = useState<string>(
    ADULTS.find((id) => id !== ride.assigneeMemberId) ?? "m2",
  );
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const child = transportMembers[ride.childMemberId];
  const assignee = ride.assigneeMemberId ? transportMembers[ride.assigneeMemberId] : undefined;
  const previous = ride.previousAssigneeMemberId
    ? transportMembers[ride.previousAssigneeMemberId]
    : undefined;
  const primary = PRIMARY_ACTION_BY_STATUS[ride.status];

  function runTransition(to: TransportStatus, actorId = DEMO_VIEWER_ID) {
    try {
      transportRepo.transition(ride.id, to, { actorMemberId: actorId });
      toast.success(`עודכן ל־${STATUS_LABEL[to]}`);
    } catch (err) {
      if (err instanceof TransportDomainError) {
        toast.error(err.message);
      } else {
        toast.error("שגיאה בעדכון סטטוס");
      }
    }
  }

  function handlePrimary() {
    if (!primary) return;
    if (ride.status === "unassigned") {
      setAssignPickerOpen(true);
      return;
    }
    runTransition(primary.toStatus);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-foreground">
            {DIRECTION_LABEL[ride.direction]} · {child?.name ?? "ילד/ה"}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {formatDayTime(ride.timeAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge kind={STATUS_KIND[ride.status]}>{STATUS_LABEL[ride.status]}</StatusBadge>
        </div>
      </div>

      <dl className="grid gap-3 rounded-2xl border border-border bg-card p-3 text-sm">
        <Row icon={<MapPin className="h-4 w-4" />} label="מסלול">
          {ride.origin} ← {ride.destination}
        </Row>
        <Row icon={<Clock className="h-4 w-4" />} label="זמן">
          <span className="tabular-nums">{formatDayTime(ride.timeAt)}</span>
          {ride.recommendedDepartureAt ? (
            <span className="text-muted-foreground">
              {" "}· יציאה מומלצת {formatDayTime(ride.recommendedDepartureAt)}
            </span>
          ) : null}
        </Row>
        {ride.acceptanceDeadlineAt ? (
          <Row icon={<Clock className="h-4 w-4" />} label="יעד אישור">
            <span className="tabular-nums">{formatDayTime(ride.acceptanceDeadlineAt)}</span>
            <span className="ms-2 text-muted-foreground">
              ({formatDeadline(ride.acceptanceDeadlineAt)})
            </span>
          </Row>
        ) : null}
        <Row icon={<Car className="h-4 w-4" />} label="אחראי">
          {assignee ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: assignee.color }}
              >
                {assignee.initials}
              </span>
              {assignee.name}
            </span>
          ) : (
            <span className="text-warning-foreground">אין אחראי</span>
          )}
          {previous && ride.status === "transferred" ? (
            <span className="ms-2 text-muted-foreground">(הועבר מ־{previous.name})</span>
          ) : null}
        </Row>
        {ride.backupPlaceholder ? (
          <Row icon={<Car className="h-4 w-4" />} label="גיבוי">
            {ride.backupPlaceholder}
            <span className="ms-2 text-xs text-muted-foreground">(placeholder — לא מנוע גיבוי)</span>
          </Row>
        ) : null}
        {ride.equipment ? (
          <Row icon={<PackageOpen className="h-4 w-4" />} label="ציוד">
            {ride.equipment}
          </Row>
        ) : null}
        {ride.notes ? (
          <Row icon={<StickyNote className="h-4 w-4" />} label="הערות">
            {ride.notes}
          </Row>
        ) : null}
        {ride.cancellationReason ? (
          <Row icon={<StickyNote className="h-4 w-4" />} label="סיבת ביטול">
            {ride.cancellationReason}
          </Row>
        ) : null}
      </dl>

      <div className="flex flex-wrap gap-2">
        {primary ? (
          <Button className="h-11 min-w-32" onClick={handlePrimary}>
            {primary.labelHe}
          </Button>
        ) : null}
        {(ride.status === "accepted" || ride.status === "en_route") && (
          <Button variant="outline" className="h-11" onClick={() => setTransferOpen(true)}>
            העבר לאדם אחר
          </Button>
        )}
        {!["completed", "cancelled", "transferred"].includes(ride.status) && (
          <Button
            variant="outline"
            className="h-11 text-error"
            onClick={() => setCancelOpen(true)}
          >
            בטל
          </Button>
        )}
        <Button
          variant="ghost"
          className="h-11"
          onClick={() => void navigate({ to: "/transport/$rideId/edit", params: { rideId: ride.id } })}
        >
          <Pencil className="h-4 w-4" aria-hidden />
          עריכה
        </Button>
        <Button variant="ghost" className="h-11" asChild>
          <Link to="/transport">חזרה לרשימה</Link>
        </Button>
      </div>

      {/* Assign picker (unassigned → pending_acceptance) */}
      {assignPickerOpen ? (
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-sm font-medium">הקצה אחראי</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ADULTS.map((id) => (
              <Button
                key={id}
                variant="outline"
                className="h-11"
                onClick={() => {
                  try {
                    transportRepo.assign(ride.id, id);
                    toast.success(`הוקצה ל־${transportMembers[id]?.name}`);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "שגיאה");
                  } finally {
                    setAssignPickerOpen(false);
                  }
                }}
              >
                {transportMembers[id]?.name}
              </Button>
            ))}
            <Button variant="ghost" className="h-11" onClick={() => setAssignPickerOpen(false)}>
              ביטול
            </Button>
          </div>
        </div>
      ) : null}

      {/* Transfer dialog */}
      <ConfirmationDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        title="העבר הסעה לאדם אחר"
        description={
          <div className="flex flex-col gap-2">
            <p>בחרו אחראי חדש. פעולה זו אינה משנה היסטוריה.</p>
            <select
              aria-label="בחירת אחראי חדש"
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
            >
              {ADULTS.filter((id) => id !== ride.assigneeMemberId).map((id) => (
                <option key={id} value={id}>{transportMembers[id]?.name}</option>
              ))}
            </select>
          </div>
        }
        confirmLabel="העבר"
        cancelLabel="ביטול"
        onConfirm={() => {
          try {
            transportRepo.transition(ride.id, "transferred", {
              actorMemberId: DEMO_VIEWER_ID,
              newAssigneeMemberId: transferTo,
            });
            toast.success(`הועבר ל־${transportMembers[transferTo]?.name}`);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "שגיאה");
          }
        }}
      />

      {/* Cancel dialog */}
      <ConfirmationDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="ביטול הסעה"
        description={
          <div className="flex flex-col gap-2">
            <p>סיבה (אופציונלי):</p>
            <input
              aria-label="סיבת ביטול"
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
        }
        confirmLabel="בטל הסעה"
        cancelLabel="חזרה"
        tone="destructive"
        onConfirm={() => {
          try {
            transportRepo.transition(ride.id, "cancelled", {
              actorMemberId: DEMO_VIEWER_ID,
              reason: cancelReason.trim() || undefined,
            });
            toast.success("ההסעה בוטלה");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "שגיאה");
          }
        }}
      />
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm text-foreground">{children}</dd>
      </div>
    </div>
  );
}
