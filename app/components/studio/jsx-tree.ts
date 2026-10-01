import { javascript } from "@codemirror/lang-javascript";
import type { SyntaxNode } from "@lezer/common";

// A lightweight, error-tolerant parse of the JSX in a file. It powers the Outline tab, element
// selection on the canvas, and writing edits from the Design tab back into the source.

export type JsxAttr = {
  name: string;
  from: number;
  to: number;
  /** Contents of a plain string value, without the quotes. */
  literal?: { from: number; to: number; value: string };
};

export type JsxNodeInfo = {
  /** Index in document order. Also the value of the `data-sid` attribute in the preview. */
  sid: number;
  tag: string;
  parent: number | null;
  depth: number;
  line: number;
  from: number;
  to: number;
  /** End of the tag name in the opening tag: where new attributes are inserted. */
  nameTo: number;
  openFrom: number;
  attrs: JsxAttr[];
  /** className written as a plain string ("a b"). When absent and `hasClassName` is true, it is computed. */
  classAttr: { from: number; to: number; value: string } | null;
  hasClassName: boolean;
  /** Set when the only child is plain text. */
  text: { from: number; to: number; value: string } | null;
};

const parser = javascript({ jsx: true, typescript: true }).language.parser;

export function parseJsx(code: string): JsxNodeInfo[] {
  const nodes: JsxNodeInfo[] = [];
  let tree;
  try {
    tree = parser.parse(code);
  } catch {
    return nodes;
  }

  const lineStarts: number[] = [0];
  for (let i = 0; i < code.length; i++) if (code[i] === "\n") lineStarts.push(i + 1);
  const lineOf = (pos: number) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };

  const walk = (node: SyntaxNode, parent: number | null, depth: number) => {
    for (let c = node.firstChild; c; c = c.nextSibling) {
      if (c.name !== "JSXElement") {
        walk(c, parent, depth);
        continue;
      }
      const open =
        c.getChild("JSXOpenTag") ?? c.getChild("JSXSelfClosingTag") ?? c.getChild("JSXFragmentTag");
      const isFragment = !open || open.name === "JSXFragmentTag";
      if (isFragment) {
        walk(c, parent, depth);
        continue;
      }

      const tagMatch = /^[A-Za-z_$][\w$.:-]*/.exec(code.slice(open.from + 1, open.to));
      const tag = tagMatch?.[0] ?? "?";
      const sid = nodes.length;

      const attrs: JsxAttr[] = [];
      for (let a = open.firstChild; a; a = a.nextSibling) {
        if (a.name !== "JSXAttribute") continue;
        const nameNode = a.firstChild;
        if (!nameNode) continue;
        const attr: JsxAttr = {
          name: code.slice(nameNode.from, nameNode.to),
          from: a.from,
          to: a.to,
        };
        const val = a.getChild("JSXAttributeValue");
        if (val && /^["']/.test(code[val.from])) {
          attr.literal = {
            from: val.from + 1,
            to: val.to - 1,
            value: code.slice(val.from + 1, val.to - 1),
          };
        }
        attrs.push(attr);
      }
      const classNode = attrs.find((a) => a.name === "className");

      // Sole text child, for the Text field in the Design tab.
      let text: JsxNodeInfo["text"] = null;
      // Direct children between the opening and closing tags. (Nodes are compared by position: the
      // parser returns a fresh object each time you ask for the same node.)
      const content: SyntaxNode[] = [];
      for (let k = c.firstChild; k; k = k.nextSibling) {
        if (k.from === open.from && k.to === open.to) continue;
        if (k.name === "JSXCloseTag") continue;
        content.push(k);
      }
      if (content.length === 1 && content[0].name === "JSXText") {
        const raw = code.slice(content[0].from, content[0].to);
        const trimmed = raw.trim();
        if (trimmed) {
          const lead = raw.length - raw.trimStart().length;
          text = {
            from: content[0].from + lead,
            to: content[0].from + lead + trimmed.length,
            value: trimmed,
          };
        }
      }

      nodes.push({
        sid,
        tag,
        parent,
        depth,
        line: lineOf(c.from),
        from: c.from,
        to: c.to,
        nameTo: open.from + 1 + tag.length,
        openFrom: open.from,
        attrs,
        classAttr: classNode?.literal ?? null,
        hasClassName: !!classNode,
        text,
      });
      walk(c, sid, depth + 1);
    }
  };
  walk(tree.topNode, null, 0);
  return nodes;
}

export type Edit = { from: number; to: number; insert: string };

export function applyEdits(code: string, edits: Edit[]): string {
  return [...edits]
    .sort((a, b) => b.from - a.from)
    .reduce((acc, e) => acc.slice(0, e.from) + e.insert + acc.slice(e.to), code);
}

// Adds `data-sid` to every element so the preview can report which one is under the pointer.
// Only used for the copy of the code sent to the preview; the user's code is never changed.
export function instrument(code: string, nodes: JsxNodeInfo[]): string {
  return applyEdits(
    code,
    nodes.map((n) => ({ from: n.nameTo, to: n.nameTo, insert: ` data-sid="${n.sid}"` }))
  );
}

export function setText(code: string, node: JsxNodeInfo, value: string): string | null {
  if (!node.text) return null;
  // Braces and angle brackets would break the JSX, so those are written as a string expression.
  const insert = /[{}<>]/.test(value) ? `{${JSON.stringify(value)}}` : value;
  return applyEdits(code, [{ from: node.text.from, to: node.text.to, insert }]);
}
