import { createFileRoute } from "@tanstack/react-router";
import { TransportForm } from "@/features/transport/TransportForm";

export const Route = createFileRoute("/transport/new")({
  component: () => <TransportForm mode="create" />,
});
