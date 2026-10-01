import { Check, Circle } from "lucide-react";
import { Link } from "react-router";

import { Card } from "~/components/ui/card";
import { deriveChecklist, type Checklist, type DraftItem, type Section } from "~/lib/data/overview";
import { HAS_PUBLIC_PAGE, MY_COMPONENTS_PATH, NEW_COMPONENT_PATH } from "~/lib/paths";
import { cn } from "~/lib/utils";

// Shown to people who haven't done everything yet. What's done is read from their real data, so
// there is nothing to dismiss: it goes away by itself when the last available step is done.
export function GettingStartedChecklist({
  checklist,
  drafts,
}: {
  checklist: Section<Checklist>;
  drafts: Section<DraftItem[]>;
}) {
  if (!checklist.ok) return null; // not essential, so it doesn't add an error to the page
  const { steps, visible } = deriveChecklist(checklist.data, {
    newComponentHref: NEW_COMPONENT_PATH,
    continueHref: drafts.ok && drafts.data[0] ? `/studio/${drafts.data[0].id}` : null,
    myComponentsHref: MY_COMPONENTS_PATH,
    feedbackStepAvailable: HAS_PUBLIC_PAGE,
    feedbackHref: "/explore",
  });
  if (!visible) return null;

  return (
    <section aria-labelledby="getting-started-title">
      <Card className="gap-3 px-4">
        <h2 id="getting-started-title" className="text-lg font-semibold tracking-tight">
          Getting started
        </h2>
        <ol className="grid gap-1">
          {steps.map((step) => {
            const open = step.available && !step.done;
            const content = (
              <>
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full border",
                    step.done ? "bg-primary text-primary-foreground border-transparent" : "text-muted-foreground",
                  )}
                >
                  {step.done ? <Check className="size-3.5" /> : <Circle className="size-2 fill-current" />}
                </span>
                <span className={cn("min-w-0 flex-1", !open && "text-muted-foreground")}>
                  {step.label}
                  <span className="sr-only">{step.done ? " (done)" : step.available ? "" : " (coming soon)"}</span>
                </span>
                {!step.available && (
                  <span className="text-muted-foreground shrink-0 text-sm" aria-hidden="true">
                    Coming soon
                  </span>
                )}
              </>
            );
            const rowClass = "flex min-h-11 items-center gap-3 rounded-lg px-2 py-1.5 text-sm";
            return (
              <li key={step.id}>
                {open && step.href ? (
                  <Link
                    to={step.href}
                    className={cn(rowClass, "hover:bg-muted focus-visible:ring-ring/50 font-medium outline-none focus-visible:ring-3")}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className={rowClass}>{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      </Card>
    </section>
  );
}
