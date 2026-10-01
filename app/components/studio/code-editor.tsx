// CodeMirror 6 editor. Loaded lazily and only in the browser (see RightPanel).
import { javascript } from "@codemirror/lang-javascript";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { basicSetup } from "codemirror";

import { editorCompletions } from "./completions";
import { useEffect, useRef } from "react";

// Colors come from the app's tokens, so the editor follows light and dark mode.
const ink = (token: string, mix = 75) =>
  `color-mix(in srgb, var(--${token}) ${mix}%, var(--foreground))`;

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.modifier, t.operatorKeyword], color: ink("secondary") },
  { tag: [t.string, t.special(t.string)], color: ink("primary", 70) },
  { tag: [t.number, t.bool, t.null], color: ink("primary", 70) },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--muted-foreground)", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.definition(t.variableName)], color: "var(--foreground)", fontWeight: "600" },
  { tag: [t.tagName, t.typeName, t.className], color: ink("secondary", 85) },
  { tag: [t.attributeName, t.propertyName], color: "var(--foreground)" },
  { tag: [t.punctuation, t.bracket, t.operator], color: "var(--muted-foreground)" },
]);

const lightTheme = (dark: boolean) =>
  EditorView.theme(
    {
      "&": { height: "100%", color: "var(--foreground)", backgroundColor: "var(--background)", fontSize: "13px" },
      ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.65" },
      ".cm-content": { caretColor: "var(--foreground)", padding: "12px 0" },
      "&.cm-focused": { outline: "none" },
      "&.cm-focused .cm-cursor": { borderLeftColor: "var(--foreground)" },
      ".cm-gutters": { backgroundColor: "var(--background)", color: "var(--muted-foreground)", border: "none" },
      ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--muted) 55%, transparent)" },
      ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--foreground)" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
        backgroundColor: "color-mix(in srgb, var(--secondary) 28%, transparent) !important",
      },
      ".cm-matchingBracket": { backgroundColor: "color-mix(in srgb, var(--secondary) 25%, transparent)", outline: "none" },
      ".cm-panels, .cm-tooltip": { backgroundColor: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)" },
    },
    { dark }
  );

const isDark = () => document.documentElement.classList.contains("dark");

export default function CodeEditor({
  value,
  onChange,
  label = "Code editor",
  reveal,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  /** Move the cursor here and scroll it into view. Change `nonce` to trigger again. */
  reveal?: { pos: number; nonce: number } | null;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!host.current) return;
    const theme = new Compartment();
    const js = javascript({ jsx: true, typescript: true });
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          js,
          // On top of JavaScript's own suggestions: Tailwind classes, JSX, and imports.
          js.language.data.of({ autocomplete: editorCompletions }),
          syntaxHighlighting(highlight),
          theme.of(lightTheme(isDark())),
          EditorView.contentAttributes.of({ "aria-label": label }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current(u.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = v;

    // Follow the app's light/dark mode.
    const mo = new MutationObserver(() =>
      v.dispatch({ effects: theme.reconfigure(lightTheme(isDark())) })
    );
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      mo.disconnect();
      v.destroy();
      view.current = null;
    };
    // The editor is created once; `value` is synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the document in sync when `value` changes from outside (the Design tab, restoring a
  // version). Only the changed span is replaced, so the cursor and undo history stay intact.
  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const doc = v.state.doc.toString();
    if (doc === value) return;
    let start = 0;
    while (start < doc.length && start < value.length && doc[start] === value[start]) start++;
    let endOld = doc.length;
    let endNew = value.length;
    while (endOld > start && endNew > start && doc[endOld - 1] === value[endNew - 1]) {
      endOld--;
      endNew--;
    }
    v.dispatch({ changes: { from: start, to: endOld, insert: value.slice(start, endNew) } });
  }, [value]);

  useEffect(() => {
    const v = view.current;
    if (!v || !reveal) return;
    const pos = Math.min(reveal.pos, v.state.doc.length);
    v.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: "center" }) });
  }, [reveal]);

  return <div ref={host} className="h-full min-h-0 overflow-hidden" />;
}
