import { AlertTriangle, LoaderCircle } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";

import { offsetOfLine } from "~/lib/publish/lines.ts";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "~/components/ui/resizable";
import { cn } from "~/lib/utils";

import type { DesignObject } from "./design-model";
import { PreviewFrame, type PreviewStatus } from "./preview-frame";
import { PublishDialog } from "./publish/publish-dialog";
import { usePublishChecks } from "./publish/use-publish-checks";
import { StudioTopBar } from "./studio-top-bar";
import type { StudioComponent } from "./studio-page";
import { parseDesign } from "./design-model";
import { STARTER_CODE } from "./sample-component";

const CodeEditor = lazy(() => import("./code-editor"));

type Details = { description: string; category: string; tags: string[] };

// The code workspace: an editor on one side, the component drawn live on the other. It saves to the
// same place as the canvas studio, as a draft with a single component object that holds the code,
// so publishing, the checks and the preview image work exactly the same.
export function CodeStudioPage({ component }: { component: StudioComponent }) {
  const componentId = component.id;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // The one component object the draft holds. Anything else saved with it (a canvas draft opened
  // here by hand) is kept untouched.
  const initial = useMemo(() => {
    const all = parseDesign(component.design);
    const main = all.find((o) => o.kind === "component" && o.code !== undefined) ?? null;
    return { all, main };
  }, [component.design]);

  const [code, setCode] = useState(initial.main?.code ?? STARTER_CODE);
  const [title, setTitle] = useState(component.name);
  const [projectName, setProjectName] = useState(component.projectName);
  const [details, setDetails] = useState<Details>({ description: component.description, category: component.category, tags: component.tags });
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [status, setStatus] = useState<PreviewStatus>({ kind: "starting" });
  const [reveal, setReveal] = useState<{ pos: number; nonce: number } | null>(null);
  const [pane, setPane] = useState<"code" | "preview">("code");
  const [desktop, setDesktop] = useState(true);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishPrep, setPublishPrep] = useState<"saving" | "ready" | "failed">("ready");
  const [everPublished, setEverPublished] = useState(component.status === "published");

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // ---- saving ---------------------------------------------------------------------------------------
  const objectId = initial.main?.id ?? "main";
  const bodyOf = useCallback(
    (v: { code: string; title: string; projectName: string; details: Details }) => {
      const base: DesignObject = initial.main ?? { id: objectId, kind: "component", name: v.title, x: 0, y: 0, width: 480, height: 320 };
      const main: DesignObject = { ...base, name: v.title, code: v.code };
      const others = initial.all.filter((o) => o.id !== main.id);
      return JSON.stringify({ name: v.title, projectName: v.projectName, objects: [main, ...others], ...v.details });
    },
    [initial, objectId],
  );
  const body = useMemo(() => bodyOf({ code, title, projectName, details }), [bodyOf, code, title, projectName, details]);
  const latestBody = useRef(body);
  latestBody.current = body;
  const savedBody = useRef(body); // what the database has, as far as this page knows
  const saveUrl = `/api/components/${componentId}`;
  const fetcher = useFetcher<{ ok: boolean }>();
  const submitRef = useRef(fetcher.submit);
  submitRef.current = fetcher.submit;
  const fetcherState = useRef(fetcher.state);
  fetcherState.current = fetcher.state;

  const flush = useCallback(
    (keepalive: boolean) => {
      const b = latestBody.current;
      savedBody.current = b;
      if (keepalive) void fetch(saveUrl, { method: "POST", body: b, keepalive: true, headers: { "Content-Type": "application/json" } });
      else submitRef.current(b, { method: "POST", action: saveUrl, encType: "application/json" });
    },
    [saveUrl],
  );
  // Save a moment after the last keystroke.
  useEffect(() => {
    if (body === savedBody.current) return;
    const t = window.setTimeout(() => flush(false), 800);
    return () => window.clearTimeout(t);
  }, [body, flush]);
  // Don't lose the last edits when leaving or closing the tab.
  useEffect(() => {
    const onHide = () => latestBody.current !== savedBody.current && flush(true);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      onHide();
    };
  }, [flush]);
  // Publishing uses the saved draft, so it saves first and waits for the answer.
  const saveNow = useCallback(async (): Promise<boolean> => {
    for (let i = 0; i < 100 && fetcherState.current !== "idle"; i++) await new Promise((r) => setTimeout(r, 50));
    savedBody.current = latestBody.current;
    try {
      return (await fetch(saveUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: latestBody.current })).ok;
    } catch {
      return false;
    }
  }, [saveUrl]);
  const saveStatus: "saving" | "saved" | "error" =
    fetcher.state !== "idle" || body !== savedBody.current ? "saving" : fetcher.data && !fetcher.data.ok ? "error" : "saved";

  // ---- publishing -----------------------------------------------------------------------------------
  const checks = usePublishChecks(code);
  const openPublish = async () => {
    setPublishOpen(true);
    setPublishPrep("saving");
    setPublishPrep((await saveNow()) ? "ready" : "failed");
  };
  const goToLine = (line: number) => {
    setPane("code");
    setReveal((r) => ({ pos: offsetOfLine(code, line), nonce: (r?.nonce ?? 0) + 1 }));
  };

  if (!mounted) return <div className="bg-background h-svh" aria-busy="true" />;

  const editorPane = (
    <section aria-label="Code" className="bg-background flex h-full min-h-0 min-w-0 flex-col">
      <div className="text-muted-foreground flex h-9 shrink-0 items-center justify-between gap-2 border-b px-4 text-xs">
        <span className="font-mono">component.tsx</span>
        <PreviewState status={status} />
      </div>
      <div className="min-h-0 flex-1">
        <Suspense fallback={<p className="text-muted-foreground p-4 text-sm">Loading editor…</p>}>
          <CodeEditor value={code} onChange={setCode} label="Component code" reveal={reveal} />
        </Suspense>
      </div>
    </section>
  );

  const previewPane = (
    <section aria-label="Live preview" className="bg-muted/30 relative h-full min-h-0 min-w-0">
      <PreviewFrame code={code} theme={theme} onStatus={setStatus} className="absolute inset-0 size-full border-0" />
      {status.kind === "starting" && (
        <div role="status" className="text-muted-foreground bg-background/80 absolute inset-0 z-[1] grid place-items-center text-sm">
          <span className="flex items-center gap-2">
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
            Starting preview
          </span>
        </div>
      )}
      {(status.kind === "error" || status.kind === "stalled") && (
        <div role="alert" className="bg-destructive/10 text-destructive border-destructive/30 absolute inset-x-3 bottom-3 z-[1] max-h-[45%] overflow-auto rounded-lg border p-3 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle aria-hidden className="size-4 shrink-0" />
            {status.kind === "stalled" ? "The preview stopped responding" : status.phase === "compile" ? "This code has an error" : "This code failed while running"}
          </p>
          <p className="mt-1 font-mono text-xs break-words whitespace-pre-wrap">{status.kind === "stalled" ? "It may be stuck in a loop. Change the code and it will try again." : status.message}</p>
        </div>
      )}
    </section>
  );

  return (
    <div className="bg-background text-foreground flex h-svh flex-col overflow-hidden">
      <StudioTopBar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        title={title}
        onTitleChange={setTitle}
        previewTheme={theme}
        onPreviewThemeChange={setTheme}
        saveStatus={saveStatus}
        onPublish={() => void openPublish()}
      />
      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        componentId={componentId}
        target={{ id: objectId, name: title, code }}
        problem={null}
        prep={publishPrep}
        onRetrySave={() => void openPublish()}
        details={{ title, ...details }}
        onDetailsChange={(d) => {
          setTitle(d.title);
          setDetails({ description: d.description, category: d.category, tags: d.tags });
        }}
        checks={checks}
        onGoToLine={goToLine}
        isUpdate={everPublished}
        onPublished={() => setEverPublished(true)}
      />
      {desktop ? (
        <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1" data-component-id={componentId}>
          <ResizablePanel id="code" minSize={320} defaultSize="50%">
            {editorPane}
          </ResizablePanel>
          <ResizableHandle aria-label="Resize editor and preview" />
          <ResizablePanel id="preview" minSize={280}>
            {previewPane}
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div role="tablist" aria-label="View" className="flex shrink-0 border-b">
            {(["code", "preview"] as const).map((p) => (
              <button
                key={p}
                role="tab"
                type="button"
                aria-selected={pane === p}
                onClick={() => setPane(p)}
                className={cn("focus-visible:ring-ring/50 min-h-11 flex-1 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset", pane === p ? "border-primary border-b-2" : "text-muted-foreground")}
              >
                {p === "code" ? "Code" : "Preview"}
              </button>
            ))}
          </div>
          {/* Both stay mounted, so switching keeps the cursor and the drawn preview. */}
          <div className={cn("min-h-0 flex-1", pane !== "code" && "hidden")}>{editorPane}</div>
          <div className={cn("min-h-0 flex-1", pane !== "preview" && "hidden")}>{previewPane}</div>
        </div>
      )}
    </div>
  );
}

function PreviewState({ status }: { status: PreviewStatus }) {
  const bad = status.kind === "error" || status.kind === "stalled" || status.kind === "failed";
  const label = bad ? "Error" : status.kind === "ready" ? "Live" : "Starting…";
  return (
    <span className="flex items-center gap-1.5" role="status">
      <span aria-hidden className={cn("size-2 rounded-full", bad ? "bg-destructive" : status.kind === "ready" ? "bg-green-500" : "bg-muted-foreground")} />
      {label}
    </span>
  );
}
