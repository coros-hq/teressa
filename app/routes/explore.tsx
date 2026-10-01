import { data } from "react-router";

import type { Route } from "./+types/explore";
import { GalleryPage } from "~/components/gallery/gallery-page";
import { PublicLayout } from "~/components/gallery/public-layout";
import { getGallery } from "~/lib/data/gallery.server";
import { parseGalleryParams } from "~/lib/data/gallery";
import { createPublicClient } from "~/lib/supabase/server";

export function meta() {
  return [
    { title: "Explore components" },
    { name: "description", content: "Free, ready-to-use components made by people on Teressa. Copy one into your project." },
  ];
}

// Public: no sign-in, and the same for everyone, so a CDN or browser may keep it for a few minutes.
export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const params = parseGalleryParams(url);
  const result = await getGallery(createPublicClient(), params);
  return data(
    { result, params, origin: url.origin },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300" } },
  );
}

export default function Explore({ loaderData }: Route.ComponentProps) {
  return (
    <PublicLayout>
      <GalleryPage result={loaderData.result} params={loaderData.params} origin={loaderData.origin} />
    </PublicLayout>
  );
}

// If the gallery can't load, say so inside the same page shell, with a way to try again.
export function ErrorBoundary() {
  return (
    <PublicLayout>
      <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-3 px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold">We couldn&apos;t load the gallery</h1>
        <p className="text-muted-foreground">Something went wrong on our side. Please try again in a moment.</p>
        <a href="/explore" className="bg-primary text-primary-foreground focus-visible:ring-ring/50 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium outline-none focus-visible:ring-3">
          Try again
        </a>
      </div>
    </PublicLayout>
  );
}
