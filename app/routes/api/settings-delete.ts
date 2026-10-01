import type { Route } from "./+types/settings-delete";
import { deleteAccount } from "~/lib/data/account-deletion.server";
import { getProfile } from "~/lib/data/profile.server";
import { clearAuthCookies, guard } from "~/lib/security.server";
import { createAdminClient } from "~/lib/supabase/admin.server";

// POST { confirmation, keepPublished }: delete the signed-in person's account. The session is
// verified here, the confirmation is checked again, and only then is the service role used.
export async function action({ request }: Route.ActionArgs) {
  const g = await guard(request);
  if ("response" in g) return g.response;
  if (request.method !== "POST") return g.json({ ok: false, message: "Method not allowed." }, 405);

  let body: { confirmation?: unknown; keepPublished?: unknown };
  try {
    body = await request.json();
  } catch {
    return g.json({ ok: false, message: "That request couldn't be read." }, 400);
  }

  let username: string | null;
  try {
    username = (await getProfile(g.supabase, g.user.id)).username || null;
  } catch {
    return g.json({ ok: false, message: "Something went wrong. Nothing was deleted. Try again." }, 500);
  }

  const result = await deleteAccount(createAdminClient(), {
    userId: g.user.id, // always the verified session's id, never one sent by the browser
    username,
    confirmation: body.confirmation,
    keepPublished: body.keepPublished,
  });
  if (!result.ok) return g.json({ ok: false, message: result.message }, result.status);

  // The account is gone: expire the sign-in cookies so the browser is signed out too.
  return Response.json({ ok: true, redirectTo: "/" }, { headers: clearAuthCookies(request) });
}
