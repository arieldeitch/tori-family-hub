import { createFileRoute } from "@tanstack/react-router";
import { TrashScreen } from "@/features/templates/TrashScreen";

export const Route = createFileRoute("/templates/trash")({
  component: TrashScreen,
});
