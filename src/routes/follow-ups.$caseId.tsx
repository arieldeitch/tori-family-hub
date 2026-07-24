import { createFileRoute } from "@tanstack/react-router";
import { FollowUpDetailScreen } from "@/features/follow-ups/FollowUpDetailScreen";

export const Route = createFileRoute("/follow-ups/$caseId")({
  head: () => ({
    meta: [
      { title: "פרטי מעקב — Tori" },
      { name: "description", content: "פרטים, טיימליין וניהול של מעקב." },
      { property: "og:title", content: "פרטי מעקב — Tori" },
      { property: "og:description", content: "פרטי המעקב, טיימליין ופעולות." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: DetailRoute,
});

function DetailRoute() {
  const { caseId } = Route.useParams();
  return <FollowUpDetailScreen caseId={caseId} />;
}
