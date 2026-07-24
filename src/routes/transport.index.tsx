import { createFileRoute } from "@tanstack/react-router";
import { TransportListScreen } from "@/features/transport/TransportListScreen";

export const Route = createFileRoute("/transport/")({
  component: TransportListScreen,
});
