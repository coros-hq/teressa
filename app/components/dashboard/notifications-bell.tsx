import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useFetcher } from "react-router";

import { Button } from "~/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { badgeText, type NotificationsPayload } from "~/lib/data/notifications";

import { NotificationItem } from "./notification-item";

const ENDPOINT = "/api/notifications";
const REFRESH_MS = 60_000;

const isPayload = (d: unknown): d is NotificationsPayload => !!d && typeof d === "object" && "items" in d;

/** The bell in the header: an unread count, and the latest few notifications in a menu. */
export function NotificationsBell() {
  const list = useFetcher<NotificationsPayload | { ok: false }>();
  const marker = useFetcher();
  const [open, setOpen] = useState(false);
  const [cleared, setCleared] = useState(false);
  const marked = useRef(false);

  const refresh = useCallback(() => void list.load(ENDPOINT), [list.load]);

  // Fetch once, then quietly again every minute and whenever the tab is looked at again. Not while
  // the menu is open, so the list doesn't change under the pointer.
  useEffect(() => {
    refresh();
    const tick = () => document.visibilityState === "visible" && !open && refresh();
    const id = setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh, open]);

  const payload = isPayload(list.data) ? list.data : null;

  // Opening the menu counts as seeing the notifications, once the latest have been shown. Marking them
  // only after that keeps the "new" highlights visible for as long as the menu stays open.
  useEffect(() => {
    if (!open || marked.current || list.state !== "idle" || !payload) return;
    marked.current = true;
    setCleared(true);
    if (payload.unread > 0) marker.submit({}, { method: "post", action: ENDPOINT });
  }, [open, list.state, payload, marker]);

  const unread = cleared ? 0 : (payload?.unread ?? 0);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          marked.current = false;
          refresh();
        } else {
          setCleared(false);
          refresh();
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-10 rounded-full" aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}>
          <Bell aria-hidden />
          {unread > 0 && (
            <span aria-hidden className="bg-primary text-primary-foreground absolute top-0.5 right-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[10px] leading-4 font-semibold">
              {badgeText(unread)}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-w-[calc(100vw-2rem)] p-0">
        <div className="border-b px-4 py-3 text-sm font-semibold">Notifications</div>
        {!payload ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm" role="status">
            {list.state === "loading" || !list.data ? "Loading…" : "Notifications couldn't be loaded."}
          </p>
        ) : payload.items.length === 0 ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">Nothing yet. You&apos;ll see feedback, replies and new components here.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto p-1">
            {payload.items.map((n) => (
              <DropdownMenuItem key={`${n.kind}:${n.id}`} asChild className="p-0">
                <NotificationItem n={n} seenAt={payload.seen_at} className="!items-start !gap-3 !rounded-lg !px-3 !py-2.5" />
              </DropdownMenuItem>
            ))}
          </div>
        )}
        <div className="border-t p-1">
          <DropdownMenuItem asChild className="min-h-11 justify-center text-sm font-medium">
            <Link to="/notifications">See all notifications</Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
