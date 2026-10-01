import { data, redirect, useLoaderData } from "react-router";

import type { Route } from "./+types/studio";
import { CodeStudioPage } from "~/components/studio/code-studio-page";
import { StudioPage } from "~/components/studio/studio-page";
import { getComponent } from "~/lib/components.server";
import { NEW_COMPONENT_PATH } from "~/lib/paths";
import { getUser } from "~/lib/supabase/server";

export function meta() {
  return [{ title: "Studio" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { supabase, headers } = await getUser(request);

  // An old "new component" address: the choice of canvas or code is made on /new.
  if (params.componentId === "new") throw redirect(NEW_COMPONENT_PATH, { headers });

  const row = await getComponent(supabase, params.componentId);
  if (!row) throw data("Component not found", { status: 404, headers });
  return data(
    {
      component: {
        id: row.id,
        name: row.name,
        projectName: row.project_name,
        description: row.description ?? "",
        category: row.category ?? "",
        tags: row.tags ?? [],
        status: row.status as "draft" | "published",
        editor: row.editor ?? "canvas",
        // Same shape the canvas code already understands: { version, objects }.
        design: { version: row.version, objects: row.objects },
      },
    },
    { headers },
  );
}

export default function Studio() {
  const { component } = useLoaderData<typeof loader>();
  const Page = component.editor === "code" ? CodeStudioPage : StudioPage;
  return <Page key={component.id} component={component} />;
}
