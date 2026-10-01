import type { Route } from "./+types/notifications";
import { MENU_SIZE } from "~/lib/data/notifications";
import { getNotifications, markNotificationsSeen } from "~/lib/data/notifications.server";
import { guard } from "~/lib/security.server";

// GET: the latest few, for the bell in the header.
export async function loader({ request }: Route.LoaderArgs) {
  const g = await guard(request);
  if ("response" in g) return g.response;
  try {
    return g.json(await getNotifications(g.supabase, MENU_SIZE));
  } catch {
    return g.json({ ok: false, message: "Notifications couldn't be loaded." }, 500);
  }
}

// POST: "I've seen them", which clears the unread count.
export async function action({ request }: Route.ActionArgs) {
  const g = await guard(request);
  if ("response" in g) return g.response;
  const ok = await markNotificationsSeen(g.supabase);
  return g.json({ ok }, ok ? 200 : 500);
}
