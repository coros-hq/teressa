import { Outlet } from "react-router";

import { PageContainer } from "~/components/dashboard/page-container";
import { PageHeader } from "~/components/dashboard/page-header";
import { Toaster } from "~/components/ui/sonner";

import { SettingsNav } from "./settings-nav";

export function SettingsLayout() {
  return (
    <PageContainer>
      <PageHeader title="Settings" description="Manage your profile, account and preferences." />
      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
        <SettingsNav />
        <div className="flex max-w-[640px] min-w-0 flex-col gap-6">
          <Outlet />
        </div>
      </div>
      <Toaster />
    </PageContainer>
  );
}
