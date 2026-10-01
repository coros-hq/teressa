import assert from "node:assert/strict";
import { test } from "node:test";

import { checkCompile } from "./compile.ts";

test("valid default export passes", () => {
  const r = checkCompile(`export default function Card() { return <div className="p-4">Hi</div>; }`);
  assert.equal(r.status, "passed");
});

test("named component export passes", () => {
  assert.equal(checkCompile(`export const Card = () => <p>Hi</p>;`).status, "passed");
  assert.equal(checkCompile(`export function Card() { return <p>Hi</p>; }`).status, "passed");
});

test("typescript is accepted", () => {
  const r = checkCompile(`type P = { n: number };\nexport default function A({ n }: P) { return <b>{n}</b>; }`);
  assert.equal(r.status, "passed");
});

test("syntax error fails with a line number", () => {
  const r = checkCompile(`export default function A() {\n  return <div>;\n}`);
  assert.equal(r.status, "failed");
  assert.equal(r.findings[0].rule, "syntax-error");
  assert.equal(r.findings[0].line, 2);
});

test("no component export fails", () => {
  const r = checkCompile(`const a = 1;\nexport const helper = 2;`);
  assert.equal(r.status, "failed");
  assert.equal(r.findings[0].rule, "no-export");
});
