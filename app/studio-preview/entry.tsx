// Runs INSIDE the sandboxed iframe. It compiles the user's TSX in the browser, renders it, and
// reports back to the app with postMessage. It never touches the app's cookies or storage: the
// iframe has an opaque origin (sandbox="allow-scripts" only) and a CSP that blocks network access.
import "@tailwindcss/browser";
import { Component, type ReactNode } from "react";
import axe from "axe-core";
import { createRoot, type Root } from "react-dom/client";
import { transform } from "sucrase";

import {
  isToFrame,
  type FromFrame,
  type ThemeVars,
} from "~/components/studio/preview-protocol";

import type { AuditResult, AuditViolation, Impact } from "~/lib/publish/checks/types.ts";

import { captureElement } from "./capture";
import { requireModule } from "./modules";

declare global {
  interface Window {
    __STUDIO_PARENT_ORIGIN__?: string;
  }
}

const PARENT_ORIGIN = window.__STUDIO_PARENT_ORIGIN__ ?? "";

type WithoutSource<T> = T extends unknown ? Omit<T, "source"> : never;

function post(msg: WithoutSource<FromFrame>) {
  window.parent.postMessage({ source: "studio-preview", ...msg }, PARENT_ORIGIN);
}

// ---- theme ------------------------------------------------------------------------------

const COLOR_TOKENS = [
  "background", "foreground", "card", "card-foreground", "popover", "popover-foreground",
  "primary", "primary-foreground", "secondary", "secondary-foreground", "muted",
  "muted-foreground", "accent", "accent-foreground", "destructive", "border", "input", "ring",
  "chart-1", "chart-2", "chart-3", "chart-4", "chart-5",
];

// Same token mapping the app uses, so Tailwind classes like `bg-card` resolve to the theme.
const TAILWIND_THEME = `
@custom-variant dark (&:is(.dark *));
@theme inline {
  ${COLOR_TOKENS.map((t) => `--color-${t}: var(--${t});`).join("\n  ")}
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
  --font-sans: 'Outfit Variable', ui-sans-serif, system-ui, sans-serif;
  --font-heading: var(--font-sans);
  --font-mono: 'Geist Mono Variable', ui-monospace, monospace;
}
`;

const toCss = (vars: ThemeVars) =>
  Object.entries(vars).map(([k, v]) => `${k}:${v};`).join("");

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

// Kept so a captured picture can carry the fonts with it.
let loadedFonts: { family: string; weight: string; data: ArrayBuffer }[] = [];

function init(msg: Extract<ReturnType<typeof parse>, { type: "init" }>) {
  loadedFonts = msg.fonts;
  const vars = document.createElement("style");
  vars.textContent = `:root{${toCss(msg.vars.light)}}.dark{${toCss(msg.vars.dark)}}
    html,body{margin:0;background:var(--background);color:var(--foreground);font-family:'Outfit Variable',ui-sans-serif,system-ui,sans-serif}
    /* The default border color: in Tailwind's components layer, after its base styles but before its classes, so border-transparent and friends still win (as in the app). */
    @layer components{*,::before,::after{border-color:var(--border)}}
    #stage{min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box}
    #stage>div{grid-area:1/1}`;
  document.head.append(vars);

  const tw = document.createElement("style");
  tw.setAttribute("type", "text/tailwindcss");
  tw.textContent = TAILWIND_THEME;
  document.head.append(tw);

  for (const f of msg.fonts) {
    const face = new FontFace(f.family, f.data, { weight: f.weight });
    document.fonts.add(face);
    void face.load().catch(() => {});
  }
  applyTheme(msg.theme);
}

// ---- compile + render -------------------------------------------------------------------

function compile(code: string): React.ComponentType {
  const { code: js } = transform(code, {
    transforms: ["typescript", "jsx", "imports"],
    jsxRuntime: "automatic",
    production: true,
    filePath: "component.tsx",
  });
  const mod: { exports: Record<string, unknown> } = { exports: {} };
  new Function("exports", "require", "module", js)(mod.exports, requireModule, mod);
  const exported =
    mod.exports.default ??
    Object.values(mod.exports).find((v) => typeof v === "function");
  if (typeof exported !== "function") {
    throw new Error("Export your component as the default export, for example: export default function MyComponent() { ... }");
  }
  return exported as React.ComponentType;
}

class Boundary extends Component<
  { onOk: () => void; onError: (message: string) => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidMount() {
    if (!this.state.failed) this.props.onOk();
  }
  componentDidCatch(error: unknown) {
    this.props.onError(messageOf(error));
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));

const stage = document.getElementById("stage")!;
let current: { root: Root; el: HTMLElement } | null = null;

type Mounted = { ok: true } | { ok: false; phase: "compile" | "runtime"; message: string };

// The new render goes into a hidden container first. Only when it mounts without error does it
// replace the current one, so a failing edit leaves the last working render on screen.
function mount(code: string): Promise<Mounted> {
  return new Promise((resolve) => {
    let Comp: React.ComponentType;
    try {
      Comp = compile(code);
    } catch (e) {
      return resolve({ ok: false, phase: "compile", message: messageOf(e) });
    }

    const el = document.createElement("div");
    el.style.visibility = "hidden";
    stage.append(el);
    const root = createRoot(el);
    let settled = false;
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      root.unmount();
      el.remove();
      resolve({ ok: false, phase: "runtime", message });
    };
    root.render(
      <Boundary
        onOk={() => {
          if (settled) return;
          settled = true;
          el.style.visibility = "";
          if (current) {
            current.root.unmount();
            current.el.remove();
          }
          current = { root, el };
          resolve({ ok: true });
        }}
        onError={fail}
      >
        <Comp />
      </Boundary>
    );
  });
}

function render(id: number, code: string) {
  void mount(code).then((r) =>
    post(r.ok ? { type: "rendered", id } : { type: "error", id, phase: r.phase, message: r.message })
  );
}

// ---- accessibility audit (used by the Publish dialog) ---------------------------------------------
// Draws the code in one theme and scans it with axe-core. Page-level rules are switched off: a
// component is one piece of a page, so "needs a main landmark" or "needs an h1" would fail them all.

const PAGE_LEVEL_RULES = ["region", "landmark-one-main", "page-has-heading-one", "bypass", "document-title", "html-has-lang", "html-lang-valid"];

// Browsers pause animation frames in frames that aren't on screen, so never wait on one alone.
const nextFrame = () =>
  new Promise<void>((r) => {
    requestAnimationFrame(() => r());
    setTimeout(r, 100);
  });
const capped = (p: Promise<unknown>, ms: number) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);

async function audit(req: number, code: string, theme: "light" | "dark") {
  const reply = (result: AuditResult) => post({ type: "audit-result", req, result });
  applyTheme(theme);
  const mounted = await mount(code);
  if (!mounted.ok) {
    return reply({ theme, render: mounted, empty: false, violations: [] });
  }
  // Let styles and fonts settle before measuring contrast.
  await capped(document.fonts.ready, 1000);
  await nextFrame();
  await nextFrame();

  const el = current!.el;
  const empty = el.childElementCount === 0 && !(el.textContent ?? "").trim();
  try {
    const res = await axe.run(el, {
      resultTypes: ["violations"],
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
      rules: Object.fromEntries(PAGE_LEVEL_RULES.map((id) => [id, { enabled: false }])),
    });
    const violations: AuditViolation[] = res.violations.map((v) => ({
      id: v.id,
      impact: (v.impact as Impact | null) ?? null,
      help: v.help,
      nodes: v.nodes.slice(0, 5).map((n) => {
        let sid: number | null = null;
        try {
          const found = document.querySelector(String(n.target[0]))?.closest("[data-sid]");
          const parsed = found ? Number((found as HTMLElement).dataset.sid) : NaN;
          sid = Number.isFinite(parsed) ? parsed : null;
        } catch {}
        // data-sid is our own bookkeeping, not part of the person's code: leave it out of what they read.
        return { html: n.html.replace(/\sdata-sid="\d+"/g, "").slice(0, 200), sid };
      }),
    }));
    reply({ theme, render: { ok: true }, empty, violations });
  } catch (e) {
    reply({ theme, render: { ok: true }, empty, violations: [], axeError: messageOf(e) });
  }
}

// ---- preview image (used when publishing) -----------------------------------------------------------
async function capture(req: number, code: string, theme: "light" | "dark") {
  const reply = (result: Extract<FromFrame, { type: "capture-result" }>["result"]) => post({ type: "capture-result", req, result });
  applyTheme(theme);
  const mounted = await mount(code);
  if (!mounted.ok) return reply({ ok: false, message: mounted.message });
  await capped(document.fonts.ready, 1000);
  await nextFrame();
  await nextFrame();
  reply(await captureElement(current!.el, theme, loadedFonts));
}

// ---- element queries --------------------------------------------------------------------
// The app owns all pointer input. It asks which element is at a point, or where one is.

const rectOf = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
};

function answer(msg: Extract<ReturnType<typeof parse>, { type: "query" }>) {
  const el =
    msg.kind === "hit"
      ? document.elementFromPoint(msg.x, msg.y)?.closest("[data-sid]")
      : document.querySelector(`[data-sid="${msg.sid}"]`);
  const sid = el ? Number((el as HTMLElement).dataset.sid) : null;
  post({
    type: "query-result",
    req: msg.req,
    sid: Number.isFinite(sid) ? sid : null,
    rect: el ? rectOf(el) : null,
  });
}

// ---- messages ---------------------------------------------------------------------------

function parse(data: unknown) {
  return isToFrame(data) ? data : null;
}

window.addEventListener("message", (event) => {
  // Only the app that embedded this frame may talk to it.
  if (event.source !== window.parent || event.origin !== PARENT_ORIGIN) return;
  const msg = parse(event.data);
  if (!msg) return;
  if (msg.type === "init") init(msg);
  else if (msg.type === "theme") applyTheme(msg.theme);
  else if (msg.type === "query") answer(msg);
  else if (msg.type === "audit") void audit(msg.req, msg.code, msg.theme);
  else if (msg.type === "capture") void capture(msg.req, msg.code, msg.theme);
  else render(msg.id, msg.code);
});

window.addEventListener("error", (e) =>
  post({ type: "error", id: -1, phase: "runtime", message: e.message })
);
window.addEventListener("unhandledrejection", (e) =>
  post({ type: "error", id: -1, phase: "runtime", message: messageOf(e.reason) })
);

post({ type: "ready" });
