// Suggestions for the code editor, beyond what JavaScript itself offers: Tailwind class names, JSX
// tags and attributes, and what the preview can import (including adding the import for you).
import { syntaxTree } from "@codemirror/language";
import { startCompletion, type Completion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import type { EditorState } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";

import { importableModules } from "../../studio-preview/modules";

// ---- helpers ----------------------------------------------------------------------------------------

const text = (state: EditorState, n: SyntaxNode) => state.sliceDoc(n.from, n.to);
const ancestor = (n: SyntaxNode | null, name: string): SyntaxNode | null => {
  for (let x = n; x; x = x.parent) if (x.name === name) return x;
  return null;
};
/** `~/` and `@/` both mean the project, so a module is the same under either. */
const canonical = (spec: string) => spec.replace(/^~\//, "@/");

// ---- Tailwind classes -----------------------------------------------------------------------------------

type TailwindData = { classes: Completion[]; variants: Completion[] };
let tailwind: Promise<TailwindData> | null = null;
// 25,000 names: loaded the first time they're wanted, not with the editor.
const loadTailwind = () =>
  (tailwind ??= import("./tailwind-classes.json").then((m) => {
    const data = (m.default ?? m) as { classes: string[]; variants: string[] };
    // Negative values (-mt-1) last, and the classes most components use first.
    const ordered = [...data.classes.filter((c) => !c.startsWith("-")), ...data.classes.filter((c) => c.startsWith("-"))];
    return {
      classes: ordered.map((label) => ({ label, type: "class", boost: COMMON.has(label) ? 1 : 0 })),
      variants: data.variants.map((v) => ({ label: `${v}:`, type: "keyword", detail: "variant", boost: -1 })),
    };
  }));

const COMMON = new Set(
  "flex grid hidden block inline-flex relative absolute items-center justify-center justify-between flex-col gap-2 gap-4 p-2 p-4 p-6 px-4 py-2 m-0 mx-auto w-full h-full min-h-0 rounded-md rounded-lg rounded-xl border bg-background bg-card bg-primary bg-muted text-foreground text-primary-foreground text-muted-foreground text-sm text-base text-lg font-medium font-semibold shadow-sm transition hover:bg-muted overflow-hidden".split(" "),
);

const CLASS_FUNCTIONS = new Set(["cn", "clsx", "twMerge", "cva", "tv"]);

/** Is this string a list of Tailwind classes: a className, or an argument to cn() and friends? */
function inClassList(state: EditorState, node: SyntaxNode): boolean {
  if (!["JSXAttributeValue", "String", "TemplateString"].includes(node.name)) return false;
  for (let x: SyntaxNode | null = node.parent; x; x = x.parent) {
    if (x.name === "JSXAttribute") {
      const name = x.firstChild ? text(state, x.firstChild) : "";
      return name === "className" || name === "class";
    }
    if (x.name === "CallExpression") {
      const callee = x.firstChild ? text(state, x.firstChild) : "";
      if (CLASS_FUNCTIONS.has(callee)) return true;
    }
  }
  return false;
}

async function tailwindSource(context: CompletionContext): Promise<CompletionResult | null> {
  const node = syntaxTree(context.state).resolveInner(context.pos, -1);
  if (!inClassList(context.state, node)) return null;
  // The class being typed: from the last space (or the opening quote) to the cursor.
  const before = context.state.sliceDoc(node.from + 1, context.pos);
  const token = /[^\s"'`{}]*$/.exec(before)![0];
  if (!context.explicit && token.length === 0) return null;
  const start = context.pos - token.length;
  const data = await loadTailwind();
  // Variants chain in front: "md:hover:bg-red-500". Suggestions continue after the last colon.
  const colon = token.lastIndexOf(":");
  const from = colon < 0 ? start : start + colon + 1;
  return {
    from,
    options: colon < 0 ? [...data.variants, ...data.classes] : data.classes,
    validFor: /^[^\s:"'`{}]*$/,
  };
}

// ---- JSX tags and attributes ------------------------------------------------------------------------------

const HTML_TAGS = ["a", "article", "aside", "button", "code", "div", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "img", "input", "label", "li", "main", "nav", "ol", "option", "p", "pre", "section", "select", "small", "span", "strong", "svg", "table", "tbody", "td", "textarea", "th", "thead", "tr", "ul"];

const attr = (label: string, apply: string, cursorBack: number, detail?: string): Completion => ({
  label,
  type: "property",
  detail,
  apply: (view: EditorView, _c: Completion, from: number, to: number) => {
    view.dispatch({ changes: { from, to, insert: apply }, selection: { anchor: from + apply.length - cursorBack } });
    // Inside the quotes already: offer the class names straight away.
    if (label === "className") startCompletion(view);
  },
});
const ATTRIBUTES: Completion[] = [
  attr("className", 'className=""', 1),
  attr("id", 'id=""', 1),
  attr("style", "style={{}}", 2),
  attr("onClick", "onClick={() => {}}", 1),
  attr("onChange", "onChange={(e) => {}}", 1),
  attr("onSubmit", "onSubmit={(e) => {}}", 1),
  attr("onKeyDown", "onKeyDown={(e) => {}}", 1),
  attr("type", 'type=""', 1),
  attr("value", "value={}", 1),
  attr("defaultValue", 'defaultValue=""', 1),
  attr("checked", "checked", 0),
  attr("disabled", "disabled", 0),
  attr("placeholder", 'placeholder=""', 1),
  attr("name", 'name=""', 1),
  attr("htmlFor", 'htmlFor=""', 1),
  attr("href", 'href=""', 1),
  attr("src", 'src=""', 1),
  attr("alt", 'alt=""', 1),
  attr("title", 'title=""', 1),
  attr("role", 'role=""', 1),
  attr("tabIndex", "tabIndex={0}", 2),
  attr("aria-label", 'aria-label=""', 1),
  attr("aria-hidden", 'aria-hidden="true"', 0),
  attr("aria-describedby", 'aria-describedby=""', 1),
  attr("aria-expanded", "aria-expanded={}", 1),
  attr("aria-live", 'aria-live="polite"', 0),
  attr("data-state", 'data-state=""', 1),
].map((c) => ({ ...c, boost: c.label === "className" ? 2 : 0 }));

// ---- imports --------------------------------------------------------------------------------------------------

type Imported = { names: Set<string> };
/** The names this file already imports, so they aren't suggested for importing again. */
function importedNames(doc: string): Imported {
  const names = new Set<string>();
  for (const m of doc.matchAll(/import\s+([^;]*?)\s+from\s+["'][^"']+["']/g)) {
    for (const part of m[1].replace(/[{}]/g, ",").split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.replace(/^\*\s+as\s+/, "").trim();
      if (name) names.add(name);
    }
  }
  return { names };
}

/** Replace `from..to` with `name`, and make sure `name` is imported from `spec`. */
function applyAutoImport(spec: string, name: string) {
  return (view: EditorView, _c: Completion, from: number, to: number) => {
    const doc = view.state.doc.toString();
    const existing = [...doc.matchAll(/import\s*\{([^}]*)\}\s*from\s*(["'])([^"']+)\2;?/g)].find((m) => canonical(m[3]) === canonical(spec));
    const changes: { from: number; to?: number; insert: string }[] = [{ from, to, insert: name }];
    let shift = 0;
    if (existing && existing.index !== undefined) {
      // Add to the braces of the import that is already there.
      const open = existing.index + existing[0].indexOf("{") + 1;
      const inside = existing[1];
      const at = inside.trim() ? open + inside.trimEnd().length : open;
      const insert = inside.trim() ? `, ${name}` : ` ${name} `;
      changes.push({ from: at, insert });
      if (at <= from) shift = insert.length;
    } else {
      const line = `import { ${name} } from "${spec}";\n`;
      changes.push({ from: 0, insert: line });
      shift = line.length;
    }
    view.dispatch({ changes, selection: { anchor: from + name.length + shift } });
  };
}

let modules: Record<string, string[]> | null = null;
const getModules = () => (modules ??= importableModules());

/** Every name the preview lets you import, as a suggestion that also adds the import. */
function importCandidates(doc: string, kind: "components" | "all"): Completion[] {
  const { names } = importedNames(doc);
  const out: Completion[] = [];
  for (const [spec, exports] of Object.entries(getModules())) {
    for (const name of exports) {
      if (names.has(name)) continue;
      if (kind === "components" && !/^[A-Z]/.test(name)) continue;
      out.push({ label: name, type: /^[A-Z]/.test(name) ? "class" : "function", detail: `import from ${spec}`, boost: -2, apply: applyAutoImport(spec, name) });
    }
  }
  return out;
}

// ---- the source -------------------------------------------------------------------------------------------------

export async function editorCompletions(context: CompletionContext): Promise<CompletionResult | null> {
  const { state, pos } = context;
  const node = syntaxTree(state).resolveInner(pos, -1);

  // Tailwind class names inside className="…" and cn("…").
  const classes = await tailwindSource(context);
  if (classes) return classes;

  // import "…": which modules can be imported.
  if (node.name === "String" && node.parent?.name === "ImportDeclaration") {
    return { from: node.from + 1, options: Object.keys(getModules()).map((label) => ({ label, type: "module" })), validFor: /^[^"']*$/ };
  }

  // import { … }: the names in that module (or in any, before the module has been typed).
  if (node.name === "VariableDefinition" && node.parent?.name === "ImportGroup") {
    const decl = ancestor(node, "ImportDeclaration");
    const source = decl?.getChild("String");
    const spec = source ? canonical(text(state, source).slice(1, -1)) : null;
    const word = context.matchBefore(/\w*/);
    if (!word) return null;
    const pick = spec ? { [spec]: getModules()[spec] ?? [] } : getModules();
    const options = Object.entries(pick).flatMap(([s, names]) => names.map((label): Completion => ({ label, type: "variable", detail: spec ? undefined : s })));
    return { from: word.from, options, validFor: /^\w*$/ };
  }

  // JSX: a tag name (<Bu…) or an attribute name (<div cla…).
  if (node.name === "JSXIdentifier" || node.name === "JSXStartTag") {
    const word = context.matchBefore(/[\w.-]*/);
    if (!word || (!context.explicit && word.from === word.to && node.name !== "JSXStartTag")) return null;
    const inAttribute = node.parent?.name === "JSXAttribute";
    if (inAttribute) {
      // Only the attribute's name, not a value.
      if (node.parent!.firstChild?.from !== node.from) return null;
      return { from: word.from, options: ATTRIBUTES, validFor: /^[\w-]*$/ };
    }
    const isClosing = node.parent?.name === "JSXCloseTag";
    if (isClosing) return null;
    const doc = state.doc.toString();
    const local = [...importedNames(doc).names].filter((n) => /^[A-Z]/.test(n)).map((label): Completion => ({ label, type: "class", boost: 1 }));
    const tags = HTML_TAGS.map((label): Completion => ({ label, type: "keyword" }));
    return { from: word.from, options: [...tags, ...local, ...importCandidates(doc, "components")], validFor: /^[\w.]*$/ };
  }

  // Elsewhere in code: names you can import (useState, cn, an icon), added with their import.
  if (node.name === "VariableName") {
    const word = context.matchBefore(/\w+/);
    if (!word || (!context.explicit && word.to - word.from < 2)) return null;
    return { from: word.from, options: importCandidates(state.doc.toString(), "all"), validFor: /^\w*$/ };
  }
  return null;
}
