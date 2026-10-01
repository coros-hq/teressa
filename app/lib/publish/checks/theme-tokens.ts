import type { CheckResult, Finding } from "./types.ts";

// Check 3: colors should come from the theme (bg-primary, text-muted-foreground, var(--border))
// so a component follows light and dark mode and the owner's brand. This is a text scan, so it
// can't see colors built at runtime or named colors in inline styles ("red").
//
// A line carrying the comment `teressa-ignore-color` is exempt: its findings become warnings.
// Use it for colors that must stay fixed, such as a brand logo.

export const IGNORE_MARKER = "teressa-ignore-color";

const PREFIXES =
  "bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|fill|stroke|from|via|to|outline|decoration|divide|shadow|accent|caret|placeholder";
const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const COLOR_FN = "rgba?|hsla?|hwb|oklch|oklab|lab|lch|color";

// Tailwind arbitrary color, e.g. bg-[#fff] or text-[rgb(1,2,3)] or border-[color:#abc]
const ARBITRARY = new RegExp(
  `(?<![\\w-])(?:[\\w-]+:)*(?:${PREFIXES})-\\[(?:color:)?(?:#[0-9a-fA-F]{3,8}|(?:${COLOR_FN})\\([^\\]]*)\\]`,
  "g",
);
const HEX = /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![\w-])/g;
const FUNC = new RegExp(`(?<![\\w-])(?:${COLOR_FN})\\(([^)]*)\\)`, "g");
const PALETTE_CLASS = new RegExp(
  `(?<![\\w-])(?:[\\w-]+:)*(?:${PREFIXES})-(?:(?:${PALETTE})-(?:50|[1-9]00|950)|white|black)(?:/\\d+)?(?![\\w-])`,
  "g",
);

type Hit = { rule: string; message: string; index: number; text: string };

export function checkThemeTokens(code: string): CheckResult {
  const lines = blankComments(code);
  const findings: Finding[] = [];

  lines.clean.forEach((text, i) => {
    const hits: Hit[] = [];
    const taken: [number, number][] = [];
    const add = (rule: string, message: string, m: RegExpExecArray) => {
      const range: [number, number] = [m.index, m.index + m[0].length];
      if (taken.some(([a, b]) => range[0] < b && range[1] > a)) return; // already reported
      taken.push(range);
      hits.push({ rule, message, index: m.index, text: m[0] });
    };

    for (const m of text.matchAll(ARBITRARY))
      add("arbitrary-color", `"${m[0]}" is a fixed color written inside a class. Use a theme color such as bg-primary instead.`, m as RegExpExecArray);
    for (const m of text.matchAll(PALETTE_CLASS))
      add("palette-color", `"${m[0]}" skips the theme. Use a theme color such as bg-primary or text-muted-foreground so it follows light and dark mode.`, m as RegExpExecArray);
    for (const m of text.matchAll(HEX))
      add("hex-color", `${m[0]} is a fixed color. Use a theme color or var(--token) instead.`, m as RegExpExecArray);
    for (const m of text.matchAll(FUNC)) {
      if (/var\(/.test(m[1])) continue; // built from theme variables: fine
      add("color-function", `${m[0].slice(0, 40)} is a fixed color. Use a theme color or var(--token) instead.`, m as RegExpExecArray);
    }

    const exempt = lines.ignored.has(i);
    for (const h of hits.sort((a, b) => a.index - b.index)) {
      findings.push({
        rule: h.rule,
        line: i + 1,
        severity: exempt ? "warning" : "error",
        message: exempt ? `${h.message} (Allowed by ${IGNORE_MARKER}.)` : h.message,
        snippets: [h.text],
      });
    }
  });

  const failed = findings.some((f) => f.severity === "error");
  return { id: "tokens", status: failed ? "failed" : "passed", findings };
}

// Splits into lines with comments blanked out (so "// #fff is white" isn't a finding), and notes
// which lines carry the ignore marker. Tracks quotes so "//" inside a string isn't a comment.
function blankComments(code: string): { clean: string[]; ignored: Set<number> } {
  const out: string[] = [];
  const ignored = new Set<number>();
  let state: "code" | "'" | '"' | "`" | "line" | "block" = "code";
  let line = 0;
  let cur = "";
  let raw = "";
  const flush = () => {
    out.push(cur);
    if (raw.includes(IGNORE_MARKER)) ignored.add(line);
    cur = "";
    raw = "";
    line++;
  };

  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    const n = code[i + 1];
    if (c === "\n") {
      if (state === "line") state = "code";
      flush();
      continue;
    }
    raw += c;
    if (state === "code") {
      if (c === "/" && n === "/") { state = "line"; cur += " "; continue; }
      if (c === "/" && n === "*") { state = "block"; cur += " "; continue; }
      if (c === "'" || c === '"' || c === "`") state = c;
      cur += c;
    } else if (state === "line") {
      cur += " ";
    } else if (state === "block") {
      if (c === "*" && n === "/") { cur += "  "; raw += n; i++; state = "code"; } else cur += " ";
    } else {
      if (c === "\\") { cur += c + (n ?? ""); raw += n ?? ""; i++; continue; }
      if (c === state) state = "code";
      cur += c;
    }
  }
  flush();
  return { clean: out, ignored };
}
