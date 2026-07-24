import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, CalendarClock } from "lucide-react";

interface Props {
  weekStart: Date;
  weekEnd: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  isCurrentWeek: boolean;
}

const rangeFmt = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "long",
});

export function WeekNav({ weekStart, weekEnd, onPrev, onNext, onToday, isCurrentWeek }: Props) {
  const label = `${rangeFmt.format(weekStart)} – ${rangeFmt.format(weekEnd)}`;
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-border bg-card p-2">
      {/* In RTL, "previous week" points RIGHT visually */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="שבוע קודם"
        onClick={onPrev}
        className="h-11 w-11 shrink-0"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
      <div className="min-w-0 text-center">
        <div className="truncate text-sm font-medium text-foreground">{label}</div>
        {isCurrentWeek ? <div className="text-xs text-muted-foreground">השבוע הנוכחי</div> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onToday}
          disabled={isCurrentWeek}
          className="h-11 gap-1"
        >
          <CalendarClock className="h-4 w-4" />
          היום
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="שבוע הבא"
          onClick={onNext}
          className="h-11 w-11 shrink-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
