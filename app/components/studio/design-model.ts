import { layersToCode } from "./layers-to-code";
import { SAMPLE_CODE } from "./sample-component";

// The design layer of the canvas: the things a person places and arranges. Everything is plain data
// (numbers and strings) so it can be saved as-is later.

export type ObjectKind = "frame" | "component" | "instance" | "group" | "rect" | "ellipse" | "line" | "arrow" | "text";

export const SHAPE_KINDS: ObjectKind[] = ["rect", "ellipse", "line", "arrow", "text"];
export const isLineKind = (k: ObjectKind) => k === "line" || k === "arrow";

export type Shadow = { x: number; y: number; blur: number; spread: number; color: string };

export type DesignObject = {
  id: string;
  kind: ObjectKind;
  name: string;
  /** The frame this object sits in. Its position is relative to that frame. Null on the canvas. */
  parentId?: string | null;
  /** Bounding box in canvas units. For lines and arrows it is derived from the end points. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** A CSS color (`var(--primary)` or `#1a2b3c80`), or null for none. */
  fill?: string | null;
  stroke?: string | null;
  strokeWidth?: number;
  /** Corner radius, for rectangles and frames. */
  radius?: number;
  /** 0 to 100. */
  opacity?: number;
  shadow?: Shadow | null;
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  textAlign?: "left" | "center" | "right" | "justify";
  verticalAlign?: "top" | "middle" | "bottom";
  /** For an instance: the main component it mirrors. */
  componentId?: string;
  /**
   * For a component: code that renders it live in place of its layers. Undefined means it is made
   * of layers.
   */
  code?: string;
  /** Start and end of a line or arrow. */
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
};

export type Box = { x: number; y: number; width: number; height: number };
export type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export const MIN_SIZE = 40;
/** Frames and the component keep a sensible minimum; shapes can get small. */
export const minSizeOf = (kind: ObjectKind) =>
  kind === "frame" || kind === "component" || kind === "instance" || kind === "group" ? MIN_SIZE : kind === "text" ? 16 : 4;

/** Things a dropped object can go into: frames and components. */
export const isContainer = (k: ObjectKind) => k === "frame" || k === "component";
/** Everything that has other objects inside it. A group is only a set of members. */
export const holdsChildren = (k: ObjectKind) => k === "frame" || k === "component" || k === "group";

export const KIND_LABEL: Record<ObjectKind, string> = {
  frame: "Frame",
  component: "Component",
  instance: "Instance",
  group: "Group",
  rect: "Rectangle",
  ellipse: "Ellipse",
  line: "Line",
  arrow: "Arrow",
  text: "Text",
};

export const SHADOW_PRESETS = {
  small: { x: 0, y: 1, blur: 3, spread: 0, color: "#00000033" },
  medium: { x: 0, y: 4, blur: 12, spread: 0, color: "#00000040" },
  large: { x: 0, y: 12, blur: 32, spread: -4, color: "#00000059" },
} satisfies Record<string, Shadow>;

export const boxShadowCss = (s: Shadow) => `${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`;
export const textShadowCss = (s: Shadow) => `${s.x}px ${s.y}px ${s.blur}px ${s.color}`;

export const sameShadow = (a: Shadow | null | undefined, b: Shadow | null | undefined) =>
  !a || !b ? a === b || (!a && !b) : a.x === b.x && a.y === b.y && a.blur === b.blur && a.spread === b.spread && a.color === b.color;

// Colors offered for fills and strokes, straight from the app's theme.
export const THEME_COLORS = [
  "foreground",
  "background",
  "card",
  "muted",
  "muted-foreground",
  "accent",
  "primary",
  "secondary",
  "destructive",
].map((id) => ({ id: `var(--${id})`, label: id, css: `var(--${id})` }));

/** Sets both end points of a line and keeps its bounding box in step. */
export function withEndpoints(o: DesignObject, x1: number, y1: number, x2: number, y2: number): DesignObject {
  return {
    ...o,
    x1,
    y1,
    x2,
    y2,
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

/** The style a new object of this kind starts with. */
export function defaultsFor(kind: ObjectKind): Partial<DesignObject> {
  switch (kind) {
    case "frame":
      return { fill: "var(--background)", shadow: SHADOW_PRESETS.small };
    case "component":
      return { fill: "var(--background)", shadow: SHADOW_PRESETS.small };
    case "rect":
      return { fill: "var(--secondary)", stroke: null, strokeWidth: 1, radius: 0, opacity: 100 };
    case "ellipse":
      return { fill: "var(--secondary)", stroke: null, strokeWidth: 1, opacity: 100 };
    case "line":
    case "arrow":
      return { stroke: "var(--foreground)", strokeWidth: 2, opacity: 100 };
    case "text":
      return { fill: "var(--foreground)", text: "Text", fontSize: 24, fontWeight: 500, opacity: 100 };
    default:
      return {};
  }
}

export const FRAME_PRESETS = [
  { id: "mobile", label: "Mobile", width: 375, height: 812 },
  { id: "tablet", label: "Tablet", width: 768, height: 1024 },
  { id: "desktop", label: "Desktop", width: 1280, height: 800 },
] as const;

export const newId = () => Math.random().toString(36).slice(2, 10);

export function resizeBox(box: Box, handle: Handle, dx: number, dy: number, min = MIN_SIZE): Box {
  let { x, y, width, height } = box;
  if (handle.includes("e")) width = Math.max(min, box.width + dx);
  if (handle.includes("s")) height = Math.max(min, box.height + dy);
  if (handle.includes("w")) {
    width = Math.max(min, box.width - dx);
    x = box.x + (box.width - width);
  }
  if (handle.includes("n")) {
    height = Math.max(min, box.height - dy);
    y = box.y + (box.height - height);
  }
  return { x, y, width, height };
}

export const boundsOf = (objects: Box[]): Box | null => {
  if (!objects.length) return null;
  const x0 = Math.min(...objects.map((o) => o.x));
  const y0 = Math.min(...objects.map((o) => o.y));
  const x1 = Math.max(...objects.map((o) => o.x + o.width));
  const y1 = Math.max(...objects.map((o) => o.y + o.height));
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
};

// ---- nesting: shapes inside frames ------------------------------------------------------------
const byId = (objects: DesignObject[], id: string | null | undefined) =>
  id ? objects.find((o) => o.id === id) : undefined;

export const childrenOf = (objects: DesignObject[], id: string | null) =>
  objects.filter((o) => (o.parentId ?? null) === id);

/** Where an object's own (0, 0) is on the canvas: the sum of its ancestors' positions. */
export function originOf(objects: DesignObject[], parentId: string | null | undefined) {
  let x = 0;
  let y = 0;
  let p = byId(objects, parentId);
  for (let guard = 0; p && guard < 50; guard++) {
    // A group adds no offset: its members are positioned in the space around the group.
    if (p.kind !== "group") {
      x += p.x;
      y += p.y;
    }
    p = byId(objects, p.parentId);
  }
  return { x, y };
}

export function absBox(objects: DesignObject[], o: DesignObject): Box {
  const org = originOf(objects, o.parentId);
  return { x: o.x + org.x, y: o.y + org.y, width: o.width, height: o.height };
}

export function descendantIds(objects: DesignObject[], id: string): Set<string> {
  const out = new Set<string>();
  const walk = (parent: string) => {
    for (const c of objects) {
      if (c.parentId === parent && !out.has(c.id)) {
        out.add(c.id);
        walk(c.id);
      }
    }
  };
  walk(id);
  return out;
}

const depthOf = (objects: DesignObject[], o: DesignObject) => {
  let d = 0;
  for (let p = byId(objects, o.parentId); p && d < 50; p = byId(objects, p.parentId)) d++;
  return d;
};

/** The innermost frame containing a canvas point, ignoring the `exclude` ids. */
export function frameAt(objects: DesignObject[], px: number, py: number, exclude: Set<string>): DesignObject | null {
  let best: { o: DesignObject; depth: number; order: number } | null = null;
  objects.forEach((o, order) => {
    if (!isContainer(o.kind) || exclude.has(o.id)) return;
    const b = absBox(objects, o);
    if (px < b.x || px > b.x + b.width || py < b.y || py > b.y + b.height) return;
    const depth = depthOf(objects, o);
    if (!best || depth > best.depth || (depth === best.depth && order > best.order)) best = { o, depth, order };
  });
  return best ? (best as { o: DesignObject }).o : null;
}

const contains = (outer: Box, inner: Box) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

/**
 * Which frame should adopt an object at this spot? Shapes and text go into the frame under their
 * center. A frame or the component only goes into a frame that fully contains it.
 */
export function adoptingFrame(objects: DesignObject[], o: DesignObject, exclude: Set<string>): DesignObject | null {
  const b = absBox(objects, o);
  const f = frameAt(objects, b.x + b.width / 2, b.y + b.height / 2, exclude);
  if (!f) return null;
  if ((isContainer(o.kind) || o.kind === "instance") && !contains(absBox(objects, f), b)) return null;
  return f;
}

/** A newly drawn object (in canvas coordinates) placed inside the frame it was drawn on, if any. */
export function placeInFrame(objects: DesignObject[], o: DesignObject): DesignObject {
  const f = adoptingFrame(objects, o, new Set());
  if (!f) return o;
  const org = absBox(objects, f);
  return {
    ...o,
    parentId: f.id,
    x: o.x - org.x,
    y: o.y - org.y,
    ...(o.x1 !== undefined ? { x1: o.x1 - org.x, y1: o.y1! - org.y, x2: o.x2! - org.x, y2: o.y2! - org.y } : {}),
  };
}

/** Moves an object into another frame (or onto the canvas) without it jumping on screen. */
export function reparent(objects: DesignObject[], id: string, newParentId: string | null): DesignObject[] {
  const obj = objects.find((o) => o.id === id);
  if (!obj || (obj.parentId ?? null) === newParentId) return objects;
  const from = originOf(objects, obj.parentId);
  const to = originOf(objects, newParentId);
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  // A group has no position of its own, so it is its members that shift.
  const shifted = new Set(obj.kind === "group" ? leafIds(objects, id) : [id]);
  const moved = objects.map((o) =>
    shifted.has(o.id)
      ? {
          ...o,
          x: o.x + dx,
          y: o.y + dy,
          ...(o.x1 !== undefined ? { x1: o.x1 + dx, y1: o.y1! + dy, x2: o.x2! + dx, y2: o.y2! + dy } : {}),
        }
      : o
  );
  // It goes on top of its new siblings.
  const self = { ...moved.find((o) => o.id === id)!, parentId: newParentId };
  return [...moved.filter((o) => o.id !== id), self];
}

// ---- saved in this browser for now (the database comes with autosave) -------------------------
const key = (id: string) => `studio-design-v1:${id}`;

const KINDS: string[] = ["frame", "component", "instance", "group", "rect", "ellipse", "line", "arrow", "text"];

const isObject = (v: unknown): v is DesignObject =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as DesignObject).id === "string" &&
  KINDS.includes((v as DesignObject).kind) &&
  typeof (v as DesignObject).name === "string" &&
  ["x", "y", "width", "height"].every((k) => Number.isFinite((v as unknown as Record<string, number>)[k]));

export function loadDesign(componentId: string): DesignObject[] {
  try {
    const raw = localStorage.getItem(key(componentId));
    return parseDesign(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

/** Validates saved canvas data (from the database or an older local copy) into usable objects. */
export function parseDesign(parsed: unknown): DesignObject[] {
  try {
    // Version 2 is { version, objects }. The first version was a bare list.
    const legacy = Array.isArray(parsed);
    const list: unknown = legacy ? parsed : (parsed as { objects?: unknown })?.objects;
    if (!Array.isArray(list)) return [];
    const all = list.filter(isObject);
    const ids = new Set(all.map((o) => o.id));
    return all.map((o) => {
      // Forget parents that no longer exist.
      const fixed = o.parentId && !ids.has(o.parentId) ? { ...o, parentId: null } : o;
      // In the first version a component was a live code preview whose code was not saved, so it
      // gets the starter code back. Later components are made of layers.
      if (legacy && fixed.kind === "component" && fixed.code === undefined && !all.some((c) => c.parentId === fixed.id)) {
        return { ...fixed, code: SAMPLE_CODE };
      }
      return fixed;
    });
  } catch {
    return [];
  }
}

export function saveDesign(componentId: string, objects: DesignObject[]) {
  try {
    localStorage.setItem(key(componentId), JSON.stringify({ version: 2, objects }));
  } catch {}
}

// ---- groups ---------------------------------------------------------------------------------------
// A group is a set of members that select and move together. Its box always fits its members, and
// it has no offset of its own: members keep their position in the space around the group.

/** The members of a group all the way down (nested groups included), or the object itself. */
export function leafIds(objects: DesignObject[], id: string): string[] {
  const o = objects.find((x) => x.id === id);
  if (!o) return [];
  if (o.kind !== "group") return [id];
  return objects.filter((c) => c.parentId === id).flatMap((c) => leafIds(objects, c.id));
}

/** The outermost group that contains this object, if any. */
export function outerGroup(objects: DesignObject[], id: string): DesignObject | null {
  let found: DesignObject | null = null;
  let p = byId(objects, objects.find((o) => o.id === id)?.parentId);
  for (let guard = 0; p && guard < 50; guard++) {
    if (p.kind === "group") found = p;
    p = byId(objects, p.parentId);
  }
  return found;
}

/** Keeps every group's box fitted to its members, and drops groups left empty. */
export function syncGroups(objects: DesignObject[]): DesignObject[] {
  if (!objects.some((o) => o.kind === "group")) return objects;
  const depth = (o: DesignObject) => {
    let d = 0;
    for (let p = byId(objects, o.parentId); p && d < 50; p = byId(objects, p.parentId)) d++;
    return d;
  };
  let next = objects;
  const groups = objects.filter((o) => o.kind === "group").sort((a, b) => depth(b) - depth(a));
  for (const g of groups) {
    const kids = next.filter((o) => o.parentId === g.id);
    if (!kids.length) {
      next = next.filter((o) => o.id !== g.id);
      continue;
    }
    const b = boundsOf(kids)!;
    const cur = next.find((o) => o.id === g.id)!;
    if (cur.x !== b.x || cur.y !== b.y || cur.width !== b.width || cur.height !== b.height) {
      next = next.map((o) => (o.id === g.id ? { ...o, x: b.x, y: b.y, width: b.width, height: b.height } : o));
    }
  }
  return next;
}

const rootsOf = (objects: DesignObject[], ids: string[]) => {
  const set = new Set(ids);
  return ids.filter((i) => {
    for (let p = objects.find((o) => o.id === i)?.parentId; p; p = objects.find((o) => o.id === p)?.parentId) {
      if (set.has(p)) return false;
    }
    return true;
  });
};

/** Can the selection be grouped? It needs objects that share a parent (so they sit side by side). */
export function canGroup(objects: DesignObject[], ids: string[]): boolean {
  const roots = rootsOf(objects, ids)
    .map((i) => objects.find((o) => o.id === i))
    .filter(Boolean) as DesignObject[];
  if (roots.length < 2) return false;
  return roots.every((o) => (o.parentId ?? null) === (roots[0].parentId ?? null));
}

export function groupObjects(objects: DesignObject[], ids: string[]): { objects: DesignObject[]; id: string } | null {
  if (!canGroup(objects, ids)) return null;
  const rootIds = new Set(rootsOf(objects, ids));
  const members = objects.filter((o) => rootIds.has(o.id));
  const id = newId();
  const count = objects.filter((o) => o.kind === "group").length + 1;
  const b = boundsOf(members)!;
  const group: DesignObject = {
    id,
    kind: "group",
    name: `Group ${count}`,
    parentId: members[0].parentId ?? null,
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    opacity: 100,
  };
  // The group takes the place of its top-most member in the stacking order.
  const lastIndex = Math.max(...members.map((m) => objects.indexOf(m)));
  const out: DesignObject[] = [];
  objects.forEach((o, i) => {
    if (rootIds.has(o.id)) {
      if (i === lastIndex) out.push(group, ...members.map((m) => ({ ...m, parentId: id })));
    } else out.push(o);
  });
  return { objects: out, id };
}

export function ungroupObjects(objects: DesignObject[], ids: string[]): { objects: DesignObject[]; ids: string[] } | null {
  const groups = objects.filter((o) => ids.includes(o.id) && o.kind === "group");
  if (!groups.length) return null;
  const freed: string[] = [];
  let next = objects;
  for (const g of groups) {
    const members = next.filter((o) => o.parentId === g.id).map((o) => o.id);
    freed.push(...members);
    next = next.filter((o) => o.id !== g.id).map((o) => (o.parentId === g.id ? { ...o, parentId: g.parentId ?? null } : o));
  }
  return { objects: next, ids: freed };
}

/** Moves objects by an offset. A group moves by moving its members. */
export function translateObjects(objects: DesignObject[], ids: string[], dx: number, dy: number): DesignObject[] {
  const leaves = new Set(rootsOf(objects, ids).flatMap((i) => leafIds(objects, i)));
  return objects.map((o) =>
    leaves.has(o.id)
      ? {
          ...o,
          x: o.x + dx,
          y: o.y + dy,
          ...(o.x1 !== undefined ? { x1: o.x1 + dx, y1: o.y1! + dy, x2: o.x2! + dx, y2: o.y2! + dy } : {}),
        }
      : o
  );
}

/** Applies property changes to the given objects. A new position on a group moves its members. */
export function patchObjects(objects: DesignObject[], ids: string[], patch: Partial<DesignObject>): DesignObject[] {
  let next = objects;
  for (const id of ids) {
    const o = next.find((x) => x.id === id);
    if (!o) continue;
    if (o.kind === "group" && (patch.x !== undefined || patch.y !== undefined)) {
      const { x, y, ...rest } = patch;
      next = translateObjects(next, [id], (x ?? o.x) - o.x, (y ?? o.y) - o.y);
      if (Object.keys(rest).length) next = next.map((c) => (c.id === id ? { ...c, ...rest } : c));
    } else {
      next = next.map((c) => (c.id === id ? { ...c, ...patch } : c));
    }
  }
  return next;
}

// ---- components and instances (like a design tool's main components) ---------------------------

/** Instances take the size and look of their main component. Everything that draws or measures uses this. */
export function withInstanceGeometry(objects: DesignObject[]): DesignObject[] {
  return objects.map((o) => {
    if (o.kind !== "instance") return o;
    const main = objects.find((m) => m.id === o.componentId);
    return main
      ? { ...o, width: main.width, height: main.height, fill: main.fill, radius: main.radius, shadow: main.shadow, opacity: main.opacity }
      : o;
  });
}

const cloneWithNewIds = (objects: DesignObject[], rootIds: string[], newParentId: string | null, dx: number, dy: number) => {
  const map = new Map<string, string>();
  const out: DesignObject[] = [];
  const copy = (o: DesignObject, parent: string | null, isRoot: boolean) => {
    const id = newId();
    map.set(o.id, id);
    // A group has no position of its own, so the offset goes to its members instead.
    out.push({
      ...o,
      id,
      parentId: parent,
      ...(isRoot && o.kind !== "group"
        ? {
            x: o.x + dx,
            y: o.y + dy,
            ...(o.x1 !== undefined ? { x1: o.x1 + dx, y1: o.y1! + dy, x2: o.x2! + dx, y2: o.y2! + dy } : {}),
          }
        : {}),
    });
    for (const c of objects.filter((k) => k.parentId === o.id)) copy(c, id, isRoot && o.kind === "group");
  };
  for (const rid of rootIds) {
    const o = objects.find((x) => x.id === rid);
    if (o) copy(o, newParentId, true);
  }
  return { clones: out, rootClones: rootIds.map((r) => map.get(r)).filter(Boolean) as string[] };
};

/** Can the selection be turned into one component? It needs objects that share a parent. */
export function canCreateComponent(objects: DesignObject[], ids: string[]): boolean {
  const sel = objects.filter((o) => ids.includes(o.id));
  if (!sel.length || sel.length !== ids.length) return false;
  if (sel.length === 1 && (sel[0].kind === "component" || sel[0].kind === "instance")) return false;
  if (sel.some((o) => o.kind === "component" || o.kind === "instance")) return false;
  return sel.every((o) => (o.parentId ?? null) === (sel[0].parentId ?? null));
}

/**
 * Turns the selection into a main component. A single frame becomes the component in place.
 * Anything else is wrapped in a new component that fits around it.
 */
export function createComponent(objects: DesignObject[], ids: string[]): { objects: DesignObject[]; id: string } | null {
  const made = createComponentFromLayers(objects, ids);
  // A component always has code: it is written from the layers, so it can be previewed, edited
  // and published straight away.
  return made && { objects: attachCode(made.objects, made.id), id: made.id };
}

/** Room the preview keeps around a component (see #stage in the preview runtime). */
export const CODE_PADDING = 24;

/**
 * Gives a component code written from its layers. The preview frame has padding of its own, so the
 * component's box grows by that much on every side and the layers move in by the same amount:
 * nothing shifts on the canvas, and the preview shows the design exactly as it was drawn.
 */
export function attachCode(objects: DesignObject[], componentId: string): DesignObject[] {
  const comp = objects.find((o) => o.id === componentId);
  if (!comp) return objects;
  const code = layersToCode(objects, componentId);
  const pad = CODE_PADDING;
  const moved = translateObjects(objects, childrenOf(objects, componentId).map((c) => c.id), pad, pad);
  return moved.map((o) =>
    o.id === componentId
      ? { ...o, code, x: o.x - pad, y: o.y - pad, width: o.width + pad * 2, height: o.height + pad * 2 }
      : o
  );
}

/**
 * Writes the component's code again from its layers, with the current layout rules. The component's
 * box already includes the preview's padding (see attachCode), so the layers are measured without
 * it. Only the code changes: the box and the layers stay where they are.
 */
export function rebuildCode(objects: DesignObject[], componentId: string): DesignObject[] {
  const comp = objects.find((o) => o.id === componentId);
  if (!comp) return objects;
  const pad = CODE_PADDING;
  const kids = childrenOf(objects, componentId).map((c) => c.id);
  const unpadded = translateObjects(objects, kids, -pad, -pad).map((o) =>
    o.id === componentId ? { ...o, width: o.width - pad * 2, height: o.height - pad * 2 } : o,
  );
  const code = layersToCode(unpadded, componentId);
  return objects.map((o) => (o.id === componentId ? { ...o, code } : o));
}

function createComponentFromLayers(objects: DesignObject[], ids: string[]): { objects: DesignObject[]; id: string } | null {
  if (!canCreateComponent(objects, ids)) return null;
  const sel = objects.filter((o) => ids.includes(o.id));
  if (sel.length === 1 && sel[0].kind === "frame") {
    const frame = sel[0];
    return { objects: objects.map((o) => (o.id === frame.id ? { ...o, kind: "component" as const } : o)), id: frame.id };
  }
  const parent = sel[0].parentId ?? null;
  const b = boundsOf(sel)!;
  const count = objects.filter((o) => o.kind === "component").length + 1;
  const id = newId();
  const wrapper: DesignObject = {
    id,
    kind: "component",
    name: `Component ${count}`,
    parentId: parent,
    x: b.x,
    y: b.y,
    width: Math.max(b.width, MIN_SIZE),
    height: Math.max(b.height, MIN_SIZE),
    fill: null,
    shadow: null,
  };
  // Everything is shifted so it sits inside the new component. A group has no position of its own,
  // so it is its members that move. The selected objects become the component's children.
  const leaves = new Set(sel.flatMap((o) => leafIds(objects, o.id)));
  const selected = new Set(ids);
  const placed = objects
    .filter((o) => selected.has(o.id) || leaves.has(o.id))
    .map((o) => ({
      ...o,
      ...(leaves.has(o.id)
        ? {
            x: o.x - b.x,
            y: o.y - b.y,
            ...(o.x1 !== undefined ? { x1: o.x1 - b.x, y1: o.y1! - b.y, x2: o.x2! - b.x, y2: o.y2! - b.y } : {}),
          }
        : {}),
      ...(selected.has(o.id) ? { parentId: id } : {}),
    }));
  const rest = objects.filter((o) => !selected.has(o.id) && !leaves.has(o.id));
  return { objects: [...rest, wrapper, ...placed], id };
}

/** A new instance of a component, placed beside the one you are looking at. */
export function createInstance(objects: DesignObject[], componentId: string, at?: { x: number; y: number }): { objects: DesignObject[]; id: string } | null {
  const main = objects.find((o) => o.id === componentId && o.kind === "component");
  if (!main) return null;
  const id = newId();
  const inst: DesignObject = {
    id,
    kind: "instance",
    name: main.name,
    componentId,
    parentId: main.parentId ?? null,
    x: at?.x ?? main.x + main.width + 40,
    y: at?.y ?? main.y,
    width: main.width,
    height: main.height,
  };
  return { objects: [...objects, inst], id };
}

/** Turns an instance back into an ordinary frame with its own copy of the layers. */
export function detachInstance(objects: DesignObject[], instanceId: string): DesignObject[] {
  const inst = objects.find((o) => o.id === instanceId && o.kind === "instance");
  const main = inst && objects.find((o) => o.id === inst.componentId);
  if (!inst) return objects;
  const shown = withInstanceGeometry(objects).find((o) => o.id === instanceId)!;
  const frame: DesignObject = {
    id: inst.id,
    kind: "frame",
    name: inst.name,
    parentId: inst.parentId ?? null,
    x: inst.x,
    y: inst.y,
    width: shown.width,
    height: shown.height,
    fill: main ? main.fill : undefined,
    radius: main?.radius,
    shadow: main?.shadow,
    opacity: main?.opacity,
    code: main?.code,
  };
  const kids = main ? cloneWithNewIds(objects, objects.filter((o) => o.parentId === main.id).map((o) => o.id), inst.id, 0, 0).clones : [];
  return [...objects.filter((o) => o.id !== instanceId), frame, ...kids];
}

/** Duplicates the selection. A component duplicates as an instance of itself. */
export function duplicateObjects(objects: DesignObject[], ids: string[]): { objects: DesignObject[]; ids: string[] } {
  let next = objects;
  const created: string[] = [];
  const set = new Set(ids);
  const roots = ids.filter((i) => {
    for (let p = objects.find((o) => o.id === i)?.parentId; p; p = objects.find((o) => o.id === p)?.parentId) {
      if (set.has(p)) return false;
    }
    return true;
  });
  for (const id of roots) {
    const o = next.find((x) => x.id === id);
    if (!o) continue;
    if (o.kind === "component") {
      const made = createInstance(next, o.id);
      if (made) {
        next = made.objects;
        created.push(made.id);
      }
    } else {
      const { clones, rootClones } = cloneWithNewIds(next, [id], o.parentId ?? null, 24, 24);
      next = [...next, ...clones];
      created.push(...rootClones);
    }
  }
  return { objects: next, ids: created };
}

/** Deletes objects and what is inside them. Instances of a deleted component become plain frames. */
export function removeObjects(objects: DesignObject[], ids: string[]): DesignObject[] {
  const gone = new Set(ids);
  for (const id of ids) descendantIds(objects, id).forEach((d) => gone.add(d));
  let next = objects;
  for (const id of gone) {
    const o = objects.find((x) => x.id === id);
    if (o?.kind !== "component") continue;
    for (const inst of objects.filter((i) => i.kind === "instance" && i.componentId === id && !gone.has(i.id))) {
      next = detachInstance(next, inst.id);
    }
  }
  return next.filter((o) => !gone.has(o.id));
}

// ---- measurement guides ------------------------------------------------------------------------

/**
 * What the moved objects are measured against while you drag them: the smallest thing that holds
 * them, which is their frame or component, or a shape they are over (like text sitting on a
 * rectangle). Returns the combined box of the moved objects and that container.
 */
export function measureTarget(objects: DesignObject[], ids: string[]): { moved: Box; ref: Box; refId: string } | null {
  const movedObjs = objects.filter((o) => ids.includes(o.id));
  if (!movedObjs.length) return null;
  const skip = new Set(ids);
  for (const id of ids) descendantIds(objects, id).forEach((d) => skip.add(d));
  const moved = boundsOf(movedObjs.map((o) => absBox(objects, o)))!;
  const cx = moved.x + moved.width / 2;
  const cy = moved.y + moved.height / 2;

  let best: { o: DesignObject; area: number } | null = null;
  for (const o of objects) {
    // Lines and text hold nothing; everything else can be what you are inside of.
    if (skip.has(o.id) || isLineKind(o.kind) || o.kind === "text" || o.kind === "group") continue;
    const b = absBox(objects, o);
    if (cx < b.x || cx > b.x + b.width || cy < b.y || cy > b.y + b.height) continue;
    const area = b.width * b.height;
    if (!best || area < best.area) best = { o, area };
  }
  return best ? { moved, ref: absBox(objects, best.o), refId: best.o.id } : null;
}
