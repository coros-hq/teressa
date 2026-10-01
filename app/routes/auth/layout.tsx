import { Outlet } from "react-router";

import { AuthLayout } from "~/components/auth-layout";

export default function AuthLayoutRoute() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
}
