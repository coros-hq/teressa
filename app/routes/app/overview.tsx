import { Suspense } from "react";
import { Await, data } from "react-router";

import type { Route } from "./+types/overview";
import { OverviewBody, OverviewHeader, OverviewSkeleton } from "~/components/overview/overview-page";
import { PageContainer } from "~/components/dashboard/page-container";
import { getOverview } from "~/lib/data/overview.server";
import { getUser } from "~/lib/supabase/server";

export function meta() {
  return [{ title: "Overview" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user, supabase, headers } = await getUser(request);
  const fullName = (user?.user_metadata?.full_name as string | undefined)?.trim();
  return data(
    {
      firstName: fullName ? fullName.split(/\s+/)[0] : null,
      // Not awaited: the page and its loading skeleton appear straight away, and the blocks fill in.
      overview: getOverview(supabase),
    },
    { headers },
  );
}

export default function Overview({ loaderData }: Route.ComponentProps) {
  return (
    <PageContainer>
      <OverviewHeader firstName={loaderData.firstName} />
      <Suspense fallback={<OverviewSkeleton />}>
        <Await resolve={loaderData.overview}>{(result) => <OverviewBody result={result} />}</Await>
      </Suspense>
    </PageContainer>
  );
}
