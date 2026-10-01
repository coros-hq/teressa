import { useRef, useState } from "react";
import { toast } from "sonner";

import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { postJson } from "~/lib/settings/client";
import { NOTIFICATION_DEFAULTS, type NotificationKey, type NotificationPrefs } from "~/lib/settings/validation";

import { Deferred, SectionCard } from "./section";

// Only emails the product will really send. Each toggle saves by itself.
const ITEMS: { key: NotificationKey; label: string; description: string }[] = [
  { key: "newFeedback", label: "New feedback on my components", description: "An email when someone leaves a comment on something you published." },
  { key: "commentReplies", label: "Replies to my comments", description: "An email when someone answers a comment you wrote." },
  { key: "feedbackAddressed", label: "My feedback was marked addressed", description: "An email when an owner says they've dealt with your comment." },
  { key: "productUpdates", label: "Product updates and launch news", description: "Occasional news about new features. Off unless you turn it on." },
];

export function NotificationsForm({ prefs }: { prefs: Promise<NotificationPrefs> }) {
  return (
    <Deferred resolve={prefs} rows={4}>
      {(p) => <NotificationsList initial={p} />}
    </Deferred>
  );
}

export function NotificationsList({ initial }: { initial: NotificationPrefs }) {
  const [prefs, setPrefs] = useState<NotificationPrefs>({ ...NOTIFICATION_DEFAULTS, ...initial });
  const busy = useRef(new Set<NotificationKey>());

  async function toggle(key: NotificationKey, value: boolean) {
    if (busy.current.has(key)) return;
    busy.current.add(key);
    setPrefs((p) => ({ ...p, [key]: value })); // optimistic
    const result = await postJson("/api/settings/notifications", { key, value });
    busy.current.delete(key);
    if (!result.ok) {
      setPrefs((p) => ({ ...p, [key]: !value })); // put it back
      toast.error(result.message ?? "Couldn't save that.", { action: { label: "Try again", onClick: () => void toggle(key, value) } });
    }
  }

  return (
    <SectionCard
      id="notifications"
      title="Email notifications"
      description="Choose which emails you'd like to get. Changes save as you go."
    >
      <ul className="divide-y">
        {ITEMS.map((item) => (
          <li key={item.key} className="flex min-h-11 items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="grid min-w-0 gap-0.5">
              <Label htmlFor={`notify-${item.key}`} className="text-sm font-medium">
                {item.label}
              </Label>
              <p id={`notify-${item.key}-desc`} className="text-muted-foreground text-sm">
                {item.description}
              </p>
            </div>
            <Switch
              id={`notify-${item.key}`}
              checked={prefs[item.key]}
              aria-describedby={`notify-${item.key}-desc`}
              onCheckedChange={(v) => void toggle(item.key, v)}
              className="mt-0.5"
            />
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-sm">
        These only control emails. There are no in-app notifications yet.
      </p>
    </SectionCard>
  );
}
