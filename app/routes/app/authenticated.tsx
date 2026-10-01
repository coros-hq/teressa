import { Outlet, data, redirect } from "react-router";

import type { Route } from "./+types/authenticated";
import { avatarUrlFor } from "~/lib/data/profile.server";
import { getUser } from "~/lib/supabase/server";

// Wraps every signed-in page, both the dashboard pages and the full-screen studio. Signed-out
// visitors are sent to /sign-in; the verified user is handed to the pages below via loader data.
export async function loader({ request }: Route.LoaderArgs) {
  const { user, supabase, headers } = await getUser(request);
  if (!user) throw redirect("/sign-in", { headers });
  // The name and picture people chose in Settings live on the profile, not in the sign-in record.
  const { data: profile } = await supabase.from("profiles").select("full_name, avatar_path").eq("id", user.id).maybeSingle();
  return data(
    {
      user: {
        id: user.id,
        email: user.email ?? "",
        name: profile?.full_name || (user.user_metadata?.full_name as string | undefined) || user.email || "",
        avatarUrl: avatarUrlFor(profile?.avatar_path ?? null),
      },
    },
    { headers },
  );
}

export default function Authenticated() {
  return <Outlet />;
}
