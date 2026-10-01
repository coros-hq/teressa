import type { RequestItem, Section } from "~/lib/data/overview";
import { HAS_PUBLIC_PAGE, publicPagePath } from "~/lib/paths";
import { cn } from "~/lib/utils";
import { Link } from "react-router";

import { Block, ROW_MIN_HEIGHT, RowCard, rowLinkClass } from "./block";

const count = (n: number) => `${n.toLocaleString("en")} ${n === 1 ? "comment" : "comments"}`;

function RequestBody({ item }: { item: RequestItem }) {
  return (
    <span className="grid min-w-0 flex-1 gap-0.5">
      <span className="truncate font-medium">{item.name}</span>
      <span className="text-muted-foreground flex flex-wrap gap-x-3 text-sm">
        {item.authorName && <span className="truncate">By {item.authorName}</span>}
        <span>{count(item.commentCount)}</span>
        {!HAS_PUBLIC_PAGE && <span>Coming soon</span>}
      </span>
    </span>
  );
}

// Links to the public page once there is one; until then the rows are plain text.
export function RequestRow({ item }: { item: RequestItem }) {
  return (
    <li>
      {HAS_PUBLIC_PAGE ? (
        <Link to={publicPagePath(item.slug)} className={rowLinkClass}>
          <RequestBody item={item} />
        </Link>
      ) : (
        <div className={cn("flex items-center gap-3 px-4 py-3", ROW_MIN_HEIGHT)}>
          <RequestBody item={item} />
        </div>
      )}
    </li>
  );
}

// A nudge to give feedback. With nothing to show (or if it can't load) the block simply isn't there.
export function FeedbackRequests({ items, className }: { items: Section<RequestItem[]>; className?: string }) {
  if (!items.ok || items.data.length === 0) return null;
  return (
    <Block id="requests" title="Looking for feedback" className={className}>
      <RowCard>
        <ul className="divide-y">
          {items.data.map((r) => (
            <RequestRow key={r.id} item={r} />
          ))}
        </ul>
      </RowCard>
    </Block>
  );
}
