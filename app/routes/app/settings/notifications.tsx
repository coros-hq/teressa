import { data } from "react-router";

import type { Route } from "./+types/notifications";
import { NotificationsForm } from "~/components/settings/notifications-form";
import { getNotificationPrefs } from "~/lib/data/settings.server";
import { getUser } from "~/lib/supabase/server";

export function meta() {
  return [{ title: "Notification settings" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user, supabase, headers } = await getUser(request);
  return data({ prefs: user ? getNotificationPrefs(supabase, user.id) : Promise.reject(new Error("Not signed in")) }, { headers });
}

export default function NotificationSettings({ loaderData }: Route.ComponentProps) {
  return <NotificationsForm prefs={loaderData.prefs} />;
}
