import { Link } from "@tanstack/react-router";
import { MapPin, Car, Clock, AlertTriangle, PackageOpen } from "lucide-react";
import type { TransportRide } from "@/domain/transport";
import { transportMembers } from "@/data/transportRepo";
import { StatusBadge } from "@/components/design-system/StatusBadge";
import {
  DIRECTION_LABEL,
  STATUS_KIND,
  STATUS_LABEL,
  formatDeadline,
  formatTime,
  isDeadlinePast,
} from "./format";

interface Props {
  ride: TransportRide;
  /** When true, links to the ride detail page. */
  linked?: boolean;
}

export function TransportCard({ ride, linked = true }: Props) {
  const child = transportMembers[ride.childMemberId];
  const assignee = ride.assigneeMemberId ? transportMembers[ride.assigneeMemberId] : undefined;
  const color = child?.color ?? "#94a3b8";

  const body = (
    <article
      className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-2xl border border-border bg-card p-3 text-start min-h-11"
      aria-label={`${DIRECTION_LABEL[ride.direction]} — ${child?.name ?? "ילד"}, ${formatTime(ride.timeAt)}`}
    >
      <div
        aria-hidden
        className="mt-1 h-full min-h-8 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {DIRECTION_LABEL[ride.direction]} · {child?.name ?? "ילד/ה"}
          </h3>
          <StatusBadge kind={STATUS_KIND[ride.status]}>{STATUS_LABEL[ride.status]}</StatusBadge>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {formatTime(ride.timeAt)}
            {ride.recommendedDepartureAt ? (
              <span className="ms-1">(יציאה מומלצת {formatTime(ride.recommendedDepartureAt)})</span>
            ) : null}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {ride.origin} ← {ride.destination}
            </span>
          </span>
          {ride.equipment ? (
            <span className="inline-flex items-center gap-1">
              <PackageOpen className="h-3.5 w-3.5" aria-hidden />
              <span className="truncate">{ride.equipment}</span>
            </span>
          ) : null}
        </div>

        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-xs">
            {assignee ? (
              <>
                <span
                  aria-hidden
                  className="inline-grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: assignee.color }}
                >
                  {assignee.initials}
                </span>
                <span className="truncate text-foreground">{assignee.name}</span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1 text-warning-foreground">
                <Car className="h-3.5 w-3.5" aria-hidden />
                אין אחראי
              </span>
            )}
          </span>
          {ride.acceptanceDeadlineAt && ride.status === "pending_acceptance" ? (
            <span
              className={`inline-flex shrink-0 items-center gap-1 text-xs tabular-nums ${
                isDeadlinePast(ride.acceptanceDeadlineAt) ? "text-error" : "text-muted-foreground"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              יעד אישור: {formatDeadline(ride.acceptanceDeadlineAt)}
            </span>
          ) : null}
        </div>

        {ride.backupPlaceholder ? (
          <p className="mt-2 text-xs text-muted-foreground">גיבוי: {ride.backupPlaceholder}</p>
        ) : null}
      </div>
    </article>
  );

  if (!linked) return body;
  return (
    <Link
      to="/transport/$rideId"
      params={{ rideId: ride.id }}
      className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {body}
    </Link>
  );
}
