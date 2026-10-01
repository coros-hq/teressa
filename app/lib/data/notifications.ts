import { commentPath, publicPagePath } from "../paths.ts";

export type NotificationKind = "feedback" | "reply" | "new_component";

export type Notification = {
  kind: NotificationKind;
  id: string;
  at: string;
  actor_name: string | null;
  component_name: string;
  slug: string;
  body: string | null;
};

export type NotificationsPayload = {
  seen_at: string;
  unread: number;
  total: number;
  items: Notification[];
};

export const PAGE_SIZE = 20;
export const MENU_SIZE = 6;

const who = (n: Notification) => n.actor_name?.trim() || "Someone";

/** The sentence a notification reads as, without the person's words. */
export function notificationText(n: Notification): string {
  switch (n.kind) {
    case "feedback":
      return `${who(n)} left feedback on ${n.component_name}`;
    case "reply":
      return `${who(n)} replied to your comment on ${n.component_name}`;
    case "new_component":
      return `${who(n)} published ${n.component_name}`;
  }
}

/** Feedback and replies lead to that comment; a new component leads to its page. */
export function notificationHref(n: Notification): string {
  return n.kind === "new_component" ? publicPagePath(n.slug) : commentPath(n.slug, n.id);
}

export const isUnread = (n: Notification, seenAt: string) => new Date(n.at).getTime() > new Date(seenAt).getTime();

/** "3", or "99+" so the badge never grows wider than the bell. */
export const badgeText = (count: number) => (count > 99 ? "99+" : String(count));
