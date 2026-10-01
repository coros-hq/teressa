import { Outlet } from "react-router";

import { DashboardLayout } from "~/components/dashboard/dashboard-layout";

// Dashboard shell (sidebar + header). The auth guard placeholder lives in ./authenticated.tsx.
export default function AppLayout() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
