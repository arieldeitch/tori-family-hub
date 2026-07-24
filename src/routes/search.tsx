import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { SearchScreen } from "@/features/search/SearchScreen";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "חיפוש — Tori" },
      { name: "description", content: "חיפוש חוצה מודולים במשימות, בני בית, קניות ומעקבים." },
      { property: "og:title", content: "חיפוש — Tori" },
      { property: "og:description", content: "מציאת פריט מכל מודול בעזרת חיפוש טקסטואלי." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  return (
    <AppShell title="חיפוש">
      <SearchScreen />
    </AppShell>
  );
}
