import type { Route } from "./+types/item";
import { getPublishedVersion } from "~/lib/publishing.server";
import { buildRegistryItem, parseRegistryFile } from "~/lib/publish/registry";
import { createPublicClient } from "~/lib/supabase/server";

// GET /r/:slug.json and /r/:slug@:version.json: public, no sign-in. Serves a published version in
// the registry format the install command reads. Drafts are never reachable from here: this reads
// only published versions.
const CORS = { "Access-Control-Allow-Origin": "*" };

const notFound = () =>
  Response.json({ error: "Not found" }, { status: 404, headers: { ...CORS, "Cache-Control": "public, max-age=30" } });

export async function loader({ params }: Route.LoaderArgs) {
  // The route is /r/:file so the ".json" suffix is ours to read, not the router's.
  const parsed = parseRegistryFile(params.file);
  if (!parsed) return notFound();

  let version;
  try {
    version = await getPublishedVersion(createPublicClient(), parsed.slug, parsed.version);
  } catch {
    // The database is unreachable or broken: say so in JSON, and don't let anyone cache it.
    return Response.json(
      { error: "Temporarily unavailable" },
      { status: 503, headers: { ...CORS, "Cache-Control": "no-store", "Retry-After": "30" } },
    );
  }
  if (!version) return notFound();

  return new Response(JSON.stringify(buildRegistryItem(version)), {
    headers: {
      ...CORS,
      "Content-Type": "application/json; charset=utf-8",
      // A pinned version never changes, so it may be kept longer. "Latest" moves when a new
      // version is published, so it is kept briefly and then checked again.
      "Cache-Control": parsed.version
        ? "public, max-age=3600, s-maxage=86400"
        : "public, max-age=60, s-maxage=300, stale-while-revalidate=60",
    },
  });
}
