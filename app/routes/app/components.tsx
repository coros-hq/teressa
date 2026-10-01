import { FolderKanban } from "lucide-react";
import { Link, data } from "react-router";

import type { Route } from "./+types/components";
import { EmptyState } from "~/components/dashboard/empty-state";
import { PageContainer } from "~/components/dashboard/page-container";
import { PageHeader } from "~/components/dashboard/page-header";
import { Button } from "~/components/ui/button";
import { DeleteComponent } from "~/components/dashboard/delete-component";
import { deleteComponent, listComponents } from "~/lib/components.server";
import { NEW_COMPONENT_PATH } from "~/lib/paths";
import { createAdminClient } from "~/lib/supabase/admin.server";
import { removePreviewsOf } from "~/lib/data/previews.server";
import { getUser } from "~/lib/supabase/server";

export function meta() {
  return [{ title: "My components" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = await getUser(request);
  return data({ components: await listComponents(supabase) }, { headers });
}

export async function action({ request }: Route.ActionArgs) {
  // Only our own pages may delete.
  const site = request.headers.get("Sec-Fetch-Site");
  if (site && site !== "same-origin") return data({ ok: false, message: "Request blocked." }, { status: 403 });
  const { supabase, user, headers } = await getUser(request);
  if (!user) return data({ ok: false, message: "Sign in again to continue." }, { status: 401, headers });
  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  if (form.get("intent") !== "delete" || !/^[0-9a-f-]{36}$/i.test(id)) return data({ ok: false, message: "That request couldn't be read." }, { status: 400, headers });
  const result = await deleteComponent(supabase, id);
  // The images are only worth removing once the component is really gone. A failure here leaves
  // orphaned files, which nobody can reach, so it must not turn a successful delete into an error.
  if (result.ok) await removePreviewsOf(createAdminClient(), [id]).catch(() => {});
  return data(result, { status: result.ok ? 200 : 400, headers });
}

export default function MyComponents({ loaderData }: Route.ComponentProps) {
  const { components } = loaderData;

  return (
    <PageContainer>
      <PageHeader
        title="My components"
        description="The components you have created will show up here."
        actions={
          components.length > 0 && (
            <Button asChild>
              <Link to={NEW_COMPONENT_PATH}>
                New component
              </Link>
            </Button>
          )
        }
      />
      {components.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No components yet"
          description="Create your first component to see it here."
          actionLabel="New component"
          actionHref={NEW_COMPONENT_PATH}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {components.map((c) => (
            <li key={c.id} className="relative">
              <Link
                to={`/studio/${c.id}`}
                className="hover:bg-muted/50 focus-visible:ring-ring/50 grid gap-1 rounded-xl border p-4 pr-14 outline-none focus-visible:ring-3"
              >
                <span className="truncate font-medium">{c.name}</span>
                <span className="text-muted-foreground truncate text-sm">
                  {c.status === "published" ? "Published" : "Draft"} · {c.project_name} · edited{" "}
                  {new Date(c.updated_at).toLocaleDateString()}
                </span>
              </Link>
              <DeleteComponent id={c.id} name={c.name} published={c.status === "published"} />
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
