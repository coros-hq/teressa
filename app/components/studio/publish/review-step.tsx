import { CHECK_ORDER, CHECK_TITLES } from "~/lib/publish/checks/types.ts";
import type { Dependencies } from "~/lib/publish/dependencies.ts";
import { LICENSE, type Details } from "~/lib/publish/details.ts";

import { statusOf } from "./checks-step";
import type { PublishChecks } from "./use-publish-checks";

const RESULT: Record<string, string> = {
  passed: "Passed",
  failed: "Needs fixing",
  crashed: "Couldn't run",
  running: "Still running",
  pending: "Not run",
};

export function ReviewStep({
  details,
  dependencies,
  checks,
  isUpdate,
  previews,
}: {
  details: Details;
  dependencies: Dependencies;
  checks: PublishChecks;
  isUpdate: boolean;
  previews: { lightUrl: string; darkUrl: string } | null;
}) {
  const warnings = CHECK_ORDER.reduce((n, id) => {
    const c = checks.state.checks[id];
    return n + (c.status === "done" ? c.result.findings.filter((f) => f.severity === "warning").length : 0);
  }, 0);

  return (
    <div className="grid gap-4">
      {previews && (
        <div className="grid gap-2">
          <h3 className="text-sm font-semibold">Preview in the gallery</h3>
          <div className="grid grid-cols-2 gap-2">
            <img src={previews.lightUrl} alt="How your component looks in light mode" className="aspect-[8/5] w-full rounded-lg border object-cover" />
            <img src={previews.darkUrl} alt="How your component looks in dark mode" className="aspect-[8/5] w-full rounded-lg border object-cover" />
          </div>
        </div>
      )}

      <dl className="grid gap-3 rounded-lg border p-3 text-sm">
        <Row label="Title">{details.title}</Row>
        <Row label="Description">{details.description}</Row>
        <Row label="Category">{details.category}</Row>
        <Row label="Tags">{details.tags.length ? details.tags.join(", ") : "None"}</Row>
        <Row label="Packages it needs">{dependencies.dependencies.join(", ") || "None"}</Row>
        <Row label="Components it uses">{dependencies.registryDependencies.join(", ") || "None"}</Row>
        <Row label="License">{LICENSE}</Row>
      </dl>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Checks</h3>
        <ul className="grid gap-1 text-sm">
          {CHECK_ORDER.map((id) => (
            <li key={id} className="flex justify-between gap-4">
              <span>{CHECK_TITLES[id]}</span>
              <span className="text-muted-foreground">{RESULT[statusOf(checks.state.checks[id])]}</span>
            </li>
          ))}
        </ul>
        {warnings > 0 && (
          <p className="text-muted-foreground mt-2 text-sm">
            {warnings} {warnings === 1 ? "warning" : "warnings"} won&apos;t stop you from publishing.
          </p>
        )}
      </div>

      {!checks.canPublish && (
        <p role="alert" className="text-sm font-medium">
          {checks.stale
            ? "Your code changed since the checks ran. Go back and run them again."
            : "All four checks need to pass before you can publish."}
        </p>
      )}

      <p className="text-sm">
        This version will be public and can&apos;t be edited after publishing. You can publish updates as new versions.
        {isUpdate && " This will be a new version of a component you've already published."}
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
