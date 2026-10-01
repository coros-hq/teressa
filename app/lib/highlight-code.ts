import { javascript } from "@codemirror/lang-javascript";
import { highlightTree, tagHighlighter, tags as t } from "@lezer/highlight";

export type Token = { text: string; className?: string };

// Same parser the studio's code editor uses, so the colours mean the same thing in both places.
// The classes (tok-*) are styled in app.css from the theme's own colours.
const parser = javascript({ jsx: true, typescript: true }).language.parser;
const highlighter = tagHighlighter([
  { tag: [t.keyword, t.modifier, t.operatorKeyword, t.controlKeyword, t.moduleKeyword], class: "tok-keyword" },
  { tag: [t.string, t.special(t.string), t.regexp], class: "tok-string" },
  { tag: [t.number, t.bool, t.null], class: "tok-number" },
  { tag: [t.comment, t.lineComment, t.blockComment], class: "tok-comment" },
  { tag: [t.function(t.variableName), t.definition(t.variableName)], class: "tok-function" },
  { tag: [t.tagName, t.typeName, t.className], class: "tok-tag" },
  { tag: [t.attributeName, t.propertyName], class: "tok-attr" },
  { tag: [t.punctuation, t.bracket, t.operator], class: "tok-punct" },
]);

/** The code split into lines, each a list of pieces with the class that colours it (if any). */
export function highlightLines(code: string): Token[][] {
  const lines: Token[][] = [[]];
  const push = (text: string, className?: string) => {
    const parts = text.split("\n");
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ text: part, className });
    });
  };
  let pos = 0;
  highlightTree(parser.parse(code), highlighter, (from, to, cls) => {
    if (from > pos) push(code.slice(pos, from));
    push(code.slice(from, to), cls);
    pos = to;
  });
  if (pos < code.length) push(code.slice(pos));
  return lines;
}
