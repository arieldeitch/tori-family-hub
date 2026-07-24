import { Link } from "@tanstack/react-router";
import { MapPin, Users, CalendarClock, Link2 } from "lucide-react";
import type { Errand } from "@/domain/errand";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, formatDateTime, resolveMemberName } from "@/features/tasks/labels";

interface Props {
  errand: Errand;
  members: ReadonlyArray<{ id: string; name: string }>;
}

export function ErrandCard({ errand, members }: Props) {
  return (
    <Link
      to="/errands/$errandId"
      params={{ errandId: errand.id }}
      className="block rounded-lg border border-border bg-surface p-3 transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-medium text-foreground">{errand.title}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {errand.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="truncate">{errand.location}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 italic">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                ללא מיקום
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {resolveMemberName(members, errand.assignment?.memberId)}
            </span>
            {errand.dueAt ? (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDateTime(errand.dueAt)}
              </span>
            ) : null}
            {errand.linkedTaskInstanceId ? (
              <span className="inline-flex items-center gap-1">
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                מקושר למשימה
              </span>
            ) : null}
          </div>
          {errand.canDoWhenNearby ? (
            <div className="mt-2 text-xs text-muted-foreground">אפשר לבצע כשמישהו נמצא באזור</div>
          ) : null}
        </div>
        <Badge variant="outline" className="shrink-0">
          {STATUS_LABEL[errand.status]}
        </Badge>
      </div>
    </Link>
  );
}
