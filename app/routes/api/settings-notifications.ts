import type { Route } from "./+types/settings-notifications";
import { setNotificationPref } from "~/lib/data/settings.server";
import { guard } from "~/lib/security.server";

// POST { key, value }: change one email preference.
export async function action({ request }: Route.ActionArgs) {
  const g = await guard(request);
  if ("response" in g) return g.response;
  let body: { key?: unknown; value?: unknown };
  try {
    body = await request.json();
  } catch {
    return g.json({ ok: false, message: "That request couldn't be read." }, 400);
  }
  const r = await setNotificationPref(g.supabase, g.user.id, body.key, body.value);
  return g.json(r, r.ok ? 200 : 400);
}
