import { createFileRoute, Link } from "@tanstack/react-router";
import { useTransport } from "@/lib/useTransport";
import { selectPendingAcceptance } from "@/domain/transport";
import { TransportCard } from "@/features/transport/TransportCard";
import { EmptyState } from "@/components/design-system/EmptyState";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/design-system/SectionHeader";

export const Route = createFileRoute("/transport/pending")({
  component: PendingRoute,
});

function PendingRoute() {
  const { rides } = useTransport();
  const list = selectPendingAcceptance(rides);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <SectionHeader
          title={<span>ממתין לאישור</span>}
          subtitle={<span>הסעות שהוקצו וממתינות לאישור אחריות</span>}
        />
        <Button asChild variant="ghost" size="sm" className="h-11">
          <Link to="/transport">כל ההסעות</Link>
        </Button>
      </div>
      {list.length === 0 ? (
        <EmptyState title="אין הסעות ממתינות לאישור" />
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((r) => (
            <li key={r.id}>
              <TransportCard ride={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
