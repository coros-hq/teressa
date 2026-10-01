import type { Route } from "./+types/settings-username";
import { checkUsername } from "~/lib/data/profile.server";
import { guard } from "~/lib/security.server";

// GET /api/settings/username?u=name : is this username free? Used as the person types.
export async function loader({ request }: Route.LoaderArgs) {
  const g = await guard(request);
  if ("response" in g) return g.response;
  const u = new URL(request.url).searchParams.get("u") ?? "";
  try {
    return g.json(await checkUsername(g.supabase, u.slice(0, 60)));
  } catch {
    return g.json({ state: "error", message: "Couldn't check that right now." }, 503);
  }
}
