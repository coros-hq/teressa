import { Link } from "react-router";
import { MessageSquare, Reply, Sparkles, type LucideIcon } from "lucide-react";

import { RelativeTime } from "~/components/overview/relative-time";
import { isUnread, notificationHref, notificationText, type Notification, type NotificationKind } from "~/lib/data/notifications";
import { cn } from "~/lib/utils";

const ICONS: Record<NotificationKind, LucideIcon> = { feedback: MessageSquare, reply: Reply, new_component: Sparkles };

/** One notification as a link. Shared by the header menu and the full page. */
export function NotificationItem({
  n,
  seenAt,
  className,
  ...props
}: { n: Notification; seenAt: string } & Omit<React.ComponentProps<typeof Link>, "to">) {
  const Icon = ICONS[n.kind];
  const unread = isUnread(n, seenAt);
  return (
    <Link
      to={notificationHref(n)}
      className={cn("hover:bg-muted focus-visible:ring-ring/50 flex min-h-14 items-start gap-3 rounded-lg px-3 py-2.5 outline-none focus-visible:ring-3", unread && "bg-muted/50", className)}
      {...props}
    >
      <span className="bg-muted text-muted-foreground mt-0.5 grid size-8 shrink-0 place-items-center rounded-full">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-sm font-medium">
          {unread && <span className="sr-only">New: </span>}
          {notificationText(n)}
        </span>
        {n.body && <span className="text-muted-foreground line-clamp-2 text-sm">{n.body}</span>}
        <span className="text-muted-foreground text-xs">
          <RelativeTime iso={n.at} />
        </span>
      </span>
      {unread && <span aria-hidden className="bg-primary mt-2 size-2 shrink-0 rounded-full" />}
    </Link>
  );
}
