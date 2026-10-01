import assert from "node:assert/strict";
import { test } from "node:test";

import { checkThemeTokens } from "./theme-tokens.ts";

const rules = (code: string) => checkThemeTokens(code).findings.map((f) => `${f.rule}@${f.line}:${f.severity}`);

test("theme tokens pass", () => {
  const r = checkThemeTokens(`export default () => <div className="bg-card text-muted-foreground border-border/50 ring-ring" style={{ color: "var(--primary)" }} />;`);
  assert.equal(r.status, "passed");
  assert.deepEqual(r.findings, []);
});

test("hex colors are flagged with their line", () => {
  assert.deepEqual(rules(`const a = 1;\nconst c = "#fff";\nconst d = "#1a2b3c80";`), ["hex-color@2:error", "hex-color@3:error"]);
});

test("rgb, hsl and oklch literals are flagged; ones built from variables are not", () => {
  assert.deepEqual(rules(`a("rgb(1, 2, 3)"); b("hsl(10 20% 30%)"); c("oklch(0.5 0.1 200)")`), [
    "color-function@1:error", "color-function@1:error", "color-function@1:error",
  ]);
  assert.deepEqual(rules(`a("rgb(var(--x))"); b("color-mix(in srgb, var(--primary) 50%, transparent)")`), []);
});

test("tailwind arbitrary colors are flagged once", () => {
  assert.deepEqual(rules(`<div className="bg-[#fff] text-[rgb(0,0,0)] hover:border-[#abc]" />`), [
    "arbitrary-color@1:error", "arbitrary-color@1:error", "arbitrary-color@1:error",
  ]);
  // sizes in brackets are not colors
  assert.deepEqual(rules(`<div className="w-[320px] text-[13px] bg-[length:10px]" />`), []);
});

test("palette classes that skip the theme are flagged", () => {
  assert.deepEqual(rules(`<div className="bg-blue-500 text-white dark:bg-slate-900/50 border-red-200" />`), [
    "palette-color@1:error", "palette-color@1:error", "palette-color@1:error", "palette-color@1:error",
  ]);
  // similar-looking words are fine
  assert.deepEqual(rules(`<div className="text-center bg-background text-foreground text-sm" />`), []);
});

test("teressa-ignore-color turns findings on that line into warnings", () => {
  const r = checkThemeTokens(`const logo = "#ff0000"; // teressa-ignore-color\nconst bad = "#00ff00";`);
  assert.deepEqual(r.findings.map((f) => [f.line, f.severity]), [[1, "warning"], [2, "error"]]);
  assert.equal(r.status, "failed");
  assert.equal(checkThemeTokens(`const logo = "#ff0000"; // teressa-ignore-color`).status, "passed");
});

test("colors inside comments are not findings, but // inside a string is not a comment", () => {
  assert.deepEqual(rules(`// the old color was #fff\n/* rgb(1,2,3)\n bg-red-500 */`), []);
  assert.deepEqual(rules(`const u = "http://x.test"; const c = "#fff";`), ["hex-color@1:error"]);
});

test("anchors and ids that are not colors are not flagged", () => {
  assert.deepEqual(rules(`<a href="#section">x</a><a href="#top-of-page">y</a>`), []);
});
