import { CircleAlert, CircleCheck, CircleDashed, CircleX, LoaderCircle, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { CheckState } from "~/lib/publish/checks/state.ts";
import { CHECK_ORDER, CHECK_TITLES, type CheckId, type Finding } from "~/lib/publish/checks/types.ts";

import type { PublishChecks } from "./use-publish-checks";

const LABEL: Record<string, string> = {
  pending: "Waiting",
  running: "Running",
  passed: "Passed",
  failed: "Needs fixing",
  crashed: "Couldn't run",
};

export const statusOf = (c: CheckState) => (c.status === "done" ? c.result.status : c.status);

function StatusIcon({ status }: { status: string }) {
  const cls = "size-5 shrink-0";
  if (status === "running") return <LoaderCircle aria-hidden className={cn(cls, "animate-spin motion-reduce:animate-none")} />;
  if (status === "passed") return <CircleCheck aria-hidden className={cls} />;
  if (status === "failed") return <CircleX aria-hidden className={cn(cls, "text-destructive")} />;
  if (status === "crashed") return <CircleAlert aria-hidden className={cn(cls, "text-destructive")} />;
  return <CircleDashed aria-hidden className={cn(cls, "text-muted-foreground")} />;
}

function FindingItem({ f, onGoToLine }: { f: Finding; onGoToLine: (line: number) => void }) {
  return (
    <li className="grid gap-1 rounded-md border p-2.5 text-sm">
      <p>
        <span className="font-semibold">{f.severity === "error" ? "Problem: " : "Warning: "}</span>
        {f.message}
      </p>
      {f.snippets?.[0] && (
        <code className="bg-muted text-foreground block overflow-x-auto rounded px-2 py-1 font-mono text-xs whitespace-pre">
          {f.snippets[0]}
        </code>
      )}
      {f.line !== undefined && (
        <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => onGoToLine(f.line!)}>
          Go to line {f.line}
        </Button>
      )}
    </li>
  );
}

function CheckRow({ id, state, onGoToLine }: { id: CheckId; state: CheckState; onGoToLine: (line: number) => void }) {
  const status = statusOf(state);
  const result = state.status === "done" ? state.result : null;
  const findings = result?.findings ?? [];
  const hasDetails = findings.length > 0 || !!result?.error;
  // Failures open by themselves: that's what needs reading.
  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = toggled ?? (status === "failed" || status === "crashed");
  const warnings = findings.filter((f) => f.severity === "warning").length;

  return (
    <li className="rounded-xl border">
      <div className="flex items-center gap-3 p-3">
        <StatusIcon status={status} />
        <div className="grid min-w-0 flex-1">
          <span className="font-medium">{CHECK_TITLES[id]}</span>
          <span className="text-muted-foreground text-sm">
            {LABEL[status]}
            {status === "passed" && warnings > 0 && ` with ${warnings} ${warnings === 1 ? "warning" : "warnings"}`}
          </span>
        </div>
        {hasDetails && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={open}
            aria-controls={`check-${id}-details`}
            onClick={() => setToggled(!open)}
          >
            {open ? "Hide details" : "Show details"}
          </Button>
        )}
      </div>
      {hasDetails && open && (
        <div id={`check-${id}-details`} className="grid gap-2 border-t p-3">
          {result?.error && <p className="text-sm">Check couldn&apos;t run: {result.error} Try running it again.</p>}
          {findings.length > 0 && (
            <ul className="grid gap-2">
              {findings.map((f, i) => (
                <FindingItem key={i} f={f} onGoToLine={onGoToLine} />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

export type PreviewProgress = { state: "waiting" | "making" | "ready" | "failed"; error: string | null; onRetry: () => void };

// The picture people will see in the gallery. It is made once the four checks pass.
function PreviewRow({ preview }: { preview: PreviewProgress }) {
  const label = { waiting: "Waiting for the checks", making: "Creating", ready: "Ready", failed: "Couldn't create it" }[preview.state];
  const status = preview.state === "making" ? "running" : preview.state === "ready" ? "passed" : preview.state === "failed" ? "failed" : "pending";
  return (
    <li className="rounded-xl border">
      <div className="flex items-center gap-3 p-3">
        <StatusIcon status={status} />
        <div className="grid min-w-0 flex-1">
          <span className="font-medium">Preview image</span>
          <span className="text-muted-foreground text-sm">{label}</span>
        </div>
        {preview.state === "failed" && (
          <Button type="button" variant="outline" size="sm" onClick={preview.onRetry}>
            Try again
          </Button>
        )}
      </div>
      {preview.state === "failed" && preview.error && (
        <p role="alert" className="border-t p-3 text-sm">
          {preview.error}
        </p>
      )}
    </li>
  );
}

export function ChecksStep({
  checks,
  onGoToLine,
  onRunAgain,
  preview,
}: {
  checks: PublishChecks;
  onGoToLine: (line: number) => void;
  onRunAgain: () => void;
  preview?: PreviewProgress;
}) {
  const anyProblem = CHECK_ORDER.some((id) => {
    const s = statusOf(checks.state.checks[id]);
    return s === "failed" || s === "crashed";
  });

  return (
    <div className="grid gap-3">
      {checks.stale && (
        <p className="flex items-start gap-2 rounded-lg border p-3 text-sm" role="status">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          Your code changed since these checks ran, so they need to run again.
        </p>
      )}
      <ul className="grid gap-2" aria-label="Checks">
        {CHECK_ORDER.map((id) => (
          <CheckRow key={id} id={id} state={checks.state.checks[id]} onGoToLine={onGoToLine} />
        ))}
        {preview && <PreviewRow preview={preview} />}
      </ul>
      {(anyProblem || checks.stale) && !checks.running && (
        <Button type="button" variant="outline" className="justify-self-start" onClick={onRunAgain}>
          Run again
        </Button>
      )}
    </div>
  );
}
