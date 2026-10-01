import { data } from "react-router";

import type { Route } from "./+types/save-component";
import { getUser } from "~/lib/supabase/server";

// Autosave target for the studio: POST { name, projectName, objects } to /api/components/:id.
export async function action({ request, params }: Route.ActionArgs) {
  const { user, supabase, headers } = await getUser(request);
  if (!user) return data({ ok: false }, { status: 401, headers });

  const body = (await request.json()) as {
    name?: unknown;
    projectName?: unknown;
    objects?: unknown;
    description?: unknown;
    category?: unknown;
    tags?: unknown;
  };
  if (typeof body.name !== "string" || typeof body.projectName !== "string" || !Array.isArray(body.objects)) {
    return data({ ok: false }, { status: 400, headers });
  }

  const { error } = await supabase
    .from("components")
    .update({
      name: body.name.trim() || "Untitled component",
      project_name: body.projectName.trim() || "My project",
      objects: body.objects,
      version: 2,
      // Publish details, kept with the draft so they're filled in next time. Only what fits.
      description: typeof body.description === "string" ? body.description.slice(0, 160) : null,
      category: typeof body.category === "string" ? body.category.slice(0, 40) : null,
      tags: Array.isArray(body.tags)
        ? body.tags.filter((t): t is string => typeof t === "string").map((t) => t.slice(0, 24)).slice(0, 5)
        : [],
    })
    .eq("id", params.componentId);

  if (error) return data({ ok: false }, { status: 500, headers });
  return data({ ok: true }, { headers });
}
