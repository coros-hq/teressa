import { applyEdits, type JsxNodeInfo } from "./jsx-tree";

// Each group is a set of mutually exclusive Tailwind classes (like `p-*` or `rounded-*`). The Design
// tab swaps the one class in a group. Only plain, unprefixed classes are touched.

export type ClassGroup = {
  id: string;
  label: string;
  match: RegExp;
  /** Set for color groups: the Tailwind prefix, and that custom colors are allowed. */
  color?: { prefix: "text" | "bg" };
  options: { value: string; label: string; swatch?: string }[];
};

const opts = (values: string[], label = (v: string) => v) =>
  values.map((value) => ({ value, label: label(value) }));

const tokenOptions = (prefix: string, tokens: string[]) =>
  tokens.map((t) => ({ value: `${prefix}-${t}`, label: t, swatch: `var(--${t})` }));

const COLOR_TOKENS = [
  "foreground",
  "muted-foreground",
  "primary",
  "secondary",
  "destructive",
  "card-foreground",
  "background",
];
const FILL_TOKENS = ["background", "card", "muted", "accent", "primary", "secondary", "destructive", "popover"];

const scale = (prefix: string, steps: number[]) => opts(steps.map((n) => `${prefix}-${n}`));

export const GROUPS: Record<string, ClassGroup> = {
  textSize: {
    id: "textSize",
    label: "Size",
    match: /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)$/,
    options: opts(["text-xs", "text-sm", "text-base", "text-lg", "text-xl", "text-2xl", "text-3xl", "text-4xl", "text-5xl"]),
  },
  fontWeight: {
    id: "fontWeight",
    label: "Weight",
    match: /^font-(normal|medium|semibold|bold)$/,
    options: opts(["font-normal", "font-medium", "font-semibold", "font-bold"]),
  },
  textAlign: {
    id: "textAlign",
    label: "Align",
    match: /^text-(left|center|right|justify)$/,
    options: opts(["text-left", "text-center", "text-right", "text-justify"]),
  },
  textColor: {
    id: "textColor",
    label: "Color",
    match: /^text-(foreground|muted-foreground|primary|secondary|destructive|card-foreground|background|primary-foreground|secondary-foreground|\[#[0-9a-fA-F]{3,8}\])$/,
    color: { prefix: "text" },
    options: tokenOptions("text", COLOR_TOKENS),
  },
  fill: {
    id: "fill",
    label: "Fill",
    match: /^bg-(background|card|muted|accent|primary|secondary|destructive|popover|transparent|\[#[0-9a-fA-F]{3,8}\])$/,
    color: { prefix: "bg" },
    options: [...tokenOptions("bg", FILL_TOKENS), { value: "bg-transparent", label: "transparent" }],
  },
  radius: {
    id: "radius",
    label: "Radius",
    match: /^rounded(-(none|sm|md|lg|xl|2xl|3xl|4xl|full))?$/,
    options: opts(
      ["rounded-none", "rounded-sm", "rounded-md", "rounded-lg", "rounded-xl", "rounded-2xl", "rounded-3xl", "rounded-4xl", "rounded-full"]
    ),
  },
  border: {
    id: "border",
    label: "Border",
    match: /^border(-(0|2|4))?$/,
    options: [
      { value: "border-0", label: "none" },
      { value: "border", label: "1px" },
      { value: "border-2", label: "2px" },
      { value: "border-4", label: "4px" },
    ],
  },
  padding: {
    id: "padding",
    label: "Padding",
    match: /^p-(\d+(\.\d+)?|px)$/,
    options: scale("p", [0, 1, 2, 3, 4, 5, 6, 8, 10, 12]),
  },
  gap: {
    id: "gap",
    label: "Gap",
    match: /^gap-(\d+(\.\d+)?|px)$/,
    options: scale("gap", [0, 1, 2, 3, 4, 5, 6, 8, 10, 12]),
  },
  width: {
    id: "width",
    label: "Width",
    match: /^w-(auto|fit|full|screen|\d+(\.\d+)?|px|\[[^\]]+\])$/,
    options: [
      { value: "w-auto", label: "auto" },
      { value: "w-fit", label: "fit" },
      { value: "w-full", label: "full" },
      ...scale("w", [16, 24, 32, 48, 64, 80, 96]),
    ],
  },
  height: {
    id: "height",
    label: "Height",
    match: /^h-(auto|fit|full|screen|\d+(\.\d+)?|px|\[[^\]]+\])$/,
    options: [
      { value: "h-auto", label: "auto" },
      { value: "h-fit", label: "fit" },
      { value: "h-full", label: "full" },
      ...scale("h", [8, 10, 12, 16, 24, 32, 48, 64]),
    ],
  },
};

export function currentClass(node: JsxNodeInfo, group: ClassGroup): string | null {
  if (!node.classAttr) return null;
  const found = node.classAttr.value.split(/\s+/).filter((c) => group.match.test(c));
  return found.length ? found[found.length - 1] : null;
}

// Swaps the class in `group` for `value` (or removes it when `value` is null). Returns the new code,
// or null when the element's classes are computed in code and can't be edited safely.
export function setClass(
  code: string,
  node: JsxNodeInfo,
  group: ClassGroup,
  value: string | null
): string | null {
  if (node.classAttr) {
    const parts = node.classAttr.value.split(/\s+/).filter(Boolean);
    const at = parts.findIndex((c) => group.match.test(c));
    const rest = parts.filter((c) => !group.match.test(c));
    if (value) rest.splice(at === -1 ? rest.length : Math.min(at, rest.length), 0, value);
    return applyEdits(code, [
      { from: node.classAttr.from, to: node.classAttr.to, insert: rest.join(" ") },
    ]);
  }
  if (node.hasClassName) return null;
  if (!value) return code;
  return applyEdits(code, [{ from: node.nameTo, to: node.nameTo, insert: ` className="${value}"` }]);
}
