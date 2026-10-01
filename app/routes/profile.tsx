import { data, isRouteErrorResponse, Link, redirect } from "react-router";

import type { Route } from "./+types/profile";
import { PublicLayout } from "~/components/gallery/public-layout";
import { ProfileView } from "~/components/profile/profile-page";
import { parseHandle } from "~/lib/data/profile-page";
import { getProfilePage } from "~/lib/data/profile-page.server";
import { createPublicClient } from "~/lib/supabase/server";
import { publicProfilePath } from "~/lib/paths";

export function meta({ loaderData }: Route.MetaArgs) {
  const p = loaderData?.page.profile;
  if (!p) return [{ title: "Profile not found" }];
  const name = p.name ?? (p.username ? `@${p.username}` : "A Teressa member");
  return [{ title: `${name} · Teressa` }, { name: "description", content: p.bio ?? `Components published by ${name} on Teressa.` }];
}

// Public and the same for everyone, like the gallery, so it may be kept for a few minutes.
export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const handle = parseHandle(params.handle);
  if (!handle) throw data("Not found", { status: 404 });
  const page = await getProfilePage(createPublicClient(), handle);
  if (!page) throw data("Not found", { status: 404 });
  // One address per person: someone reached by id who has since chosen a username goes to that.
  if (handle.by === "id" && page.profile.username) throw redirect(publicProfilePath(page.profile.username));
  return data(
    { page, origin: new URL(request.url).origin },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300" } },
  );
}

export default function Profile({ loaderData }: Route.ComponentProps) {
  return (
    <PublicLayout>
      <ProfileView page={loaderData.page} origin={loaderData.origin} />
    </PublicLayout>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return (
    <PublicLayout>
      <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-3 px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold">{missing ? "We couldn't find that person" : "We couldn't load this profile"}</h1>
        <p className="text-muted-foreground">{missing ? "The address may be wrong, or the account may have been deleted." : "Something went wrong on our side. Please try again in a moment."}</p>
        <Link to="/explore" className="bg-primary text-primary-foreground focus-visible:ring-ring/50 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium outline-none focus-visible:ring-3">
          Back to explore
        </Link>
      </div>
    </PublicLayout>
  );
}
