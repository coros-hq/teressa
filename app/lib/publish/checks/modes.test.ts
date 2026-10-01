import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateModes } from "./modes.ts";
import type { AuditResult, Theme } from "./types.ts";

const audit = (theme: Theme, extra: Partial<AuditResult> = {}): AuditResult => ({
  theme, render: { ok: true }, empty: false, violations: [], ...extra,
});
const contrast = { id: "color-contrast", impact: "serious" as const, help: "", nodes: [{ html: "<p>x</p>", sid: 2 }] };

test("renders fine in both themes", () => {
  assert.equal(evaluateModes([audit("light"), audit("dark")]).status, "passed");
});

test("a render that throws in one theme fails", () => {
  const r = evaluateModes([audit("light"), audit("dark", { render: { ok: false, phase: "runtime", message: "x is not defined" } })]);
  assert.equal(r.status, "failed");
  assert.equal(r.findings[0].theme, "dark");
  assert.match(r.findings[0].message, /x is not defined/);
});

test("empty output fails", () => {
  const r = evaluateModes([audit("light", { empty: true }), audit("dark")]);
  assert.equal(r.status, "failed");
  assert.equal(r.findings[0].rule, "empty-output");
});

test("poor contrast fails for the theme it happens in", () => {
  const r = evaluateModes([audit("light"), audit("dark", { violations: [contrast] })]);
  assert.equal(r.status, "failed");
  assert.equal(r.findings[0].theme, "dark");
});

test("other accessibility findings don't fail this check", () => {
  const r = evaluateModes([audit("light", { violations: [{ id: "label", impact: "critical", help: "", nodes: [] }] }), audit("dark")]);
  assert.equal(r.status, "passed");
});

test("a scan that couldn't run is not a pass", () => {
  assert.equal(evaluateModes([audit("light", { axeError: "boom" }), audit("dark")]).status, "crashed");
});
