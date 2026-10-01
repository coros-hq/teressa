import { Check, Copy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";
import { highlightLines } from "~/lib/highlight-code";
import { trackCopy } from "~/lib/copy-tracking";

type State = { status: "idle" | "loading" | "failed" } | { status: "ready"; code: string };

// "View code" on a gallery card. The code isn't part of the gallery list (it stays small), so it is
// fetched from the component's registry file the first time the dialog opens.
export function ViewCodeDialog({ slug, name }: { slug: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ status: "idle" });
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!open || started.current || state.status === "ready") return;
    started.current = true;
    const controller = new AbortController();
    setState({ status: "loading" });
    fetch(`/r/${slug}.json`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad status"))))
      .then((json) => {
        const code = json?.files?.[0]?.content;
        setState(typeof code === "string" ? { status: "ready", code } : { status: "failed" });
      })
      .catch((e) => {
        started.current = false; // closing and reopening tries again
        if (e?.name !== "AbortError") setState({ status: "failed" });
      });
    return () => {
      controller.abort();
      started.current = false;
    };
  }, [open, slug]);

  const lines = useMemo(() => (state.status === "ready" ? highlightLines(state.code.replace(/\n$/, "")) : []), [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-foreground focus-visible:ring-ring/50 inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3"
        >
          View code
          <span className="sr-only"> of {name}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>The component&apos;s code, ready to paste into your project.</DialogDescription>
        </DialogHeader>

        <div className="bg-muted/40 min-h-0 flex-1 overflow-auto rounded-lg border" role="region" aria-label={`Code of ${name}`} tabIndex={0}>
          {state.status === "ready" ? (
            <ol className="min-w-max py-3 font-mono text-[13px] leading-6">
              {lines.map((line, i) => (
                <li key={i} className="grid grid-cols-[3rem_1fr] pr-4">
                  <span aria-hidden className="text-muted-foreground pr-3 text-right select-none">
                    {i + 1}
                  </span>
                  <code className="whitespace-pre">
                    {line.length ? line.map((tok, j) => <span key={j} className={tok.className}>{tok.text}</span>) : " "}
                  </code>
                </li>
              ))}
            </ol>
          ) : state.status === "failed" ? (
            <p role="alert" className="text-muted-foreground p-4 text-sm">
              The code couldn&apos;t be loaded. Close this and try again.
            </p>
          ) : (
            <div className="grid gap-2 p-4" aria-busy="true">
              {[70, 55, 85, 40, 65].map((w) => (
                <Skeleton key={w} className="h-4" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={state.status !== "ready"}
            onClick={async () => {
              if (state.status !== "ready") return;
              try {
                await navigator.clipboard.writeText(state.code);
                setCopied(true);
                trackCopy(slug);
                setTimeout(() => setCopied(false), 2000);
              } catch {}
            }}
          >
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied ? "Copied" : "Copy code"}
          </Button>
          <span role="status" className="sr-only">
            {copied ? `Code of ${name} copied` : ""}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
