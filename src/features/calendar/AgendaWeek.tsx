import type { DayBucket } from "@/domain/calendar";
import { isSameDay } from "@/domain/calendar";
import { EventCard } from "./EventCard";

const dayFmt = new Intl.DateTimeFormat("he-IL", { weekday: "long" });
const dateFmt = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long" });

interface Props {
  buckets: ReadonlyArray<DayBucket>;
  today: Date;
}

export function AgendaWeek({ buckets, today }: Props) {
  return (
    <ol className="flex flex-col gap-4">
      {buckets.map((bucket) => {
        const isToday = isSameDay(bucket.date, today);
        const key = bucket.date.toISOString();
        return (
          <li key={key} className="min-w-0">
            <div
              className={`grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 border-b border-border pb-1 ${
                isToday ? "text-primary" : "text-foreground"
              }`}
            >
              <h2 className="min-w-0 truncate text-sm font-semibold">
                {dayFmt.format(bucket.date)}
                {isToday ? <span className="ms-2 text-xs font-normal">(היום)</span> : null}
              </h2>
              <span className="shrink-0 text-xs text-muted-foreground">
                {dateFmt.format(bucket.date)}
              </span>
            </div>
            {bucket.events.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">אין אירועים.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {bucket.events.map((e) => (
                  <li key={e.id}>
                    <EventCard event={e} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
