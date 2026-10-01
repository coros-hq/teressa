import { useEffect, useState } from "react";

import { SidebarProvider } from "~/components/ui/sidebar";
import { TooltipProvider } from "~/components/ui/tooltip";

import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";

const STORAGE_KEY = "sidebar-open";

// App shell: the sidebar stays on the left, the header on top, and only <main> scrolls.
// The collapsed state is remembered for this browser session only.
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "false") setOpen(false);
    } catch {}
  }, []);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, String(next));
    } catch {}
  };

  return (
    <TooltipProvider>
      <SidebarProvider
        open={open}
        onOpenChange={onOpenChange}
        className="h-svh"
      >
        <a
          href="#main"
          className="bg-background text-foreground focus-visible:ring-ring/50 sr-only fixed top-3 left-3 z-50 rounded-md px-3 py-2 text-sm font-medium focus:not-sr-only focus-visible:ring-3"
        >
          Skip to content
        </a>
        <AppSidebar />
        <div className="flex h-svh min-w-0 flex-1 flex-col">
          <AppHeader />
          <main
            id="main"
            tabIndex={-1}
            className="min-h-0 flex-1 overflow-y-auto outline-none"
          >
            {children}
          </main>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
