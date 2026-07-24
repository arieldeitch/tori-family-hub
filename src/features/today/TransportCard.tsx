import type { TransportItem, TodayMember } from "@/domain/today";
import { StatusBadge, type StatusKind } from "@/components/design-system/StatusBadge";
import { PersonAvatar } from "@/components/design-system/PersonAvatar";
import { Button } from "@/components/ui/button";
import { formatTime } from "./format";

const STATUS_TO_KIND: Record<TransportItem["status"], StatusKind> = {
  planned: "neutral",
  unassigned: "warning",
  waiting_approval: "warning",
  confirmed: "success",
};

const STATUS_LABEL: Record<TransportItem["status"], string> = {
  planned: "מתוכנן",
  unassigned: "ללא אחראי",
  waiting_approval: "ממתין לאישור",
  confirmed: "מאושר",
};

interface Props {
  transport: TransportItem;
  child: TodayMember | null;
  responsible: TodayMember | null;
  primaryLabel?: string;
  onPrimary?: () => void;
}

export function TransportCard({ transport, child, responsible, primaryLabel, onPrimary }: Props) {
  const directionLabel = transport.direction === "pickup" ? "איסוף" : "הורדה";
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">
            {directionLabel} · {child?.name ?? "ילד/ה"}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{transport.place}</p>
        </div>
        <StatusBadge kind={STATUS_TO_KIND[transport.status]}>
          {STATUS_LABEL[transport.status]}
        </StatusBadge>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium text-foreground">{formatTime(transport.timeAt)}</span>
        {transport.recommendedLeaveAt ? (
          <span className="text-muted-foreground">
            · יציאה מומלצת {formatTime(transport.recommendedLeaveAt)}
          </span>
        ) : null}
        <span className="ms-auto inline-flex items-center gap-2">
          {responsible ? (
            <>
              <PersonAvatar name={responsible.name} color={responsible.color} size="sm" />
              <span className="text-foreground">{responsible.name}</span>
            </>
          ) : (
            <span className="text-warning-foreground">אין אחראי</span>
          )}
        </span>
      </div>
      {onPrimary && primaryLabel ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={onPrimary}>
            {primaryLabel}
          </Button>
        </div>
      ) : null}
    </article>
  );
}
