// Weekly chores — a first-class module INSIDE the application shell.
//
// This is the WP5D experience that previously only existed on the standalone
// /pilot screen. Mounting it here is the difference between "the pilot replaced
// the product" and "the pilot is one module of the product": it renders inside
// AppShell, so the bottom navigation, header and every other module stay
// reachable, and a direct visit or a browser refresh on /chores works.
//
// It is the one genuinely Supabase-backed module in the app today. Everything it
// shows comes from the hosted database under the WP5B/WP5C policies; nothing
// here is mock-backed.
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { WeeklyChoresModule } from "@/features/pilot/WeeklyChoresModule";

export const Route = createFileRoute("/chores")({
  head: () => ({
    meta: [
      { title: "מטלות השבוע — Tori" },
      {
        name: "description",
        content: "תצוגת המטלות השבועית של המשפחה, מיום ראשון עד שבת, מתוך מסד הנתונים.",
      },
      { property: "og:title", content: "מטלות השבוע — Tori" },
      { property: "og:description", content: "מי אחראי על מה, ומה כבר בוצע." },
    ],
  }),
  component: ChoresPage,
});

function ChoresPage() {
  return (
    <AppShell title="מטלות השבוע">
      <WeeklyChoresModule />
    </AppShell>
  );
}
