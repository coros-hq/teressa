import type { Route } from "./+types/settings-avatar";
import { removeAvatar, uploadAvatar } from "~/lib/data/profile.server";
import { guard } from "~/lib/security.server";
import { AVATAR } from "~/lib/settings/validation";

// POST (a file in the form data) replaces the avatar; DELETE removes it. The file is checked again
// here, and Storage's own policy and bucket limits are a third layer.
export async function action({ request }: Route.ActionArgs) {
  const g = await guard(request);
  if ("response" in g) return g.response;

  if (request.method === "DELETE") {
    const r = await removeAvatar(g.supabase, g.user.id);
    return g.json(r, r.ok ? 200 : 500);
  }
  if (request.method !== "POST") return g.json({ ok: false, message: "Method not allowed." }, 405);

  // Stop early on an obviously oversized request instead of reading it all.
  const length = Number(request.headers.get("Content-Length") ?? 0);
  if (length > AVATAR.maxBytes + 64 * 1024) return g.json({ ok: false, message: "That image is larger than 2 MB. Choose a smaller one." }, 413);

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return g.json({ ok: false, message: "That upload couldn't be read." }, 400);
  }
  if (!(file instanceof File)) return g.json({ ok: false, message: "Choose an image to upload." }, 400);

  const r = await uploadAvatar(g.supabase, g.user.id, new Uint8Array(await file.arrayBuffer()));
  return g.json(r, r.ok ? 200 : 400);
}
