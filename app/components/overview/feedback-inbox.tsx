import { ChevronRight, MessageSquare } from "lucide-react";
import { Link } from "react-router";

import { EmptyState } from "~/components/dashboard/empty-state";
import { categoryLabel, excerpt, type FeedbackItem, type Section } from "~/lib/data/overview";
import { HAS_PUBLIC_PAGE, commentPath } from "~/lib/paths";
import { cn } from "~/lib/utils";

import { Block, BlockError, RowCard, RowsSkeleton, ROW_MIN_HEIGHT, rowLinkClass } from "./block";
import { RelativeTime } from "./relative-time";

// Each item opens the comment on the component's page.
export function FeedbackRow({ item }: { item: FeedbackItem }) {
  const content = (
    <span className="grid min-w-0 flex-1 gap-1.5">
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="truncate font-medium">{item.componentName}</span>
        <span className="bg-muted text-foreground shrink-0 rounded-md px-2 py-0.5 text-xs font-medium">
          {categoryLabel(item.category)}
        </span>
      </span>
      <span className="text-sm break-words">{excerpt(item.body)}</span>
      <span className="text-muted-foreground flex flex-wrap gap-x-2 text-sm">
        {item.authorName && <span>{item.authorName}</span>}
        {item.lineNumber !== null && <span>Line {item.lineNumber}</span>}
        <RelativeTime iso={item.createdAt} />
      </span>
    </span>
  );
  return (
    <li>
      {HAS_PUBLIC_PAGE ? (
        <Link to={commentPath(item.slug, item.id)} className={cn(rowLinkClass, "items-start")}>
          {content}
          <ChevronRight aria-hidden="true" className="text-muted-foreground mt-1 size-4 shrink-0" />
        </Link>
      ) : (
        <div className={cn("flex gap-3 px-4 py-3", ROW_MIN_HEIGHT)}>{content}</div>
      )}
    </li>
  );
}

export function FeedbackInbox({ items, className }: { items: Section<FeedbackItem[]>; className?: string }) {
  return (
    <Block id="feedback" title="Feedback waiting for you" className={className}>
      {!items.ok ? (
        <BlockError message="We couldn't load your feedback." />
      ) : items.data.length === 0 ? (
        <EmptyState
          compact
          headingAs="h3"
          icon={MessageSquare}
          title="No feedback yet"
          description="Feedback from other people will show up here."
        />
      ) : (
        <RowCard>
          <ul className="divide-y">
            {items.data.map((f) => (
              <FeedbackRow key={f.id} item={f} />
            ))}
          </ul>
        </RowCard>
      )}
    </Block>
  );
}

export const FeedbackSkeleton = () => (
  <Block id="feedback-loading" title="Feedback waiting for you">
    <RowsSkeleton rows={2} />
  </Block>
);
