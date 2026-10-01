import { Code2, PenTool } from "lucide-react";
import { Form, Link, data, redirect, useNavigation } from "react-router";

import type { Route } from "./+types/new-component";
import { PageContainer } from "~/components/dashboard/page-container";
import { PageHeader } from "~/components/dashboard/page-header";
import { Button } from "~/components/ui/button";
import { createComponent, parseEditor } from "~/lib/components.server";
import { MY_COMPONENTS_PATH } from "~/lib/paths";
import { getUser } from "~/lib/supabase/server";

export function meta() {
  return [{ title: "New component" }];
}

// Where "New component" leads: choose how to make it. Picking one creates the draft and opens it.
export async function action({ request }: Route.ActionArgs) {
  const site = request.headers.get("Sec-Fetch-Site");
  if (site && site !== "same-origin") throw data("Request blocked.", { status: 403 });
  const { supabase, user, headers } = await getUser(request);
  if (!user) throw redirect("/sign-in", { headers });
  const editor = parseEditor((await request.formData()).get("editor"));
  if (!editor) throw data("Choose how to make it.", { status: 400, headers });
  throw redirect(`/studio/${await createComponent(supabase, editor)}`, { headers });
}

const CHOICES = [
  {
    editor: "canvas",
    icon: PenTool,
    title: "Design on a canvas",
    description: "Draw it with shapes, text and layers, and adjust it visually. The code is written for you as you go.",
  },
  {
    editor: "code",
    icon: Code2,
    title: "Write the code",
    description: "Open an editor with a live preview next to it. Type your component and watch it update.",
  },
] as const;

export default function NewComponent() {
  const navigation = useNavigation();
  const creating = navigation.state !== "idle" ? navigation.formData?.get("editor") : null;

  return (
    <PageContainer>
      <PageHeader title="New component" description="How would you like to make it?" />
      <div className="grid gap-4 sm:grid-cols-2">
        {CHOICES.map(({ editor, icon: Icon, title, description }) => (
          <Form key={editor} method="post" className="contents">
            <input type="hidden" name="editor" value={editor} />
            <button
              type="submit"
              disabled={creating !== null}
              className="bg-card text-card-foreground hover:bg-muted/50 focus-visible:ring-ring/50 grid min-h-44 content-start gap-3 rounded-xl border p-6 text-left outline-none focus-visible:ring-3 disabled:opacity-60"
            >
              <span className="bg-muted text-foreground grid size-11 place-items-center rounded-lg">
                <Icon aria-hidden className="size-5" />
              </span>
              <span className="grid gap-1">
                <span className="text-lg font-semibold">{title}</span>
                <span className="text-muted-foreground text-sm">{description}</span>
              </span>
              {creating === editor && (
                <span role="status" className="text-muted-foreground text-sm">
                  Creating…
                </span>
              )}
            </button>
          </Form>
        ))}
      </div>
      <div className="pt-2">
        <Button asChild variant="ghost" className="min-h-11">
          <Link to={MY_COMPONENTS_PATH}>Cancel</Link>
        </Button>
      </div>
    </PageContainer>
  );
}
