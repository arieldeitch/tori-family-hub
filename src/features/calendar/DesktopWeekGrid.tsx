import type { DayBucket } from "@/domain/calendar";
import { isSameDay } from "@/domain/calendar";
import { EventCard } from "./EventCard";

const dayShortFmt = new Intl.DateTimeFormat("he-IL", { weekday: "short" });
const dayNumFmt = new Intl.DateTimeFormat("he-IL", { day: "numeric" });

interface Props {
  buckets: ReadonlyArray<DayBucket>;
  today: Date;
}

// Desktop-only: readable 7-column grid. Not shown on mobile.
export function DesktopWeekGrid({ buckets, today }: Props) {
  return (
    <div className="hidden lg:grid lg:grid-cols-7 lg:gap-3">
      {buckets.map((bucket) => {
        const isToday = isSameDay(bucket.date, today);
        return (
          <section
            key={bucket.date.toISOString()}
            className="flex min-w-0 flex-col gap-2 rounded-2xl border border-border bg-card/40 p-3"
            aria-label={dayShortFmt.format(bucket.date)}
          >
            <header className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 border-b border-border pb-1">
              <span
                className={`truncate text-xs font-semibold ${
                  isToday ? "text-primary" : "text-foreground"
                }`}
              >
                {dayShortFmt.format(bucket.date)}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {dayNumFmt.format(bucket.date)}
              </span>
            </header>
            {bucket.events.length === 0 ? (
              <p className="text-xs text-muted-foreground">—</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {bucket.events.map((e) => (
                  <li key={e.id}>
                    <EventCard event={e} compact />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
