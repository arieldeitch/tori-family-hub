import { useState, type ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";
import { DesktopSidebar } from "./DesktopSidebar";
import { QuickAddSheet } from "./QuickAddSheet";
import { useHousehold } from "@/lib/useHousehold";

interface AppShellProps {
  title: string;
  children: ReactNode;
}

export function AppShell({ title, children }: AppShellProps) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const household = useHousehold();

  return (
    <div className="flex min-h-screen w-full bg-background">
      <DesktopSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          title={title}
          householdName={household?.name}
          onQuickAdd={() => setQuickAddOpen(true)}
        />
        <main
          className="min-w-0 flex-1 overflow-x-hidden"
          style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto w-full max-w-3xl px-4 py-4 lg:pb-6">{children}</div>
        </main>
        <BottomNav />
      </div>
      <QuickAddSheet open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </div>
  );
}
