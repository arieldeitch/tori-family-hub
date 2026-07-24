import { MapPin, Car, Baby, ShieldAlert } from "lucide-react";
import type { CalendarEvent } from "@/domain/calendar";
import { calendarMembers } from "@/data/calendarRepo";

const timeFmt = new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit" });

interface Props {
  event: CalendarEvent;
  compact?: boolean;
}

export function EventCard({ event, compact }: Props) {
  const owner = calendarMembers[event.ownerMemberId];
  const child = event.childMemberId ? calendarMembers[event.childMemberId] : undefined;
  const color = owner?.color ?? "#94a3b8";
  const timeLabel = `${timeFmt.format(new Date(event.startISO))}–${timeFmt.format(new Date(event.endISO))}`;

  return (
    <article
      className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xl border border-border bg-card p-3 min-h-11"
      aria-label={`${event.title}, ${timeLabel}`}
    >
      <div
        aria-hidden
        className="mt-1 h-full min-h-8 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">{event.title}</h3>
          <time className="shrink-0 text-xs tabular-nums text-muted-foreground">{timeLabel}</time>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {owner ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {owner.initials}
              </span>
              <span className="truncate">{owner.name}</span>
            </span>
          ) : null}
          {child && child.id !== owner?.id ? (
            <span className="inline-flex items-center gap-1">
              <Baby className="h-3.5 w-3.5" aria-hidden />
              <span className="truncate">{child.name}</span>
            </span>
          ) : null}
          {event.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              <span className="truncate">{event.location}</span>
            </span>
          ) : null}
          {event.needsTransport ? (
            <span className="inline-flex items-center gap-1 text-foreground">
              <Car className="h-3.5 w-3.5" aria-hidden />
              דורש הסעה
            </span>
          ) : null}
          {event.adultsOnly && !compact ? (
            <span className="inline-flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
              מבוגרים בלבד
            </span>
          ) : null}
        </div>

        {event.note && !compact ? (
          <p className="mt-2 text-xs text-muted-foreground">{event.note}</p>
        ) : null}
      </div>
    </article>
  );
}
