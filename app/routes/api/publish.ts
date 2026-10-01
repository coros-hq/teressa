import type { Route } from "./+types/publish";
import { publishComponent } from "~/lib/publishing.server";
import { getUser } from "~/lib/supabase/server";

// POST /api/publish/:componentId  { objectId, details, checkResults, idempotencyKey }
export async function action({ request, params }: Route.ActionArgs) {
  const { user, supabase, headers } = await getUser(request);
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers });

  if (request.method !== "POST") return json({ ok: false, message: "Method not allowed." }, 405);
  if (!user) return json({ ok: false, code: "not_signed_in", message: "Sign in again to publish." }, 401);
  // Only our own pages may publish: browsers mark cross-site requests, and we refuse them.
  const site = request.headers.get("Sec-Fetch-Site");
  if (site && site !== "same-origin") return json({ ok: false, message: "Request blocked." }, 403);

  let body: {
    objectId?: unknown;
    details?: { title?: unknown; description?: unknown; category?: unknown; tags?: unknown };
    checkResults?: unknown;
    idempotencyKey?: unknown;
    previewLight?: unknown;
    previewDark?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: "That request couldn't be read." }, 400);
  }
  const d = body.details;
  if (
    typeof body.objectId !== "string" ||
    typeof body.idempotencyKey !== "string" ||
    typeof body.previewLight !== "string" ||
    typeof body.previewDark !== "string" ||
    !d ||
    typeof d.title !== "string" ||
    typeof d.description !== "string" ||
    typeof d.category !== "string" ||
    !Array.isArray(d.tags) ||
    !d.tags.every((t) => typeof t === "string")
  ) {
    return json({ ok: false, message: "That request couldn't be read." }, 400);
  }

  const outcome = await publishComponent(supabase, {
    componentId: params.componentId,
    objectId: body.objectId,
    details: { title: d.title, description: d.description, category: d.category, tags: d.tags as string[] },
    checkResults: body.checkResults,
    idempotencyKey: body.idempotencyKey,
    previewLight: body.previewLight,
    previewDark: body.previewDark,
    origin: new URL(request.url).origin,
  });
  return json(outcome, outcome.ok ? 200 : outcome.status);
}
