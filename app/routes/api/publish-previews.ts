import type { Route } from "./+types/publish-previews";
import { PREVIEW_MAX_BYTES, storePreviews } from "~/lib/data/previews.server";
import { guard } from "~/lib/security.server";

// POST /api/publish/:componentId/previews  (form data: light, dark)
// Stores the preview images made in the browser. Storage's own rules (only authors of this
// component, 1 MB, png/webp, add-only) apply as a second layer.
export async function action({ request, params }: Route.ActionArgs) {
  const g = await guard(request);
  if ("response" in g) return g.response;
  if (request.method !== "POST") return g.json({ ok: false, message: "Method not allowed." }, 405);

  if (Number(request.headers.get("Content-Length") ?? 0) > PREVIEW_MAX_BYTES * 2 + 64 * 1024) {
    return g.json({ ok: false, message: "Those previews are too large." }, 413);
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return g.json({ ok: false, message: "That upload couldn't be read." }, 400);
  }
  const light = form.get("light");
  const dark = form.get("dark");
  if (!(light instanceof File) || !(dark instanceof File)) return g.json({ ok: false, message: "Both previews are needed." }, 400);

  const result = await storePreviews(g.supabase, params.componentId, {
    light: new Uint8Array(await light.arrayBuffer()),
    dark: new Uint8Array(await dark.arrayBuffer()),
  });
  return g.json(result, result.ok ? 200 : result.status);
}
