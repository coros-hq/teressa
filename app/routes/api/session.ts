import type { Route } from "./+types/session";
import { getUser } from "~/lib/supabase/server";

// GET /api/session : is the visitor signed in? The root page asks this to decide where to send people.
// It goes through the normal session check, so the sign-in cookies are refreshed if they need to be.
export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await getUser(request);
  headers.set("Cache-Control", "no-store");
  return Response.json({ authenticated: !!user }, { headers });
}
