import assert from "node:assert/strict";
import { test } from "node:test";

import { checkCompile } from "../../lib/publish/checks/compile.ts";
import { checkThemeTokens } from "../../lib/publish/checks/theme-tokens.ts";
import type { DesignObject } from "./design-model";
import { hasLayers, layersToCode } from "./layers-to-code.ts";

const base = { x: 0, y: 0, width: 100, height: 40 };
const comp = (extra: Partial<DesignObject> = {}): DesignObject => ({ id: "c", kind: "component", name: "Button 1", width: 160, height: 48, x: 0, y: 0, fill: null, ...extra });
const rect = (extra: Partial<DesignObject> = {}): DesignObject => ({ id: "r", kind: "rect", name: "Rect", parentId: "c", ...base, width: 160, height: 48, fill: "var(--primary)", radius: 8, ...extra });
const text = (extra: Partial<DesignObject> = {}): DesignObject => ({ id: "t", kind: "text", name: "Label", parentId: "c", ...base, width: 160, height: 24, y: 12, text: "Save", fill: "var(--primary-foreground)", fontSize: 16, fontWeight: 600, textAlign: "center", ...extra });

test("a button made of a rectangle and a label is a box that holds its label, centered", () => {
  const code = layersToCode([comp({ width: 160, height: 48 }), rect(), text({ y: 12, height: 24 })], "c");
  assert.match(code, /export default function Button1\(\)/);
  assert.match(code, /bg-primary/);
  assert.match(code, /text-primary-foreground/);
  assert.match(code, /\{"Save"\}/);
  assert.match(code, /rounded-\[8px\]/);
  assert.match(code, /text-\[16px\] font-semibold leading-tight text-center/);
  // the label sits inside the rectangle and is centered by the layout, not placed by pixels
  assert.match(code, /bg-primary[^"]*flex flex-col justify-center/);
  assert.doesNotMatch(code, /absolute|left-\[|top-\[/);
});

test("styling is Tailwind classes only: no style attribute anywhere", () => {
  const shadow = { x: 0, y: 4, blur: 12, spread: 0, color: "#00000040" };
  const objects: DesignObject[] = [
    comp({ fill: "var(--background)", shadow }), rect({ stroke: "var(--foreground)", strokeWidth: 2, opacity: 50, shadow }),
    text({ shadow }), { id: "a", kind: "arrow", name: "A", parentId: "c", x: 0, y: 0, width: 60, height: 30, x1: 0, y1: 0, x2: 60, y2: 30, stroke: "var(--foreground)", opacity: 80 },
  ];
  const code = layersToCode(objects, "c");
  assert.doesNotMatch(code, /style=/);
  assert.match(code, /border-\[2px\] border-solid border-foreground/);
  assert.match(code, /opacity-\[0\.5\]/);
  assert.match(code, /shadow-\[0px_4px_12px_0px_color-mix\(in_srgb,_black_25%,_transparent\)\]/);
  assert.match(code, /stroke-foreground/);
  assert.equal(checkCompile(code).status, "passed", code);
});

test("the code compiles and uses only theme colors, so it can be published", () => {
  const code = layersToCode([comp(), rect(), text()], "c");
  assert.equal(checkCompile(code).status, "passed");
  assert.equal(checkThemeTokens(code).status, "passed");
  assert.deepEqual(checkThemeTokens(code).findings, []);
});

test("default translucent black shadows don't count as fixed colors", () => {
  const shadow = { x: 0, y: 1, blur: 3, spread: 0, color: "#00000033" };
  const code = layersToCode([comp({ fill: "var(--background)", shadow }), rect({ shadow })], "c");
  assert.match(code, /color-mix\(in_srgb,_black_20%,_transparent\)/);
  assert.deepEqual(checkThemeTokens(code).findings, []);
});

test("a hand-typed color is kept, and shows as a warning rather than blocking", () => {
  const code = layersToCode([comp(), rect({ fill: "#ff00aa" })], "c");
  assert.match(code, /"bg-\[#ff00aa\]", \/\/ teressa-ignore-color/);
  assert.match(code, /import \{ cn \} from "@\/lib\/utils";/);
  const r = checkThemeTokens(code);
  assert.equal(r.status, "passed");
  assert.equal(r.findings[0].severity, "warning");
  assert.equal(checkCompile(code).status, "passed");
});

test("shapes, lines, arrows, groups and nested frames all compile", () => {
  const objects: DesignObject[] = [
    comp({ fill: "var(--background)" }),
    rect({ id: "e", kind: "ellipse", stroke: "var(--foreground)", strokeWidth: 2, fill: null }),
    { id: "l", kind: "line", name: "Line", parentId: "c", x: 0, y: 0, width: 50, height: 0, x1: 0, y1: 0, x2: 50, y2: 0, stroke: "#123456" },
    { id: "a", kind: "arrow", name: "Arrow", parentId: "c", x: 10, y: 10, width: 60, height: 30, x1: 10, y1: 10, x2: 70, y2: 40, stroke: "var(--foreground)", strokeWidth: 2 },
    { id: "g", kind: "group", name: "Group", parentId: "c", ...base },
    rect({ id: "gm", parentId: "g" }),
    { id: "f", kind: "frame", name: "Frame", parentId: "c", ...base, fill: "var(--card)" },
    text({ id: "ft", parentId: "f", text: 'Say "hi" {now}\nthere' }),
  ];
  const code = layersToCode(objects, "c");
  assert.equal(checkCompile(code).status, "passed", code);
  assert.match(code, /<polygon/);
  assert.match(code, /Say \\"hi\\" \{now\}\\nthere/);
  // the group's member is written directly, in place (the other shapes use other colors)
  assert.equal((code.match(/bg-primary/g) ?? []).length, 1);
  assert.match(code, /bg-card/);
});

test("an instance draws its main component's layers inside its own box", () => {
  const objects: DesignObject[] = [comp(), rect(), { id: "i", kind: "instance", name: "Button 1", componentId: "c", x: 300, y: 0, width: 160, height: 48, parentId: "c2" }, { id: "c2", kind: "component", name: "Page", x: 0, y: 0, width: 500, height: 100, fill: null }];
  const code = layersToCode(objects, "c2");
  assert.equal(checkCompile(code).status, "passed", code);
  assert.match(code, /w-\[160px\] h-\[48px\]/);
  assert.match(code, /bg-primary/);
});

test("knows whether there is anything to write", () => {
  assert.equal(hasLayers([comp()], "c"), false);
  assert.equal(hasLayers([comp(), rect()], "c"), true);
});

test("names that aren't valid identifiers still give a valid component", () => {
  for (const name of ["123", "my card!", "   ", "ÅÄÖ"]) {
    assert.equal(checkCompile(layersToCode([comp({ name }), rect()], "c")).status, "passed", name);
  }
});

// ---- layout: designs people actually draw -----------------------------------------------------------------
const TX = (id: string, label: string, x: number, y: number, w: number, h: number, extra: Partial<DesignObject> = {}): DesignObject => ({ id, kind: "text", name: label, parentId: "c", x, y, width: w, height: h, text: label, fontSize: 16, fontWeight: 500, fill: "var(--foreground)", ...extra });
const RC = (id: string, x: number, y: number, w: number, h: number, extra: Partial<DesignObject> = {}): DesignObject => ({ id, kind: "rect", name: id, parentId: "c", x, y, width: w, height: h, fill: "var(--muted)", radius: 8, ...extra });

const login: DesignObject[] = [
  { id: "c", kind: "component", name: "Login form", x: 0, y: 0, width: 320, height: 360, fill: "var(--card)" },
  TX("title", "Welcome back", 32, 28, 256, 32, { fontSize: 24, fontWeight: 600 }),
  TX("sub", "join us for an amazing experience", 32.4, 66, 255.6, 20, { fontSize: 14 }),
  TX("l1", "Email", 32, 106, 120, 20, { fontSize: 14 }),
  RC("f1", 32, 130.5, 256, 44, { stroke: "var(--border)", strokeWidth: 1, fill: null }),
  TX("t1", "mail@example.com", 44, 142, 200, 20, { fontSize: 14 }),
  TX("l2", "Password", 32, 190, 120, 20, { fontSize: 14 }),
  RC("f2", 32, 214.5, 256, 44, { stroke: "var(--border)", strokeWidth: 1, fill: null }),
  TX("t2", "***********", 44, 226, 200, 20, { fontSize: 14 }),
  RC("btn", 32, 290, 256, 44, { fill: "var(--primary)" }),
  TX("bt", "Login", 130, 302, 60, 20, { fontSize: 16, textAlign: "center", fill: "var(--primary-foreground)" }),
];

test("a form is a column of rows and boxes, with no layer pinned by position", () => {
  const code = layersToCode(login, "c");
  assert.doesNotMatch(code, /absolute|left-\[|top-\[/, code);
  assert.match(code, /flex flex-col/);
  assert.equal(checkCompile(code).status, "passed");
  assert.deepEqual(checkThemeTokens(code).findings, []);
});

test("an input drawn as an outlined rectangle with text on it becomes a box that holds the text", () => {
  const code = layersToCode(login, "c");
  // the text is written inside the box, not next to it
  const field = code.split("\n").findIndex((l) => l.includes("border-[1px] border-solid border-border"));
  const textAt = code.split("\n").findIndex((l) => l.includes('{"mail@example.com"}'));
  const closeAt = code.split("\n").findIndex((l, i) => i > field && /^\s{6}<\/div>/.test(l));
  assert.ok(field > 0 && textAt > field && textAt < closeAt, "the placeholder is inside its field");
});

test("the button's label is centered inside it", () => {
  const code = layersToCode(login, "c");
  assert.match(code, /bg-primary rounded-\[8px\] flex flex-col justify-center items-center/);
});

test("things drawn side by side become a row, with the stacked ones in a column beside the avatar", () => {
  const row: DesignObject[] = [
    { id: "c", kind: "component", name: "Notification", x: 0, y: 0, width: 380, height: 84, fill: "var(--card)" },
    { id: "av", kind: "ellipse", name: "Avatar", parentId: "c", x: 16, y: 20, width: 44, height: 44, fill: "var(--muted)" },
    TX("n1", "New comment", 76, 22, 180, 20), TX("n2", "From Design Guru", 76, 44, 180, 20, { fontSize: 14 }),
    RC("act", 280, 26, 84, 32, { fill: "var(--primary)" }), TX("actl", "Read", 300, 32, 44, 20, { fontSize: 14, textAlign: "center" }),
  ];
  const code = layersToCode(row, "c");
  assert.match(code, /flex flex-row/);
  assert.match(code, /flex flex-col gap-\[2px\]/, "the two lines of text form their own column");
  assert.doesNotMatch(code, /absolute/);
  assert.equal(checkCompile(code).status, "passed");
});

test("only layers that truly overlap keep their positions, and only those", () => {
  const pile: DesignObject[] = [
    { id: "c", kind: "component", name: "Pile", x: 0, y: 0, width: 240, height: 160, fill: "var(--card)" },
    TX("h", "Overlapping layers", 20, 16, 200, 24), RC("o1", 20, 60, 120, 70, { fill: "var(--primary)" }), RC("o2", 90, 90, 120, 50, { fill: "var(--secondary)" }),
  ];
  const code = layersToCode(pile, "c");
  assert.equal((code.match(/absolute/g) ?? []).length, 2, "just the two overlapping rectangles");
  assert.match(code, /relative/);
  assert.ok(code.indexOf("Overlapping layers") < code.indexOf("absolute"), "the heading above them still flows");
  assert.equal(checkCompile(code).status, "passed");
});

test("a frame keeps its children inside it, laid out the same way", () => {
  const withFrame: DesignObject[] = [
    { id: "c", kind: "component", name: "Card", x: 0, y: 0, width: 300, height: 200, fill: "var(--background)" },
    TX("h", "Header", 20, 16, 120, 24),
    { id: "fr", kind: "frame", name: "Body", parentId: "c", x: 20, y: 56, width: 260, height: 120, fill: "var(--muted)" },
    TX("a", "Inside", 16, 12, 180, 20, { parentId: "fr" }), TX("b", "Second", 16, 44, 180, 20, { parentId: "fr" }),
  ];
  const code = layersToCode(withFrame, "c");
  assert.doesNotMatch(code, /absolute/);
  assert.ok(code.indexOf("Inside") > code.indexOf("overflow-hidden w-[260px]"));
  assert.equal(checkCompile(code).status, "passed");
});

test("debug ids are only added when asked for", () => {
  assert.doesNotMatch(layersToCode(login, "c"), /data-layer/);
  assert.match(layersToCode(login, "c", { debugIds: true }), /data-layer="btn"/);
});
