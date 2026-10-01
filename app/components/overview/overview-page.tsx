import { Plus } from "lucide-react";
import { Link } from "react-router";

import { PageHeader } from "~/components/dashboard/page-header";
import { Button } from "~/components/ui/button";
import { blockOrder, type OverviewResult } from "~/lib/data/overview";
import { NEW_COMPONENT_PATH } from "~/lib/paths";

import { FeedbackInbox, FeedbackSkeleton } from "./feedback-inbox";
import { FeedbackRequests } from "./feedback-requests";
import { GettingStartedChecklist } from "./getting-started";
import { DraftsSkeleton, RecentDrafts } from "./recent-drafts";
import { PublishedList, PublishedSkeleton } from "./published-list";
import { StatsRow, StatsSkeleton } from "./stats-row";

export function OverviewHeader({ firstName }: { firstName: string | null }) {
  return (
    <PageHeader
      title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
      description="Here's where your components stand."
      actions={
        <Button asChild className="min-h-11">
          <Link to={NEW_COMPONENT_PATH}>
            <Plus aria-hidden="true" />
            New component
          </Link>
        </Button>
      }
    />
  );
}

// Below the wide layout everything is one column, and the order follows what needs attention:
// feedback first when there is some to read. The wide layout is two columns, in a fixed order.
const ORDER_CLASS = ["max-xl:order-1", "max-xl:order-2", "max-xl:order-3", "max-xl:order-4"];

export function OverviewBody({ result }: { result: OverviewResult }) {
  const openFeedback = result.stats.ok ? result.stats.data.openFeedback : 0;
  const order = blockOrder(openFeedback);
  const cls = (b: (typeof order)[number]) => ORDER_CLASS[order.indexOf(b)];

  return (
    <>
      <GettingStartedChecklist checklist={result.checklist} drafts={result.recentDrafts} />
      <StatsRow stats={result.stats} />
      <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:items-start xl:gap-8">
        <div className="flex flex-col gap-6 max-xl:contents">
          <RecentDrafts drafts={result.recentDrafts} className={cls("drafts")} />
          <PublishedList items={result.published} className={cls("published")} />
        </div>
        <div className="flex flex-col gap-6 max-xl:contents">
          <FeedbackInbox items={result.openFeedback} className={cls("feedback")} />
          <FeedbackRequests items={result.feedbackRequests} className={cls("requests")} />
        </div>
      </div>
    </>
  );
}

// Same frames as the real blocks, so nothing moves when the data arrives.
export function OverviewSkeleton() {
  return (
    <div role="status" aria-label="Loading your overview" className="flex flex-col gap-6">
      <StatsSkeleton />
      <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:items-start xl:gap-8">
        <div className="flex flex-col gap-6">
          <DraftsSkeleton />
          <PublishedSkeleton />
        </div>
        <div className="flex flex-col gap-6">
          <FeedbackSkeleton />
        </div>
      </div>
    </div>
  );
}
