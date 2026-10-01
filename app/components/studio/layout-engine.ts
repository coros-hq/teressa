// Works out a flow layout (rows and columns) from where layers sit on the canvas. Pure geometry, no
// React: given boxes, it finds the stacks, rows, gaps, padding and alignment that reproduce them.
//
// The idea is the one a person would use by eye: look for empty bands that cut the group in two
// (a horizontal band means "these are stacked", a vertical band means "these sit side by side"),
// cut, and repeat on each part. Layers that overlap with no band between them can't be put in a
// flow, so that small group keeps its exact positions instead.

export type Rect = { x: number; y: number; w: number; h: number };
export type Item<T> = { value: T; rect: Rect };

export type Block<T> =
  | { kind: "leaf"; item: Item<T>; rect: Rect }
  | { kind: "flow"; dir: "col" | "row"; blocks: Block<T>[]; rect: Rect }
  /** Overlapping layers that can't flow: they keep their positions, relative to `rect`. */
  | { kind: "abs"; items: Item<T>[]; rect: Rect };

/** Layers closer than this are treated as touching (hand-placed boxes are never pixel exact). */
export const TOUCH = 1;

/**
 * How far off-center (in pixels) something can be and still count as centered. Layers are placed by
 * hand, so a label that is 2px off in a button is meant to be centered. Centering it moves it by that much.
 */
export const CENTER = 2;

export const union = (rects: Rect[]): Rect => {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  return {
    x,
    y,
    w: Math.max(...rects.map((r) => r.x + r.w)) - x,
    h: Math.max(...rects.map((r) => r.y + r.h)) - y,
  };
};

export const contains = (outer: Rect, inner: Rect, tolerance = 0.5) =>
  inner.x >= outer.x - tolerance &&
  inner.y >= outer.y - tolerance &&
  inner.x + inner.w <= outer.x + outer.w + tolerance &&
  inner.y + inner.h <= outer.y + outer.h + tolerance;

/** Splits items into groups separated by an empty band along one axis, in order. */
function split<T>(items: Item<T>[], axis: "x" | "y"): Item<T>[][] {
  const size = axis === "x" ? "w" : "h";
  const sorted = [...items].sort((a, b) => a.rect[axis] - b.rect[axis]);
  const groups: Item<T>[][] = [];
  let end = -Infinity;
  for (const item of sorted) {
    if (groups.length && item.rect[axis] >= end - TOUCH) groups.push([item]);
    else if (groups.length) groups[groups.length - 1].push(item);
    else groups.push([item]);
    end = Math.max(end, item.rect[axis] + item.rect[size]);
  }
  return groups;
}

export function arrange<T>(items: Item<T>[]): Block<T> {
  if (items.length === 1) return { kind: "leaf", item: items[0], rect: items[0].rect };
  for (const axis of ["y", "x"] as const) {
    const groups = split(items, axis);
    if (groups.length > 1) {
      const blocks = groups.map(arrange);
      return { kind: "flow", dir: axis === "y" ? "col" : "row", blocks, rect: union(blocks.map((b) => b.rect)) };
    }
  }
  return { kind: "abs", items, rect: union(items.map((i) => i.rect)) };
}

// ---- turning a flow into classes -----------------------------------------------------------------------------

export type FlowStyle = {
  /** Classes for the container (flex direction, gap, alignment, padding). */
  container: string[];
  /** Extra classes for each child (margins, when gaps aren't all the same). */
  items: string[][];
};

const round = (n: number) => Math.round(n * 100) / 100;
const px = (n: number) => `${round(n)}px`;
const near = (a: number, b: number, tol = 1) => Math.abs(a - b) <= tol;

/**
 * `inner` is the container's content box and `rects` the boxes of its children, in order. The classes
 * returned lay the children out the same way: centered when the space around them is even, flush to
 * a side when it isn't, with a gap or margins between them. Sizes of the children are kept by their
 * own classes, so the result is exact, but it flows instead of being pinned.
 */
export function flowStyle(dir: "col" | "row", inner: Rect, rects: Rect[]): FlowStyle {
  const main = dir === "col" ? "y" : "x";
  const cross = dir === "col" ? "x" : "y";
  const mSize = dir === "col" ? "h" : "w";
  const cSize = dir === "col" ? "w" : "h";
  const pad = { mainStart: dir === "col" ? "pt" : "pl", crossStart: dir === "col" ? "pl" : "pt", crossEnd: dir === "col" ? "pr" : "pb" };
  const margin = { main: dir === "col" ? "mt" : "ml", cross: dir === "col" ? "ml" : "mt" };

  const container = ["flex", dir === "col" ? "flex-col" : "flex-row"];
  const items = rects.map(() => [] as string[]);

  // Space between the children along the flow.
  const gaps = rects.slice(1).map((r, i) => Math.max(0, r[main] - (rects[i][main] + rects[i][mSize])));
  if (gaps.length) {
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (gaps.every((g) => near(g, mean))) {
      if (mean > 0.5) container.push(`gap-[${px(mean)}]`);
    } else {
      gaps.forEach((g, i) => g > 0.5 && items[i + 1].push(`${margin.main}-[${px(g)}]`));
    }
  }

  // Along the flow: centered, pushed to the end, or starting after some padding.
  const first = rects[0];
  const last = rects[rects.length - 1];
  const lead = first[main] - inner[main];
  const trail = inner[main] + inner[mSize] - (last[main] + last[mSize]);
  if (near(lead, trail, CENTER * 2) && lead > 1) container.push("justify-center");
  else if (trail <= 0.5 && lead > 1) container.push("justify-end");
  else if (lead > 0.5) container.push(`${pad.mainStart}-[${px(lead)}]`);

  // Across the flow: all centered, all flush to the start, all flush to the end, or each its own.
  const starts = rects.map((r) => r[cross] - inner[cross]);
  const ends = rects.map((r) => inner[cross] + inner[cSize] - (r[cross] + r[cSize]));
  const centers = rects.map((r) => r[cross] + r[cSize] / 2 - (inner[cross] + inner[cSize] / 2));
  const allNear = (xs: number[], v: number) => xs.every((x) => near(x, v));
  if (centers.every((c) => Math.abs(c) <= CENTER) && !allNear(starts, 0)) {
    container.push("items-center");
  } else if (allNear(starts, starts[0])) {
    container.push("items-start");
    if (starts[0] > 0.5) container.push(`${pad.crossStart}-[${px(starts[0])}]`);
  } else if (allNear(ends, ends[0])) {
    container.push("items-end");
    if (ends[0] > 0.5) container.push(`${pad.crossEnd}-[${px(ends[0])}]`);
  } else {
    // Children sit at different distances from the edge: start at the nearest, and nudge the others.
    const min = Math.min(...starts);
    container.push("items-start");
    if (min > 0.5) container.push(`${pad.crossStart}-[${px(min)}]`);
    starts.forEach((s, i) => s - min > 0.5 && items[i].push(`${margin.cross}-[${px(s - min)}]`));
  }
  return { container, items };
}
