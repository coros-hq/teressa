import { Link, useRevalidator } from "react-router";

import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

// A titled block on the Overview. The title is the block's h2, and the block is a labelled region.
export function Block({
  id,
  title,
  action,
  className,
  children,
}: {
  id: string;
  title: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className={cn("flex min-w-0 flex-col gap-3", className)}>
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** The inline link in a block's title row, with a tap target of at least 44px. */
export function BlockLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="text-foreground focus-visible:ring-ring/50 -mr-2 inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3"
    >
      {children}
    </Link>
  );
}

/** A card that holds a list of rows, with no padding of its own so rows can be full width. */
export function RowCard({ children }: { children: React.ReactNode }) {
  return <Card className="gap-0 py-0">{children}</Card>;
}

// Every row is at least this tall, in the real list and in its loading skeleton, so nothing jumps.
export const ROW_MIN_HEIGHT = "min-h-[4.5rem]";

export const rowLinkClass =
  "flex items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset " +
  ROW_MIN_HEIGHT;

/** Loading placeholder with the same size as `rows` real rows. */
export function RowsSkeleton({ rows }: { rows: number }) {
  return (
    <RowCard>
      <ul aria-hidden="true" className="divide-y">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className={cn("flex items-center gap-3 px-4 py-3", ROW_MIN_HEIGHT)}>
            <Skeleton className="size-12 shrink-0 rounded-lg" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </li>
        ))}
      </ul>
    </RowCard>
  );
}

/** A block that couldn't load. Only this block shows it; the rest of the page carries on. */
export function BlockError({ message = "We couldn't load this." }: { message?: string }) {
  const revalidator = useRevalidator();
  const busy = revalidator.state !== "idle";
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-4 text-sm">
      <p>{message}</p>
      <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => revalidator.revalidate()}>
        {busy ? "Trying…" : "Try again"}
      </Button>
    </div>
  );
}
