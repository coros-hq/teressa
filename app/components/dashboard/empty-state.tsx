import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

// For pages or sections that have no data yet.
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  compact = false,
  headingAs: Heading = "h2",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Renders the action as a link instead of a button. */
  actionHref?: string;
  /** Less padding, for inside a block that already has its own heading. */
  compact?: boolean;
  /** Heading level for the title, so it sits correctly under the page's headings. */
  headingAs?: "h2" | "h3";
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 text-center",
        compact ? "py-8" : "py-16"
      )}
    >
      <span className="bg-muted text-muted-foreground grid size-12 place-items-center rounded-full">
        <Icon className="size-6" />
      </span>
      <div className="grid gap-1">
        <Heading className="text-lg font-semibold">{title}</Heading>
        <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
      </div>
      {actionLabel &&
        (actionHref ? (
          <Button asChild className={compact ? "min-h-11" : undefined}>
            <Link to={actionHref}>{actionLabel}</Link>
          </Button>
        ) : (
          <Button onClick={onAction} className={compact ? "min-h-11" : undefined}>
            {actionLabel}
          </Button>
        ))}
    </div>
  );
}
