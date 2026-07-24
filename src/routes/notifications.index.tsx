import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { NotificationsScreen } from "@/features/notifications/NotificationsScreen";

export const Route = createFileRoute("/notifications/")({
  component: NotificationsIndex,
});

function NotificationsIndex() {
  return (
    <AppShell title="התראות">
      <NotificationsScreen />
    </AppShell>
  );
}
