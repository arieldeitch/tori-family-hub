import { createFileRoute } from "@tanstack/react-router";
import { OnboardingWizard } from "@/features/onboarding/OnboardingWizard";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "הקמת משק בית — Tori" },
      { name: "description", content: "הקמת משק הבית, פרופיל מנהל ובני משפחה." },
      { property: "og:title", content: "הקמת משק בית — Tori" },
      { property: "og:description", content: "הקמת משק בית ב‑Tori." },
    ],
  }),
  component: OnboardingWizard,
});
