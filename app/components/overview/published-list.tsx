import { ChevronRight, Rocket } from "lucide-react";
import { Link } from "react-router";

import { EmptyState } from "~/components/dashboard/empty-state";
import type { PublishedItem, Section } from "~/lib/data/overview";
import { HAS_PUBLIC_PAGE, publicPagePath } from "~/lib/paths";

import { Block, BlockError, RowCard, RowsSkeleton, rowLinkClass } from "./block";

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en")} ${n === 1 ? one : many}`;

export function PublishedRow({ item }: { item: PublishedItem }) {
  // Goes to the public page once there is one; until then it opens the component in the studio.
  const to = HAS_PUBLIC_PAGE ? publicPagePath(item.slug) : `/studio/${item.id}`;
  return (
    <li>
      <Link to={to} className={rowLinkClass}>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="truncate font-medium">{item.name}</span>
            <span className="text-muted-foreground shrink-0 text-sm">v{item.version}</span>
          </span>
          <span className="text-muted-foreground flex flex-wrap gap-x-3 text-sm">
            <span>{plural(item.openFeedback, "open comment", "open comments")}</span>
            {item.copies !== null && <span>{plural(item.copies, "copy", "copies")}</span>}
            {!HAS_PUBLIC_PAGE && <span>Public page coming soon</span>}
          </span>
        </span>
        <ChevronRight aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
      </Link>
    </li>
  );
}

export function PublishedList({ items, className }: { items: Section<PublishedItem[]>; className?: string }) {
  return (
    <Block id="published" title="Your published components" className={className}>
      {!items.ok ? (
        <BlockError message="We couldn't load your published components." />
      ) : items.data.length === 0 ? (
        <EmptyState
          compact
          headingAs="h3"
          icon={Rocket}
          title="Nothing published yet"
          description="Publish your first component to start getting feedback."
        />
      ) : (
        <RowCard>
          <ul className="divide-y">
            {items.data.map((p) => (
              <PublishedRow key={p.id} item={p} />
            ))}
          </ul>
        </RowCard>
      )}
    </Block>
  );
}

export const PublishedSkeleton = () => (
  <Block id="published-loading" title="Your published components">
    <RowsSkeleton rows={3} />
  </Block>
);
