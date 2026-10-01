import type { Route } from "./+types/copy";
import { recordCopy } from "~/lib/data/component-page.server";
import { createPublicClient } from "~/lib/supabase/server";

// POST /api/copy/:slug : counts one copy. Public (no sign-in), because anyone can copy a component.
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") return Response.json({ ok: false }, { status: 405 });
  const site = request.headers.get("Sec-Fetch-Site");
  if (site && site !== "same-origin") return Response.json({ ok: false }, { status: 403 });
  try {
    await recordCopy(createPublicClient(), params.slug);
  } catch {
    // counting is best effort: never fail a copy because of it
  }
  return Response.json({ ok: true });
}
