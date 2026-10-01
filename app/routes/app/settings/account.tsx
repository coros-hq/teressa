import { data } from "react-router";

import type { Route } from "./+types/account";
import { AccountSection } from "~/components/settings/account-section";
import { getProfile } from "~/lib/data/profile.server";
import { getAccount } from "~/lib/data/settings.server";
import { getUser } from "~/lib/supabase/server";

export function meta() {
  return [{ title: "Account settings" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user, supabase, headers } = await getUser(request);
  const load = async () => {
    if (!user) throw new Error("Not signed in");
    const [account, profile] = await Promise.all([getAccount(supabase), getProfile(supabase, user.id)]);
    return { account, username: profile.username || null };
  };
  return data({ info: load() }, { headers });
}

export default function AccountSettings({ loaderData }: Route.ComponentProps) {
  return <AccountSection info={loaderData.info} />;
}
