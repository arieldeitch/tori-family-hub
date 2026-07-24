import { createFileRoute } from "@tanstack/react-router";
import { TemplateListScreen } from "@/features/templates/TemplateListScreen";

export const Route = createFileRoute("/templates/")({
  component: TemplateListScreen,
});
