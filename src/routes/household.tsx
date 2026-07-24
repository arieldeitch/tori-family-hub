import { createFileRoute } from "@tanstack/react-router";
import { HouseholdScreen } from "@/features/household/HouseholdScreen";

export const Route = createFileRoute("/household")({
  head: () => ({
    meta: [
      { title: "בני הבית — Tori" },
      { name: "description", content: "ניהול בני הבית, אורחים ומטפלים." },
      { property: "og:title", content: "בני הבית — Tori" },
      { property: "og:description", content: "ניהול בני הבית ב‑Tori." },
    ],
  }),
  component: HouseholdScreen,
});
