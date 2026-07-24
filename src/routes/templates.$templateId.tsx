import { createFileRoute } from "@tanstack/react-router";
import { TemplateDetailsScreen } from "@/features/templates/TemplateDetailsScreen";

export const Route = createFileRoute("/templates/$templateId")({
  component: RouteComp,
});

function RouteComp() {
  const { templateId } = Route.useParams();
  return <TemplateDetailsScreen templateId={templateId} />;
}
