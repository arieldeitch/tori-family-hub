import { createFileRoute } from "@tanstack/react-router";
import { ChildHome } from "@/features/child-mode/ChildHome";

export const Route = createFileRoute("/child")({
  head: () => ({
    meta: [
      { title: "תצוגת ילד — Tori" },
      { name: "description", content: "מסך פשוט עם המשימות של היום." },
      { property: "og:title", content: "תצוגת ילד — Tori" },
      { property: "og:description", content: "מסך פשוט לילדים ב‑Tori." },
    ],
  }),
  component: ChildHome,
});
