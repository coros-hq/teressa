import { data } from "react-router";

import type { Route } from "./+types/profile";
import { ProfileSection } from "~/components/settings/profile-form";
import { getProfile, updateProfile } from "~/lib/data/profile.server";
import { getUser } from "~/lib/supabase/server";
import type { ProfileInput } from "~/lib/settings/validation";

export function meta() {
  return [{ title: "Profile settings" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user, supabase, headers } = await getUser(request);
  // Not awaited: the page and its loading skeleton show straight away.
  return data({ profile: user ? getProfile(supabase, user.id) : Promise.reject(new Error("Not signed in")) }, { headers });
}

export async function action({ request }: Route.ActionArgs) {
  const { user, supabase, headers } = await getUser(request);
  if (!user) return data({ ok: false as const, message: "Sign in again to continue." }, { status: 401, headers });
  const site = request.headers.get("Sec-Fetch-Site");
  if (site && site !== "same-origin") return data({ ok: false as const, message: "Request blocked." }, { status: 403, headers });

  const body = (await request.json().catch(() => null)) as Partial<Record<keyof ProfileInput, unknown>> | null;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const result = await updateProfile(supabase, user.id, {
    displayName: str(body?.displayName),
    username: str(body?.username),
    bio: str(body?.bio),
    website: str(body?.website),
    githubUsername: str(body?.githubUsername),
  });
  return data(result.ok ? { ok: true as const } : { ok: false as const, fieldErrors: result.fieldErrors, message: result.message }, { status: result.ok ? 200 : 400, headers });
}

export default function ProfileSettings({ loaderData }: Route.ComponentProps) {
  return <ProfileSection profile={loaderData.profile} />;
}
