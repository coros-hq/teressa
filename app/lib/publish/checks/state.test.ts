import assert from "node:assert/strict";
import { test } from "node:test";

import { canPublish, hasFailure, initialChecks, isRunning, isStale, markRunning, setResult, startRun, summarize } from "./state.ts";
import { CHECK_ORDER, type CheckId, type CheckResult } from "./types.ts";

const result = (id: CheckId, status: CheckResult["status"] = "passed", warn = 0): CheckResult => ({
  id, status, findings: Array.from({ length: warn }, () => ({ rule: "w", message: "w", severity: "warning" as const })),
});
const allPassed = (hash: string) => CHECK_ORDER.reduce((s, id) => setResult(s, result(id)), startRun(hash));

test("nothing can be published before the checks have run", () => {
  assert.equal(canPublish(initialChecks(), "h1"), false);
});

test("all four passed, for this exact code, allows publishing", () => {
  assert.equal(canPublish(allPassed("h1"), "h1"), true);
});

test("warnings don't block", () => {
  const s = CHECK_ORDER.reduce((acc, id) => setResult(acc, result(id, "passed", 2)), startRun("h1"));
  assert.equal(canPublish(s, "h1"), true);
});

test("a failed or crashed check blocks", () => {
  for (const status of ["failed", "crashed"] as const) {
    const s = setResult(allPassed("h1"), result("modes", status));
    assert.equal(canPublish(s, "h1"), false);
    assert.equal(hasFailure(s), true);
  }
});

test("editing the code makes passed results stale and blocks publishing", () => {
  const s = allPassed("h1");
  assert.equal(isStale(s, "h2"), true);
  assert.equal(canPublish(s, "h2"), false);
});

test("a check that is still running blocks", () => {
  const s = markRunning(startRun("h1"), "compile");
  assert.equal(isRunning(s), true);
  assert.equal(canPublish(s, "h1"), false);
});

test("the stored summary counts errors and warnings and says who reported it", () => {
  const s = setResult(allPassed("h1"), { id: "tokens", status: "failed", findings: [{ rule: "x", message: "", severity: "error" }, { rule: "y", message: "", severity: "warning" }] });
  const sum = summarize(s);
  assert.equal(sum.reportedBy, "browser");
  assert.deepEqual(sum.checks.tokens, { status: "failed", errors: 1, warnings: 1 });
});
