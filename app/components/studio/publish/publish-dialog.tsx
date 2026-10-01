import { LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import type { AuditFn } from "~/lib/publish/checks/axe-runner.ts";
import { CHECK_ORDER } from "~/lib/publish/checks/types.ts";
import { summarize } from "~/lib/publish/checks/state.ts";
import { classifyImports } from "~/lib/publish/dependencies.ts";
import { DETAIL_FIELDS, normalizeTags, validateDetails, type Details, type DetailsErrors } from "~/lib/publish/details.ts";

import { PreviewFrame, type PreviewApi } from "../preview-frame";
import { ChecksStep, statusOf, type PreviewProgress } from "./checks-step";
import { DetailsStep, fieldId } from "./details-step";
import { PublishedDialog, type PublishedInfo } from "./published-dialog";
import { ReviewStep } from "./review-step";
import type { PublishChecks } from "./use-publish-checks";

type Step = "details" | "checks" | "review";
const STEPS: { id: Step; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "checks", label: "Checks" },
  { id: "review", label: "Review and publish" },
];

export type PublishTarget = { id: string; name: string; code: string };

export function PublishDialog({
  open,
  onOpenChange,
  componentId,
  target,
  problem,
  prep,
  onRetrySave,
  details,
  onDetailsChange,
  checks,
  onGoToLine,
  isUpdate,
  onPublished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  componentId: string;
  /** The component being published, or null when it isn't clear which one. */
  target: PublishTarget | null;
  /** Why there's no target, in plain words. */
  problem: string | null;
  /** Publishing always uses the saved draft, so the page saves first. */
  prep: "saving" | "ready" | "failed";
  onRetrySave: () => void;
  details: Details;
  onDetailsChange: (next: Details) => void;
  checks: PublishChecks;
  onGoToLine: (line: number) => void;
  isUpdate: boolean;
  onPublished: () => void;
}) {
  const [step, setStep] = useState<Step>("details");
  const [errors, setErrors] = useState<DetailsErrors>({});
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [published, setPublished] = useState<PublishedInfo | null>(null);
  const headingRef = useRef<HTMLSpanElement>(null);
  const apiRef = useRef<PreviewApi | null>(null);
  // One key per publish attempt. A retry after a dropped connection reuses it, so the database
  // recognises the request and never makes a second version.
  const keyRef = useRef<string>("");
  const newKey = () => (keyRef.current = crypto.randomUUID());
  useEffect(() => void (keyRef.current ||= crypto.randomUUID()), []);

  // The preview pictures for the code that passed the checks: made in the hidden preview, kept here,
  // uploaded when publishing. They belong to one exact version of the code (its hash).
  type Previews = { hash: string; light: Blob; dark: Blob; lightUrl: string; darkUrl: string };
  const [previews, setPreviews] = useState<Previews | null>(null);
  const [previewState, setPreviewState] = useState<"idle" | "making" | "failed">("idle");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const uploaded = useRef<{ hash: string; previewLight: string; previewDark: string } | null>(null);
  const previewsReady = !!previews && previews.hash === checks.hash;
  useEffect(() => () => {
    if (previews) {
      URL.revokeObjectURL(previews.lightUrl);
      URL.revokeObjectURL(previews.darkUrl);
    }
  }, [previews]);

  async function makePreviews() {
    if (!target || !checks.hash) return;
    const hash = checks.hash;
    setPreviewState("making");
    setPreviewError(null);
    for (let i = 0; i < 100 && !apiRef.current; i++) await new Promise((r) => setTimeout(r, 100));
    const api = apiRef.current;
    const light = api ? await api.capture(target.code, "light") : null;
    const dark = light?.ok && api ? await api.capture(target.code, "dark") : null;
    if (!light || !light.ok || !dark || !dark.ok) {
      setPreviewState("failed");
      setPreviewError(
        light && !light.ok ? light.message : dark && !dark.ok ? dark.message : "The preview isn't ready yet. Try again in a moment.",
      );
      return;
    }
    uploaded.current = null;
    setPreviews({ hash, light: light.blob, dark: dark.blob, lightUrl: URL.createObjectURL(light.blob), darkUrl: URL.createObjectURL(dark.blob) });
    setPreviewState("idle");
  }

  // Once every check has passed, the pictures are made (and made again if the code changed).
  useEffect(() => {
    if (open && step === "checks" && prep === "ready" && target && checks.canPublish && !previewsReady && previewState === "idle") {
      void makePreviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, prep, target?.code, checks.canPublish, previewsReady, previewState]);

  const previewProgress: PreviewProgress = {
    state: previewsReady ? "ready" : previewState === "making" ? "making" : previewState === "failed" ? "failed" : checks.canPublish ? "making" : "waiting",
    error: previewError,
    onRetry: () => setPreviewState("idle"),
  };

  const dependencies = useMemo(() => classifyImports(target?.code ?? ""), [target?.code]);

  // Start from the first step each time it opens.
  useEffect(() => {
    if (open) {
      setStep("details");
      setErrors({});
      setPublishError(null);
      setConfirmClose(false);
    }
  }, [open]);

  // Move focus to the step heading when the step changes, so screen readers start there.
  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [step, open]);

  // The scans run in a hidden preview; wait for it to exist (it starts when this step opens).
  const audit: AuditFn = async (code, theme) => {
    for (let i = 0; i < 100 && !apiRef.current; i++) await new Promise((r) => setTimeout(r, 100));
    return apiRef.current ? apiRef.current.audit(code, theme) : null;
  };
  const runChecks = () => {
    newKey();
    void checks.run(audit);
  };

  // Checks start by themselves when the step opens, and again if the code changed since.
  useEffect(() => {
    if (open && step === "checks" && prep === "ready" && target && checks.needsRun && !checks.running) runChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, prep, target?.code, checks.needsRun, checks.running]);

  // Announce check results to screen readers as they land.
  const announcement = useMemo(
    () =>
      CHECK_ORDER.filter((id) => checks.state.checks[id].status === "done")
        .map((id) => `${id}: ${statusOf(checks.state.checks[id])}`)
        .concat(previewsReady ? ["preview image: ready"] : [])
        .join(". "),
    [checks.state, previewsReady],
  );

  const goNext = () => {
    if (step === "details") {
      const found = validateDetails(details);
      setErrors(found);
      const first = DETAIL_FIELDS.find((f) => found[f]);
      if (first) {
        (document.getElementById(`${fieldId(first)}-custom`) ?? document.getElementById(fieldId(first)))?.focus();
        return;
      }
      onDetailsChange({ ...details, tags: normalizeTags(details.tags) });
      setStep("checks");
    } else if (step === "checks") setStep("review");
  };

  const goBack = () => {
    newKey();
    setPublishError(null);
    setStep(step === "review" ? "checks" : "details");
  };

  const requestClose = (next: boolean) => {
    if (!next && publishing) return setConfirmClose(true); // don't drop a publish by accident
    onOpenChange(next);
  };

  const publish = async () => {
    if (!target || !checks.canPublish || !previews || previews.hash !== checks.hash) return;
    setPublishing(true);
    setPublishError(null);
    try {
      // The pictures are stored first (once per version of the code, so a retry doesn't store them again).
      let stored = uploaded.current?.hash === previews.hash ? uploaded.current : null;
      if (!stored) {
        const form = new FormData();
        form.append("light", previews.light, "light");
        form.append("dark", previews.dark, "dark");
        const up = await fetch(`/api/publish/${componentId}/previews`, { method: "POST", body: form });
        const upBody = await up.json().catch(() => null);
        if (!up.ok || !upBody?.ok) {
          setPublishError(upBody?.message ?? "We couldn't save the preview. Nothing was published. Try again.");
          return;
        }
        stored = uploaded.current = { hash: previews.hash, previewLight: upBody.previewLight, previewDark: upBody.previewDark };
      }
      const res = await fetch(`/api/publish/${componentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectId: target.id,
          details,
          checkResults: summarize(checks.state),
          idempotencyKey: keyRef.current,
          previewLight: stored.previewLight,
          previewDark: stored.previewDark,
        }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.ok) {
        setPublished(body);
        onPublished();
        newKey();
        setConfirmClose(false);
        onOpenChange(false);
      } else {
        setPublishError(body?.message ?? "Something went wrong and nothing was published. Try again.");
        if (body?.fieldErrors) {
          setErrors(body.fieldErrors);
          setStep("details");
        }
      }
    } catch {
      // The connection dropped: we can't tell whether it arrived. Retrying is safe, because the
      // same key means the database will return the earlier result instead of making a duplicate.
      setPublishError("We couldn't reach the server. If it did go through, trying again won't publish it twice.");
    } finally {
      setPublishing(false);
    }
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const blocked = prep !== "ready" || !target;
  const nextDisabled = blocked || (step === "checks" && (checks.running || checks.needsRun || (checks.canPublish && !previewsReady)));

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent
          className="max-h-[90svh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-xl"
          onEscapeKeyDown={(e) => {
            if (publishing) {
              e.preventDefault();
              setConfirmClose(true);
            }
          }}
          onInteractOutside={(e) => publishing && e.preventDefault()}
        >
          <DialogHeader>
            <p className="text-muted-foreground text-sm">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
            <DialogTitle>
              <span ref={headingRef} tabIndex={-1} className="outline-none focus-visible:underline">
                {isUpdate && step === "details" ? "Publish a new version" : STEPS[stepIndex].label}
              </span>
            </DialogTitle>
            <DialogDescription>
              {step === "details" && "Tell people what this component is. You can change these later."}
              {step === "checks" && "We'll check your code before it goes public."}
              {step === "review" && "Take a last look, then publish."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid content-start gap-4 overflow-y-auto px-1 py-1 -mx-1">
          {prep === "saving" && (
            <p role="status" className="flex items-center gap-2 text-sm">
              <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
              Saving your latest changes…
            </p>
          )}
          {prep === "failed" && (
            <div role="alert" className="grid justify-items-start gap-2 text-sm">
              <p>We couldn&apos;t save your latest changes, and publishing uses the saved copy. Try again.</p>
              <Button variant="outline" onClick={onRetrySave}>
                Try saving again
              </Button>
            </div>
          )}
          {prep === "ready" && !target && <p className="text-sm">{problem}</p>}

          {!blocked && step === "details" && (
            <DetailsStep
              value={details}
              onChange={(next) => {
                newKey();
                // An error goes away as soon as the field it was about is changed.
                setErrors((e) => {
                  const out = { ...e };
                  for (const f of DETAIL_FIELDS) if (JSON.stringify(next[f]) !== JSON.stringify(details[f])) delete out[f];
                  return out;
                });
                onDetailsChange(next);
              }}
              errors={errors}
              dependencies={dependencies}
            />
          )}
          {!blocked && step === "checks" && (
            <ChecksStep
              checks={checks}
              onRunAgain={runChecks}
              preview={previewProgress}
              onGoToLine={(line) => {
                onOpenChange(false);
                onGoToLine(line);
              }}
            />
          )}
          {!blocked && step === "review" && (
            <ReviewStep details={details} dependencies={dependencies} checks={checks} isUpdate={isUpdate} previews={previewsReady ? previews : null} />
          )}

          {publishError && (
            <p role="alert" className="text-sm font-medium">
              {publishError}
            </p>
          )}
          {confirmClose && (
            <div role="alertdialog" aria-label="Close while publishing?" className="grid gap-2 rounded-lg border p-3 text-sm">
              <p>Publishing is in progress. If you close this, it will still finish in the background.</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setConfirmClose(false)}>
                  Keep this open
                </Button>
                <Button size="sm" onClick={() => onOpenChange(false)}>
                  Close anyway
                </Button>
              </div>
            </div>
          )}

            <p role="status" aria-live="polite" className="sr-only">
              {announcement}
            </p>
          </div>

          <DialogFooter>
            {step === "details" ? (
              <Button variant="outline" onClick={() => requestClose(false)}>
                Cancel
              </Button>
            ) : (
              <Button variant="outline" onClick={goBack} disabled={publishing}>
                Back
              </Button>
            )}
            {step !== "review" ? (
              <Button onClick={goNext} disabled={nextDisabled}>
                {step === "details" ? "Next: run checks" : checks.running ? "Checking…" : checks.canPublish && !previewsReady ? "Creating preview…" : "Next: review"}
              </Button>
            ) : (
              <Button onClick={publish} disabled={publishing || blocked || !checks.canPublish || !previewsReady}>
                {publishing && <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />}
                {publishing ? "Publishing…" : isUpdate ? "Publish new version" : "Publish"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* The scans draw the component in a separate preview that nobody sees, so the canvas isn't
          disturbed. It's invisible rather than hidden or moved off-screen: contrast can only be
          measured on laid-out content, and browsers slow down frames that are off-screen. */}
      {open && step === "checks" && (
        <div aria-hidden="true" inert className="pointer-events-none fixed top-0 left-0 -z-10 h-[600px] w-[800px] overflow-hidden opacity-0">
          <PreviewFrame idle code="" theme="light" onStatus={() => {}} apiRef={apiRef} className="size-full border-0" />
        </div>
      )}

      <PublishedDialog info={published} onClose={() => setPublished(null)} />
    </>
  );
}
