import { redirect } from "react-router";

import type { Route } from "./+types/sign-out";
import { createClient } from "~/lib/supabase/server";

export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = createClient(request);
  await supabase.auth.signOut();
  return redirect("/sign-in", { headers });
}

export function loader() {
  return redirect("/");
}
