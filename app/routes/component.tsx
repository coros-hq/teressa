import { data, isRouteErrorResponse, Link } from "react-router";

import type { Route } from "./+types/component";
import { ComponentDetail } from "~/components/component-page/component-detail";
import { PublicLayout } from "~/components/gallery/public-layout";
import { Button } from "~/components/ui/button";
import {
  deleteOwnComment, getComponentPage, postFeedback, postReply, setFeedbackStatus,
} from "~/lib/data/component-page.server";
import { parseDiscussionParams } from "~/lib/data/discussion";
import { getUser } from "~/lib/supabase/server";

export function meta({ loaderData }: Route.MetaArgs) {
  const c = loaderData?.page.component;
  if (!c) return [{ title: "Component not found" }];
  return [{ title: `${c.name} · Teressa` }, { name: "description", content: c.description }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { user, supabase, headers } = await getUser(request);
  const page = await getComponentPage(supabase, params.slug);
  if (!page) throw data("Not found", { status: 404, headers });
  const url = new URL(request.url);
  // The page depends on who is looking (the forms and buttons), so it isn't shared between people.
  headers.set("Cache-Control", "private, no-cache");
  return data({ page, viewerId: user?.id ?? null, view: parseDiscussionParams(url), origin: url.origin }, { headers });
}

// One action for everything on the page: post feedback, reply, mark addressed, delete.
export async function action({ request, params }: Route.ActionArgs) {
  const { user, supabase, headers } = await getUser(request);
  const reply = (body: unknown, status = 200) => data(body, { status, headers });

  const site = request.headers.get("Sec-Fetch-Site");
  if (site && site !== "same-origin") return reply({ ok: false, message: "Request blocked." }, 403);
  if (!user) return reply({ ok: false, message: "Sign in to join the discussion." }, 401);

  const form = await request.formData();
  const text = (k: string) => String(form.get(k) ?? "");
  let result;
  switch (text("intent")) {
    case "feedback":
      result = await postFeedback(supabase, { slug: params.slug, body: text("body"), category: text("category"), line: text("line") });
      break;
    case "reply":
      result = await postReply(supabase, { slug: params.slug, parentId: text("parentId"), body: text("body") });
      break;
    case "status":
      result = await setFeedbackStatus(supabase, text("commentId"), text("status"));
      break;
    case "delete":
      result = await deleteOwnComment(supabase, text("commentId"));
      break;
    default:
      return reply({ ok: false, message: "That request couldn't be read." }, 400);
  }
  return reply(result, result.ok ? 200 : result.status);
}

export default function ComponentRoute({ loaderData }: Route.ComponentProps) {
  return (
    <PublicLayout signedIn={!!loaderData.viewerId}>
      <ComponentDetail page={loaderData.page} viewerId={loaderData.viewerId} view={loaderData.view} origin={loaderData.origin} />
    </PublicLayout>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return (
    <PublicLayout>
      <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-3 px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold">{missing ? "We couldn't find that component" : "Something went wrong"}</h1>
        <p className="text-muted-foreground">
          {missing ? "It may have been removed, or the address might be mistyped." : "Please try again in a moment."}
        </p>
        <Button asChild className="min-h-11">
          <Link to="/explore">Browse components</Link>
        </Button>
      </div>
    </PublicLayout>
  );
}
