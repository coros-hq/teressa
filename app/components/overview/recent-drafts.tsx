import { ChevronRight, Component as ComponentIcon, FolderPen } from "lucide-react";
import { Link } from "react-router";

import { EmptyState } from "~/components/dashboard/empty-state";
import type { DraftItem, Section } from "~/lib/data/overview";
import { MY_COMPONENTS_PATH, NEW_COMPONENT_PATH } from "~/lib/paths";

import { Block, BlockError, BlockLink, RowCard, RowsSkeleton, rowLinkClass } from "./block";
import { RelativeTime } from "./relative-time";

// No preview image is saved with a draft yet, so every row shows the same placeholder. Live
// previews are deliberately not drawn here.
function Thumbnail() {
  return (
    <span aria-hidden="true" className="bg-muted text-muted-foreground grid size-12 shrink-0 place-items-center rounded-lg">
      <ComponentIcon className="size-5" />
    </span>
  );
}

export function DraftRow({ draft }: { draft: DraftItem }) {
  return (
    <li>
      <Link to={`/studio/${draft.id}`} className={rowLinkClass}>
        <Thumbnail />
        <span className="grid min-w-0 flex-1">
          <span className="truncate font-medium">{draft.name}</span>
          <span className="text-muted-foreground truncate text-sm">
            <RelativeTime iso={draft.updatedAt} prefix="Edited " />
          </span>
        </span>
        <ChevronRight aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
      </Link>
    </li>
  );
}

export function RecentDrafts({ drafts, className }: { drafts: Section<DraftItem[]>; className?: string }) {
  return (
    <Block
      id="drafts"
      title="Continue where you left off"
      className={className}
      action={drafts.ok && drafts.data.length > 0 ? <BlockLink to={MY_COMPONENTS_PATH}>View all</BlockLink> : undefined}
    >
      {!drafts.ok ? (
        <BlockError message="We couldn't load your drafts." />
      ) : drafts.data.length === 0 ? (
        <EmptyState
          compact
          headingAs="h3"
          icon={FolderPen}
          title="Start your first component"
          description="Design it on the canvas, then publish it when it's ready."
          actionLabel="New component"
          actionHref={NEW_COMPONENT_PATH}
        />
      ) : (
        <RowCard>
          <ul className="divide-y">
            {drafts.data.map((d) => (
              <DraftRow key={d.id} draft={d} />
            ))}
          </ul>
        </RowCard>
      )}
    </Block>
  );
}

export const DraftsSkeleton = () => (
  <Block id="drafts-loading" title="Continue where you left off">
    <RowsSkeleton rows={3} />
  </Block>
);
