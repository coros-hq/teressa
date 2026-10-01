import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateAccessibility } from "./accessibility.ts";
import type { AuditResult, AuditViolation, Theme } from "./types.ts";

const audit = (theme: Theme, violations: AuditViolation[] = [], extra: Partial<AuditResult> = {}): AuditResult => ({
  theme, render: { ok: true }, empty: false, violations, ...extra,
});
const v = (id: string, impact: AuditViolation["impact"]): AuditViolation => ({
  id, impact, help: `${id} help`, nodes: [{ html: "<button></button>", sid: 1 }],
});

test("clean scans pass", () => {
  assert.equal(evaluateAccessibility([audit("light"), audit("dark")]).status, "passed");
});

test("serious and critical block", () => {
  for (const impact of ["serious", "critical"] as const) {
    const r = evaluateAccessibility([audit("light", [v("button-name", impact)]), audit("dark")]);
    assert.equal(r.status, "failed");
    assert.equal(r.findings[0].severity, "error");
    assert.match(r.findings[0].message, /button has no text/);
  }
});

test("minor and moderate are warnings and don't block", () => {
  const r = evaluateAccessibility([audit("light", [v("heading-order", "moderate"), v("tabindex", "minor")]), audit("dark")]);
  assert.equal(r.status, "passed");
  assert.deepEqual(r.findings.map((f) => f.severity), ["warning", "warning"]);
});

test("the same problem in both themes is reported for each theme", () => {
  const r = evaluateAccessibility([audit("light", [v("label", "critical")]), audit("dark", [v("label", "critical")])]);
  assert.deepEqual(r.findings.map((f) => f.theme), ["light", "dark"]);
});

test("contrast is left to the light/dark check", () => {
  const r = evaluateAccessibility([audit("light", [v("color-contrast", "serious")]), audit("dark")]);
  assert.equal(r.status, "passed");
  assert.equal(r.findings.length, 0);
});

test("a scan that couldn't run is never a pass", () => {
  const r = evaluateAccessibility([audit("light", [], { axeError: "boom" }), audit("dark")]);
  assert.equal(r.status, "crashed");
  const r2 = evaluateAccessibility([audit("light", [], { render: { ok: false, phase: "runtime", message: "x" } }), audit("dark")]);
  assert.equal(r2.status, "crashed");
});
