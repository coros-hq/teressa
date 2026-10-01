import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";

import type { AuditResult } from "~/lib/publish/checks/types.ts";

import {
  isFromFrame,
  MAX_CODE_LENGTH,
  type Rect,
  type ToFrame,
} from "./preview-protocol";
import { collectThemeVars, loadFonts } from "./theme-vars";

export type PreviewStatus =
  | { kind: "starting" }
  | { kind: "ready" }
  | { kind: "error"; phase: "compile" | "runtime"; message: string }
  | { kind: "stalled" }
  | { kind: "failed" };

export type PreviewApi = {
  /** Which element (its data-sid) is at this point, in frame pixels? */
  hit: (x: number, y: number) => Promise<{ sid: number; rect: Rect } | null>;
  /** Where is element `sid` right now, in frame pixels? */
  measure: (sid: number) => Promise<Rect | null>;
  /** Draw `code` in `theme` and scan it for accessibility problems. Null if the frame isn't ready. */
  audit: (code: string, theme: "light" | "dark") => Promise<AuditResult | null>;
  /** Draw `code` in `theme` and return a picture of it. Null if the frame isn't ready. */
  capture: (code: string, theme: "light" | "dark") => Promise<CaptureResult | null>;
};

export type CaptureResult = { ok: true; blob: Blob } | { ok: false; message: string };

const DEBOUNCE_MS = 300;
const START_TIMEOUT_MS = 10_000;
const RENDER_TIMEOUT_MS = 5_000;

// Bump when the runtime changes so browsers don't serve a stale copy.
const RUNTIME_VERSION = "1";

function buildSrcDoc(origin: string) {
  // The frame can run scripts, but cannot make any network request (connect-src none), load
  // images or fonts from elsewhere, or submit forms. Scripts may only come from our own runtime.
  const csp = [
    "default-src 'none'",
    `script-src 'unsafe-inline' 'unsafe-eval' ${origin}`,
    "style-src 'unsafe-inline'",
    "img-src data: blob:",
    "font-src data: blob:",
    "connect-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
</head><body><div id="stage"></div>
<script>window.__STUDIO_PARENT_ORIGIN__=${JSON.stringify(origin)}</script>
<script src="${origin}/studio/preview-runtime.js?v=${RUNTIME_VERSION}"></script>
</body></html>`;
}

// Renders the user's code inside a sandboxed iframe (allow-scripts only, no same-origin), so that
// code can never reach the app's cookies, storage or session. Talks to it only via postMessage.
export function PreviewFrame({
  code,
  theme,
  onStatus,
  restartKey = 0,
  apiRef,
  className,
  idle = false,
}: {
  code: string;
  theme: "light" | "dark";
  onStatus: (status: PreviewStatus) => void;
  /** Change this to recreate the frame, for example after it stopped responding. */
  restartKey?: number;
  apiRef?: React.RefObject<PreviewApi | null>;
  className?: string;
  /** Start the frame but don't draw `code` in it. Used by the Publish checks, which ask for their own draws. */
  idle?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [origin, setOrigin] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  const ready = useRef(false);
  const renderId = useRef(0);
  const latest = useRef({ code, theme, idle });
  latest.current = { code, theme, idle };
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;
  const renderTimer = useRef<number>(0);
  const watchdog = useRef<number>(0);

  useEffect(() => setOrigin(window.location.origin), []);

  // Element queries: ask the frame, wait for the matching reply (or give up after a moment).
  const pending = useRef(new Map<number, (r: { sid: number | null; rect: Rect | null }) => void>());
  const reqId = useRef(0);
  const query = useCallback(
    (build: (req: number) => ToFrame) =>
      new Promise<{ sid: number | null; rect: Rect | null }>((resolve) => {
        if (!ready.current) return resolve({ sid: null, rect: null });
        const req = ++reqId.current;
        const timer = window.setTimeout(() => {
          pending.current.delete(req);
          resolve({ sid: null, rect: null });
        }, 1000);
        pending.current.set(req, (r) => {
          window.clearTimeout(timer);
          resolve(r);
        });
        iframeRef.current?.contentWindow?.postMessage(build(req), "*");
      }),
    []
  );
  const audits = useRef(new Map<number, (r: AuditResult) => void>());
  const auditId = useRef(0);
  const audit = useCallback(async (code: string, theme: "light" | "dark") => {
    // The frame may still be starting: give it a few seconds before giving up.
    const until = Date.now() + 10_000;
    while (!ready.current && Date.now() < until) await new Promise((r) => setTimeout(r, 100));
    if (!ready.current) return null;
    return new Promise<AuditResult>((resolve) => {
      const req = ++auditId.current;
      audits.current.set(req, resolve);
      iframeRef.current?.contentWindow?.postMessage({ source: "studio", type: "audit", req, code, theme } satisfies ToFrame, "*");
    });
  }, []);

  const captures = useRef(new Map<number, (r: CaptureResult) => void>());
  const captureId = useRef(0);
  const capture = useCallback(async (code: string, theme: "light" | "dark") => {
    const until = Date.now() + 10_000;
    while (!ready.current && Date.now() < until) await new Promise((r) => setTimeout(r, 100));
    if (!ready.current) return null;
    return new Promise<CaptureResult>((resolve) => {
      const req = ++captureId.current;
      captures.current.set(req, resolve);
      iframeRef.current?.contentWindow?.postMessage({ source: "studio", type: "capture", req, code, theme } satisfies ToFrame, "*");
    });
  }, []);

  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      audit,
      capture,
      hit: async (x, y) => {
        const r = await query((req) => ({ source: "studio", type: "query", req, kind: "hit", x, y }));
        return r.sid !== null && r.rect ? { sid: r.sid, rect: r.rect } : null;
      },
      measure: async (sid) =>
        (await query((req) => ({ source: "studio", type: "query", req, kind: "measure", sid }))).rect,
    };
  }, [apiRef, query, audit, capture]);

  const send = useCallback((msg: ToFrame) => {
    // The frame has an opaque origin, so "*" is the only possible target. That is safe because
    // we only ever post to this iframe's own contentWindow.
    iframeRef.current?.contentWindow?.postMessage(msg, "*");
  }, []);

  const render = useCallback(() => {
    const { code, idle } = latest.current;
    if (idle) return;
    if (code.length > MAX_CODE_LENGTH) {
      onStatusRef.current({ kind: "error", phase: "compile", message: "This file is too large to preview." });
      return;
    }
    const id = ++renderId.current;
    send({ source: "studio", type: "render", id, code });
    window.clearTimeout(watchdog.current);
    watchdog.current = window.setTimeout(
      () => onStatusRef.current({ kind: "stalled" }),
      RENDER_TIMEOUT_MS
    );
  }, [send]);

  // Messages from the frame: must come from our iframe, with the sandbox's "null" origin, and
  // must match a known shape.
  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.origin !== "null") return;
      if (!isFromFrame(event.data)) return;
      const msg = event.data;

      if (msg.type === "ready") {
        const fonts = await loadFonts();
        send({
          source: "studio",
          type: "init",
          theme: latest.current.theme,
          vars: collectThemeVars(),
          fonts,
        });
        ready.current = true;
        render();
      } else if (msg.type === "audit-result") {
        audits.current.get(msg.req)?.(msg.result);
        audits.current.delete(msg.req);
      } else if (msg.type === "capture-result") {
        const r = msg.result;
        captures.current.get(msg.req)?.(r.ok ? { ok: true, blob: new Blob([r.data], { type: r.mime }) } : { ok: false, message: r.message });
        captures.current.delete(msg.req);
      } else if (msg.type === "query-result") {
        pending.current.get(msg.req)?.({ sid: msg.sid, rect: msg.rect });
        pending.current.delete(msg.req);
      } else if (msg.type === "rendered") {
        if (msg.id !== renderId.current) return;
        window.clearTimeout(watchdog.current);
        onStatusRef.current({ kind: "ready" });
      } else if (msg.type === "error") {
        if (msg.id !== -1 && msg.id !== renderId.current) return;
        window.clearTimeout(watchdog.current);
        onStatusRef.current({ kind: "error", phase: msg.phase, message: msg.message });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [send, render]);

  // Start-up timeout, and reset when the frame is recreated.
  useEffect(() => {
    if (!origin) return;
    ready.current = false;
    setFailed(false);
    onStatusRef.current({ kind: "starting" });
    const t = window.setTimeout(() => {
      if (!ready.current) {
        setFailed(true);
        onStatusRef.current({ kind: "failed" });
      }
    }, START_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [origin, attempt, restartKey]);

  // Debounced re-render when the code changes.
  useEffect(() => {
    if (!ready.current || idle) return;
    window.clearTimeout(renderTimer.current);
    renderTimer.current = window.setTimeout(render, DEBOUNCE_MS);
    return () => window.clearTimeout(renderTimer.current);
  }, [code, render, idle]);

  useEffect(() => {
    if (ready.current) send({ source: "studio", type: "theme", theme });
  }, [theme, send]);

  if (!origin) return null;

  return (
    <>
      <iframe
        key={`${attempt}-${restartKey}`}
        ref={iframeRef}
        title="Component preview"
        sandbox="allow-scripts"
        srcDoc={buildSrcDoc(origin)}
        referrerPolicy="no-referrer"
        className={className}
      />
      {failed && (
        <div className="bg-card absolute inset-0 z-10 grid place-items-center p-6 text-center">
          <div className="grid max-w-sm gap-3">
            <p className="font-semibold">The preview couldn&apos;t start</p>
            <p className="text-muted-foreground text-sm">
              Try again. If it keeps failing, reload the page.
            </p>
            <Button className="justify-self-center" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
