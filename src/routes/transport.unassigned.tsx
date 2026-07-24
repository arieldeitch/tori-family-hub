import { createFileRoute, Link } from "@tanstack/react-router";
import { useTransport } from "@/lib/useTransport";
import { selectUnassigned } from "@/domain/transport";
import { TransportCard } from "@/features/transport/TransportCard";
import { EmptyState } from "@/components/design-system/EmptyState";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/design-system/SectionHeader";

export const Route = createFileRoute("/transport/unassigned")({
  component: UnassignedRoute,
});

function UnassignedRoute() {
  const { rides } = useTransport();
  const list = selectUnassigned(rides);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <SectionHeader title={<span>ללא אחראי</span>} />
        <Button asChild variant="ghost" size="sm" className="h-11">
          <Link to="/transport">כל ההסעות</Link>
        </Button>
      </div>
      {list.length === 0 ? (
        <EmptyState title="כל ההסעות משויכות" description="אין הסעות ללא אחראי כרגע." />
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
