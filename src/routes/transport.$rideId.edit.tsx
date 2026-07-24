import { createFileRoute, Link } from "@tanstack/react-router";
import { useTransport } from "@/lib/useTransport";
import { TransportForm } from "@/features/transport/TransportForm";
import { EmptyState } from "@/components/design-system/EmptyState";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/transport/$rideId/edit")({
  component: EditRoute,
});

function EditRoute() {
  const { rideId } = Route.useParams();
  const { rides } = useTransport();
  const ride = rides.find((r) => r.id === rideId);
  if (!ride) {
    return (
      <EmptyState
        title="ההסעה לא נמצאה"
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/transport">חזרה</Link>
          </Button>
        }
      />
    );
  }
  return <TransportForm mode="edit" ride={ride} />;
}
