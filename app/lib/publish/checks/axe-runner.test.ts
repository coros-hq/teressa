import assert from "node:assert/strict";
import { test } from "node:test";

import { AuditUnavailable, runAudits, type AuditFn } from "./axe-runner.ts";
import { runChecks } from "./run.ts";
import type { AuditResult, CheckResult, Theme } from "./types.ts";

const ok = (theme: Theme): AuditResult => ({ theme, render: { ok: true }, empty: false, violations: [] });
const CODE = `export default function A() { return <button>Hi</button>; }`;

test("audits light then dark", async () => {
  const seen: Theme[] = [];
  const audit: AuditFn = async (_c, theme) => (seen.push(theme), ok(theme));
  const r = await runAudits(audit, CODE);
  assert.deepEqual(seen, ["light", "dark"]);
  assert.deepEqual(r.map((a) => a.theme), ["light", "dark"]);
});

test("a preview that isn't ready is reported, not ignored", async () => {
  await assert.rejects(runAudits(async () => null, CODE), AuditUnavailable);
});

test("a preview that never answers times out", async () => {
  await assert.rejects(runAudits(() => new Promise(() => {}), CODE, 20), /didn't answer/);
});

async function run(audit: AuditFn, code = CODE) {
  const results: CheckResult[] = [];
  const started: string[] = [];
  await runChecks({ code, instrumentedCode: code, audit, onStart: (id) => started.push(id), onResult: (r) => results.push(r) });
  return { results, started, by: Object.fromEntries(results.map((r) => [r.id, r])) };
}

test("all four checks run and pass for good code", async () => {
  const { by, started } = await run(async (_c, t) => ok(t));
  assert.deepEqual(Object.values(by).map((r) => r.status), ["passed", "passed", "passed", "passed"]);
  assert.deepEqual([...new Set(started)].sort(), ["accessibility", "compile", "modes", "tokens"]);
});

test("when the preview is down, the browser checks crash and the rest still run", async () => {
  const { by } = await run(async () => null);
  assert.equal(by.compile.status, "passed");
  assert.equal(by.tokens.status, "passed");
  assert.equal(by.accessibility.status, "crashed");
  assert.equal(by.modes.status, "crashed");
});

test("one failing check doesn't stop the others", async () => {
  const { by } = await run(async (_c, t) => ok(t), `export default () => <div className="bg-red-500" >{`);
  assert.equal(by.compile.status, "failed");
  assert.ok(by.tokens);
  assert.ok(by.accessibility);
});

test("findings from a scan get the line of their element", async () => {
  const audit: AuditFn = async (_c, theme) => ({
    ...ok(theme),
    violations: theme === "light" ? [{ id: "button-name", impact: "critical", help: "", nodes: [{ html: "<button>", sid: 7 }] }] : [],
  });
  const results: CheckResult[] = [];
  await runChecks({ code: CODE, instrumentedCode: CODE, audit, onStart() {}, onResult: (r) => results.push(r), lineOfElement: (sid) => sid * 10 });
  assert.equal(results.find((r) => r.id === "accessibility")!.findings[0].line, 70);
});
