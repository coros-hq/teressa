import { Card } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import type { Section, Stats } from "~/lib/data/overview";
import { cn } from "~/lib/utils";

import { BlockError } from "./block";

export function StatCard({ label, value }: { label: string; value: number }) {
  return (
    // The label comes first in the page's order (so it is read first), and the number is shown above it.
    <Card className="flex-col-reverse justify-end gap-1 px-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-3xl font-semibold tracking-tight tabular-nums">{value.toLocaleString("en")}</dd>
    </Card>
  );
}

const columns = (n: number) => (n === 3 ? "xl:grid-cols-3" : "xl:grid-cols-4");

export function StatsRow({ stats }: { stats: Section<Stats> }) {
  if (!stats.ok) return <BlockError message="We couldn't load your numbers." />;
  const s = stats.data;
  // Copies only appears when the database has a copy counter.
  const cards = [
    { label: "Drafts", value: s.drafts },
    { label: "Published", value: s.published },
    { label: "Open feedback", value: s.openFeedback },
    ...(s.copies === null ? [] : [{ label: "Copies", value: s.copies }]),
  ];
  return (
    <section aria-label="Your numbers">
      <dl className={cn("grid grid-cols-2 gap-3", columns(cards.length))}>
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </dl>
    </section>
  );
}

export function StatsSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Card key={i} className="gap-1 px-4">
          <Skeleton className="h-9 w-12" />
          <Skeleton className="h-4 w-20" />
        </Card>
      ))}
    </div>
  );
}
