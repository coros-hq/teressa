import { Bell } from "lucide-react";
import { useEffect } from "react";
import { Link, data, useFetcher } from "react-router";

import type { Route } from "./+types/notifications";
import { EmptyState } from "~/components/dashboard/empty-state";
import { NotificationItem } from "~/components/dashboard/notification-item";
import { PageContainer } from "~/components/dashboard/page-container";
import { PageHeader } from "~/components/dashboard/page-header";
import { Button } from "~/components/ui/button";
import { PAGE_SIZE } from "~/lib/data/notifications";
import { getNotifications, markNotificationsSeen } from "~/lib/data/notifications.server";
import { getUser } from "~/lib/supabase/server";

export function meta() {
  return [{ title: "Notifications" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = await getUser(request);
  const raw = Number(new URL(request.url).searchParams.get("page"));
  const page = Number.isInteger(raw) && raw >= 1 && raw <= 1000 ? raw : 1;
  return data({ page, ...(await getNotifications(supabase, PAGE_SIZE, (page - 1) * PAGE_SIZE)) }, { headers });
}

// Looking at this page counts as seeing everything.
export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = await getUser(request);
  return data({ ok: await markNotificationsSeen(supabase) }, { headers });
}

export default function Notifications({ loaderData }: Route.ComponentProps) {
  const { items, total, unread, seen_at: seenAt, page } = loaderData;
  const marker = useFetcher();
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // After the page has shown what is new, so the highlights are visible on this visit.
  useEffect(() => {
    if (unread > 0) marker.submit({}, { method: "post" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread, page]);

  return (
    <PageContainer>
      <PageHeader title="Notifications" description="Feedback on your components, replies to your comments, and new components from others." />
      {total === 0 ? (
        <EmptyState icon={Bell} title="Nothing yet" description="When someone leaves feedback, replies to you, or publishes a component, it shows up here." />
      ) : (
        <>
          <ul className="grid gap-1">
            {items.map((n) => (
              <li key={`${n.kind}:${n.id}`}>
                <NotificationItem n={n} seenAt={seenAt} className="border" />
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <nav aria-label="Pages" className="flex items-center justify-between gap-2 pt-4">
              <Button asChild variant="outline" className="min-h-11" disabled={page <= 1}>
                <Link to={`?page=${page - 1}`} aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} className={page <= 1 ? "pointer-events-none opacity-50" : undefined}>
                  Newer
                </Link>
              </Button>
              <span className="text-muted-foreground text-sm">
                Page {page} of {pages}
              </span>
              <Button asChild variant="outline" className="min-h-11" disabled={page >= pages}>
                <Link to={`?page=${page + 1}`} aria-disabled={page >= pages} tabIndex={page >= pages ? -1 : undefined} className={page >= pages ? "pointer-events-none opacity-50" : undefined}>
                  Older
                </Link>
              </Button>
            </nav>
          )}
        </>
      )}
    </PageContainer>
  );
}
