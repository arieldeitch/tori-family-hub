import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useTransport } from "@/lib/useTransport";
import { TransportDetailScreen } from "@/features/transport/TransportDetailScreen";
import { EmptyState } from "@/components/design-system/EmptyState";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/transport/$rideId")({
  component: RideRoute,
});

function RideRoute() {
  const { rideId } = Route.useParams();
  const { rides } = useTransport();
  const ride = rides.find((r) => r.id === rideId);
  if (!ride) {
    return (
      <EmptyState
        title="ההסעה לא נמצאה"
        description="ייתכן שהיא נמחקה או שהשתנה מצב התצוגה."
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/transport">חזרה לרשימה</Link>
          </Button>
        }
      />
    );
  }
  return <TransportDetailScreen ride={ride} />;
}
// notFound is imported for potential future SSR guards; keeps module referenced.
void notFound;
