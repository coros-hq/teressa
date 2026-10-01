import type { DesignObject, Shadow } from "./design-model";
import { arrange, contains, flowStyle, type Block, type Item, type Rect } from "./layout-engine.ts";

// Writes a component's layers as React code, so a component made on the canvas always has code to
// preview, edit and publish.
//
// The layout is worked out from where the layers sit, so the result is real flex layout (rows,
// columns, gaps, padding, centering) rather than every layer pinned at a pixel position. A
// rectangle with text on top of it becomes a box that holds the text. Only layers that overlap
// with no gap between them keep exact positions, and only within their own small group.
//
// Styling is Tailwind classes only: every size, font, border and shadow is a class (arbitrary
// values like w-[120px] where there is no named one), and colors are theme tokens (bg-primary,
// text-foreground) wherever the design uses them. A color typed in by hand (a hex value) is written
// as-is on its own line with the "teressa-ignore-color" comment, so it shows as a warning when
// publishing instead of blocking it: it was deliberate.
//
// Imports are type-only so this file also runs under `node --test`.

const TOKENS = new Set([
  "background", "foreground", "card", "card-foreground", "popover", "popover-foreground", "primary",
  "primary-foreground", "secondary", "secondary-foreground", "muted", "muted-foreground", "accent",
  "accent-foreground", "destructive", "border", "input", "ring", "chart-1", "chart-2", "chart-3",
  "chart-4", "chart-5",
]);

const IGNORE = "// teressa-ignore-color";
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|oklch|oklab|lab|lch)\(/;

const round = (n: number) => Math.round(n * 100) / 100;
const px = (n: number) => `${round(n)}px`;
/** Tailwind arbitrary values can't contain spaces: they are written as underscores. */
const arb = (value: string) => value.replace(/\s+/g, "_");

/** One Tailwind class. `literal` marks a hand-typed color, which gets the ignore comment. */
type Cls = { c: string; literal?: boolean };
const cls = (c: string, literal = false): Cls => ({ c, literal });
const plain = (cs: string[]): Cls[] => cs.map((c) => cls(c));

/** `var(--primary)` -> "primary" when it is one of the theme colors Tailwind knows by name. */
function tokenOf(color: string | null | undefined): string | null {
  const m = color?.trim().match(/^var\(--([a-z0-9-]+)\)$/);
  return m && TOKENS.has(m[1]) ? m[1] : null;
}

/** A color as a Tailwind class: `bg-primary` for a theme color, `bg-[...]` for anything else. */
function colorClass(prefix: string, color: string): Cls {
  const t = tokenOf(color);
  if (t) return cls(`${prefix}-${t}`);
  const v = color.trim();
  const varMatch = v.match(/^var\((--[a-z0-9-]+)\)$/);
  return cls(`${prefix}-[${varMatch ? `var(${varMatch[1]})` : arb(v)}]`, COLOR_LITERAL.test(v));
}

// A shadow's color is usually translucent black. That is written with color-mix, which isn't a
// fixed color literal; any other shadow color is kept as typed.
function shadowValue(s: Shadow): { value: string; literal: boolean; color: string } {
  const m = s.color.match(/^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/);
  let color = s.color;
  let literal = COLOR_LITERAL.test(s.color);
  if (m && m[1] === "000000") {
    const alpha = m[2] ? Math.round((parseInt(m[2], 16) / 255) * 100) : 100;
    color = `color-mix(in srgb, black ${alpha}%, transparent)`;
    literal = false;
  }
  return { value: `${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${color}`, literal, color };
}

const FONT_WEIGHT: Record<number, string> = {
  100: "font-thin", 200: "font-extralight", 300: "font-light", 400: "font-normal", 500: "font-medium",
  600: "font-semibold", 700: "font-bold", 800: "font-extrabold", 900: "font-black",
};

function pascal(name: string): string {
  const words = name.replace(/[^A-Za-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  const joined = words.map((w) => w[0].toUpperCase() + w.slice(1)).join("");
  return /^[A-Za-z]/.test(joined) ? joined : `Component${joined}`;
}

const indent = (n: number) => "  ".repeat(n);
const opacityClass = (o: DesignObject) =>
  o.opacity !== undefined && o.opacity < 100 ? [cls(`opacity-[${round(o.opacity / 100)}]`)] : [];

/**
 * The className attribute. Plain when every class is a theme class; when a hand-typed color is
 * involved it becomes a cn(...) call with that class on its own line, so the comment can sit next to it.
 */
function classAttr(classes: Cls[], depth: number): string[] {
  const pad = indent(depth);
  if (!classes.some((c) => c.literal)) return [`${pad}className="${classes.map((c) => c.c).join(" ")}"`];
  const rest = classes.filter((c) => !c.literal).map((c) => c.c).join(" ");
  return [
    `${pad}className={cn(`,
    ...(rest ? [`${pad}  "${rest}",`] : []),
    ...classes.filter((c) => c.literal).map((c) => `${pad}  "${c.c}", ${IGNORE}`),
    `${pad})}`,
  ];
}

/** Width of the border a box draws, so its inside can be measured from the right place. */
function borderWidth(o: DesignObject, defaults: { border: boolean }): number {
  if (o.stroke) return o.strokeWidth ?? 1;
  return defaults.border && o.fill !== null ? 1 : 0; // the canvas draws a hairline around filled frames and components
}

// Fill, stroke, radius, shadow and opacity of a box-like thing.
function boxLook(o: DesignObject, defaults: { border: boolean }): Cls[] {
  const out: Cls[] = [];
  if (o.fill) out.push(colorClass("bg", o.fill));

  if (o.stroke) {
    out.push(cls("box-border"), cls(`border-[${px(o.strokeWidth ?? 1)}]`), cls("border-solid"), colorClass("border", o.stroke));
  } else if (defaults.border && o.fill !== null) {
    out.push(cls("border"));
  }

  if (o.kind === "ellipse") out.push(cls("rounded-full"));
  else if (o.radius) out.push(cls(`rounded-[${px(o.radius)}]`));

  if (o.shadow) {
    const s = shadowValue(o.shadow);
    out.push(cls(`shadow-[${arb(s.value)}]`, s.literal));
  }
  return [...out, ...opacityClass(o)];
}

const size = (r: Rect): Cls[] => [cls(`w-[${px(r.w)}]`), cls(`h-[${px(r.h)}]`)];

// ---- turning layers into positioned nodes ---------------------------------------------------------------------

type DNode = { obj: DesignObject; rect: Rect; kids: DNode[] };
type Ctx = { objects: DesignObject[]; seen: Set<string> };

const childrenOf = (ctx: Ctx, id: string) => ctx.objects.filter((o) => o.parentId === id);

/** Everything inside `parentId`, with positions measured from the component's top-left corner. */
function buildNodes(ctx: Ctx, parentId: string, origin: { x: number; y: number }): DNode[] {
  const out: DNode[] = [];
  for (const o of childrenOf(ctx, parentId)) {
    // A group is only a set of members: they keep their place in the space around it.
    if (o.kind === "group") {
      out.push(...buildNodes(ctx, o.id, origin));
      continue;
    }
    const rect = { x: origin.x + o.x, y: origin.y + o.y, w: o.width, h: o.height };
    let kids: DNode[] = [];
    if (o.kind === "frame") kids = buildNodes(ctx, o.id, rect);
    if (o.kind === "instance") {
      // An instance draws its main component's layers inside its own box.
      const main = ctx.objects.find((m) => m.id === o.componentId && m.kind === "component");
      if (main && !ctx.seen.has(main.id) && main.code === undefined) {
        kids = buildNodes({ ...ctx, seen: new Set(ctx.seen).add(main.id) }, main.id, rect);
      }
    }
    out.push({ obj: o, rect, kids: nest(kids) });
  }
  return nest(out);
}

/**
 * A rectangle or ellipse that has other layers fully inside it is their background: it becomes the
 * box that holds them (a button is a rectangle with its label inside), instead of a neighbour.
 */
function nest(nodes: DNode[]): DNode[] {
  const area = (n: DNode) => n.rect.w * n.rect.h;
  const holders = nodes.filter((n) => (n.obj.kind === "rect" || n.obj.kind === "ellipse") && n.kids.length === 0);
  const parent = new Map<DNode, DNode>();
  for (const n of nodes) {
    let best: DNode | null = null;
    for (const h of holders) {
      if (h === n || area(h) <= area(n) + 0.01 || !contains(h.rect, n.rect)) continue;
      if (!best || area(h) < area(best)) best = h; // the smallest box that holds it
    }
    if (best) parent.set(n, best);
  }
  const top: DNode[] = [];
  for (const n of nodes) {
    const p = parent.get(n);
    if (p) p.kids.push(n);
    else top.push(n);
  }
  return top;
}

// ---- writing them out -----------------------------------------------------------------------------------------------

type Opts = { debugIds?: boolean };

const idAttr = (o: DesignObject, depth: number, opts: Opts) => (opts.debugIds ? [`${indent(depth)}data-layer="${o.id}"`] : []);

/** Where an element sits: in a flow (its container places it), or pinned inside an overlapping group. */
type Place = { kind: "flow"; extra: string[] } | { kind: "abs"; left: number; top: number };

const placeClasses = (p: Place): Cls[] =>
  p.kind === "flow" ? [cls("shrink-0"), ...plain(p.extra)] : [cls("absolute"), cls(`left-[${px(p.left)}]`), cls(`top-[${px(p.top)}]`)];

/** The children of a box, laid out. Returns the classes the box needs and the elements inside it. */
function layoutKids(kids: DNode[], inner: Rect, depth: number, ctx: Ctx, opts: Opts): { classes: Cls[]; lines: string[] } {
  const block = arrange<DNode>(kids.map((n) => ({ value: n, rect: n.rect })));
  if (block.kind === "abs") {
    return {
      classes: [cls("relative")],
      lines: block.items.flatMap((i) => writeNode(i.value, { kind: "abs", left: i.rect.x - inner.x, top: i.rect.y - inner.y }, depth, ctx, opts)),
    };
  }
  const blocks: Block<DNode>[] = block.kind === "flow" ? block.blocks : [block];
  const style = flowStyle(block.kind === "flow" ? block.dir : "col", inner, blocks.map((b) => b.rect));
  return { classes: plain(style.container), lines: blocks.flatMap((b, i) => writeBlock(b, style.items[i], depth, ctx, opts)) };
}

/** A block inside a flow: a layer, or a plain wrapper for a row/column/pinned group of layers. */
function writeBlock(b: Block<DNode>, extra: string[], depth: number, ctx: Ctx, opts: Opts): string[] {
  const pad = indent(depth);
  if (b.kind === "leaf") return writeNode(b.item.value, { kind: "flow", extra }, depth, ctx, opts);

  if (b.kind === "abs") {
    const lines = b.items.flatMap((i: Item<DNode>) => writeNode(i.value, { kind: "abs", left: i.rect.x - b.rect.x, top: i.rect.y - b.rect.y }, depth + 1, ctx, opts));
    return [`${pad}<div`, ...classAttr([cls("relative"), cls("shrink-0"), ...size(b.rect), ...plain(extra)], depth + 1), `${pad}>`, ...lines, `${pad}</div>`];
  }

  const style = flowStyle(b.dir, b.rect, b.blocks.map((x) => x.rect));
  const inside = b.blocks.flatMap((x, i) => writeBlock(x, style.items[i], depth + 1, ctx, opts));
  return [`${pad}<div`, ...classAttr([...plain(style.container), cls("shrink-0"), ...plain(extra)], depth + 1), `${pad}>`, ...inside, `${pad}</div>`];
}

function writeNode(n: DNode, place: Place, depth: number, ctx: Ctx, opts: Opts): string[] {
  const o = n.obj;
  const pad = indent(depth);

  switch (o.kind) {
    case "frame":
    case "rect":
    case "ellipse":
    case "instance": {
      const isFrame = o.kind === "frame";
      const isInstance = o.kind === "instance";
      const bw = isInstance ? 0 : borderWidth(o, { border: isFrame });
      const look = isInstance ? [] : boxLook(o, { border: isFrame });
      const classes: Cls[] = [...placeClasses(place), ...(isFrame || isInstance ? [cls("overflow-hidden")] : []), ...size(n.rect), ...look];

      if (n.kids.length === 0) return [`${pad}<div`, ...classAttr(classes, depth + 1), ...idAttr(o, depth + 1, opts), `${pad}/>`];
      const inner = { x: n.rect.x + bw, y: n.rect.y + bw, w: n.rect.w - bw * 2, h: n.rect.h - bw * 2 };
      const laid = layoutKids(n.kids, inner, depth + 1, ctx, opts);
      return [`${pad}<div`, ...classAttr([...classes, ...laid.classes], depth + 1), ...idAttr(o, depth + 1, opts), `${pad}>`, ...laid.lines, `${pad}</div>`];
    }

    case "text": {
      const weight = o.fontWeight ?? 500;
      const align = o.textAlign ?? "left";
      const justify = { top: "justify-start", middle: "justify-center", bottom: "justify-end" }[o.verticalAlign ?? "top"];
      const classes = [
        ...placeClasses(place), ...size(n.rect),
        cls("flex"), cls("flex-col"), cls(justify), cls("whitespace-pre-wrap"), cls("wrap-anywhere"),
        cls(`text-[${px(o.fontSize ?? 24)}]`),
        cls(FONT_WEIGHT[weight] ?? `font-[${weight}]`),
        cls("leading-tight"), // the canvas uses a line height of 1.25
        cls(`text-${align}`),
        colorClass("text", o.fill ?? "var(--foreground)"),
        ...opacityClass(o),
      ];
      if (o.shadow) {
        const s = shadowValue(o.shadow);
        classes.push(cls(`[text-shadow:${arb(`${o.shadow.x}px ${o.shadow.y}px ${o.shadow.blur}px ${s.color}`)}]`, s.literal));
      }
      return [`${pad}<p`, ...classAttr(classes, depth + 1), ...idAttr(o, depth + 1, opts), `${pad}>`, `${pad}  {${JSON.stringify(o.text ?? "")}}`, `${pad}</p>`];
    }

    case "line":
    case "arrow": {
      const x1 = (o.x1 ?? o.x) - o.x;
      const y1 = (o.y1 ?? o.y) - o.y;
      const x2 = (o.x2 ?? o.x + o.width) - o.x;
      const y2 = (o.y2 ?? o.y + o.height) - o.y;
      const sw = o.strokeWidth ?? 2;
      const stroke = o.stroke ?? "var(--foreground)";
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const head = 8 + sw * 2;
      const bx = x2 - Math.cos(angle) * head;
      const by = y2 - Math.sin(angle) * head;
      const hx = -Math.sin(angle) * head * 0.5;
      const hy = Math.cos(angle) * head * 0.5;
      const isArrow = o.kind === "arrow" && Math.hypot(x2 - x1, y2 - y1) > head;
      return [
        `${pad}<svg`,
        ...classAttr([...placeClasses(place), cls("overflow-visible"), ...opacityClass(o)], depth + 1),
        `${pad}  width={${round(Math.max(o.width, 1))}}`,
        `${pad}  height={${round(Math.max(o.height, 1))}}`,
        ...idAttr(o, depth + 1, opts),
        `${pad}  aria-hidden="true"`,
        `${pad}>`,
        `${pad}  <line`,
        `${pad}    x1={${round(x1)}}`,
        `${pad}    y1={${round(y1)}}`,
        `${pad}    x2={${round(isArrow ? bx : x2)}}`,
        `${pad}    y2={${round(isArrow ? by : y2)}}`,
        ...classAttr([colorClass("stroke", stroke), cls(`stroke-[${sw}px]`)], depth + 2),
        `${pad}    strokeLinecap="round"`,
        `${pad}  />`,
        ...(isArrow
          ? [
              `${pad}  <polygon`,
              `${pad}    points="${round(x2)},${round(y2)} ${round(bx + hx)},${round(by + hy)} ${round(bx - hx)},${round(by - hy)}"`,
              ...classAttr([colorClass("fill", stroke)], depth + 2),
              `${pad}  />`,
            ]
          : []),
        `${pad}</svg>`,
      ];
    }

    default:
      return [];
  }
}

/** Does this component have any layers to write as code? */
export const hasLayers = (objects: DesignObject[], componentId: string) =>
  objects.some((o) => o.parentId === componentId);

/**
 * The component's layers as a React component, named after the component. `debugIds` adds a
 * data-layer attribute to each element, which tests use to compare the result with the design.
 */
export function layersToCode(objects: DesignObject[], componentId: string, opts: Opts = {}): string {
  const comp = objects.find((o) => o.id === componentId);
  if (!comp) return "";
  const ctx: Ctx = { objects, seen: new Set([componentId]) };
  const bw = borderWidth(comp, { border: true });
  const kids = buildNodes(ctx, componentId, { x: 0, y: 0 });
  const inner = { x: bw, y: bw, w: comp.width - bw * 2, h: comp.height - bw * 2 };
  const laid = kids.length ? layoutKids(kids, inner, 3, ctx, opts) : { classes: [], lines: [] };

  const classes = [cls("overflow-hidden"), ...size({ x: 0, y: 0, w: comp.width, h: comp.height }), ...boxLook(comp, { border: true }), ...laid.classes];
  const body = [`    <div`, ...classAttr(classes, 3), ...idAttr(comp, 3, opts), `    >`, ...laid.lines, `    </div>`];

  // `cn` is only imported when a hand-typed color needs it.
  const usesCn = body.some((l) => l.includes("className={cn("));
  return [
    ...(usesCn ? [`import { cn } from "@/lib/utils";`, ``] : []),
    `export default function ${pascal(comp.name)}() {`,
    `  return (`,
    ...body,
    `  );`,
    `}`,
    ``,
  ].join("\n");
}
