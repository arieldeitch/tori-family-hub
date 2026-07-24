import { createFileRoute } from "@tanstack/react-router";
import { ActiveListScreen } from "@/features/shopping/ActiveListScreen";

export const Route = createFileRoute("/shopping/$listId")({
  component: ActiveListRoute,
});

function ActiveListRoute() {
  const { listId } = Route.useParams();
  return <ActiveListScreen listId={listId} />;
}
