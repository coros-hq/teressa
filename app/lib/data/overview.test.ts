import assert from "node:assert/strict";
import { test } from "node:test";

import { formatRelative } from "../format-time.ts";
import { blockOrder, categoryLabel, deriveChecklist, excerpt, parseOverview } from "./overview.ts";
import { getOverview } from "./overview.server.ts";

const RAW = {
  stats: { drafts: 2, published: 1, open_feedback: 3, copies: "7" },
  recent_drafts: [{ id: "d1", name: "Card", project_name: "My project", updated_at: "2026-10-01T10:00:00Z" }],
  published: [{ id: "p1", name: "Button", slug: "button", version: 3, published_at: "2026-10-01T09:00:00Z", open_feedback: 2, copies: 5 }],
  open_feedback: [{ id: "f1", component_id: "p1", component_name: "Button", slug: "button", category: "accessibility", body: "Add a label", line_number: 7, created_at: "2026-10-01T09:30:00Z", author_name: "Ben" }],
  feedback_requests: [{ id: "q1", name: "Tabs", slug: "tabs", author_name: null, comment_count: 0 }],
  checklist: { has_component: true, has_published: true, has_commented: false },
};

test("reads the database's answer into typed blocks", () => {
  const r = parseOverview(RAW);
  assert.ok(r.stats.ok && r.stats.data.copies === 7 && r.stats.data.openFeedback === 3);
  assert.ok(r.published.ok && r.published.data[0].version === 3 && r.published.data[0].publishedAt);
  assert.ok(r.openFeedback.ok && r.openFeedback.data[0].lineNumber === 7 && r.openFeedback.data[0].authorName === "Ben");
  assert.ok(r.feedbackRequests.ok && r.feedbackRequests.data[0].authorName === null);
  assert.ok(r.checklist.ok && r.checklist.data.hasPublished);
});

test("a malformed block fails on its own and the others still load", () => {
  const r = parseOverview({ ...RAW, published: [{ id: "p1" }], open_feedback: "nope" });
  assert.equal(r.published.ok, false);
  assert.equal(r.openFeedback.ok, false);
  assert.equal(r.stats.ok, true);
  assert.equal(r.recentDrafts.ok, true);
  assert.equal(r.checklist.ok, true);
});

test("a missing copy counter is kept as 'no counter', not zero", () => {
  const r = parseOverview({ ...RAW, stats: { drafts: 0, published: 0, open_feedback: 0 } });
  assert.ok(r.stats.ok && r.stats.data.copies === null);
});

test("getOverview makes exactly one database call and returns typed blocks", async () => {
  const calls: string[] = [];
  const client = { rpc: async (fn: string) => (calls.push(fn), { data: RAW, error: null }), from: () => assert.fail("no per-block queries") };
  const r = await getOverview(client as never);
  assert.deepEqual(calls, ["get_overview"]);
  assert.ok(r.stats.ok && r.recentDrafts.ok);
});

test("a database error, or a network failure, becomes an error on every block and never throws", async () => {
  const failing = await getOverview({ rpc: async () => ({ data: null, error: { message: "boom" } }) } as never);
  assert.ok(Object.values(failing).every((s) => !s.ok));
  const thrown = await getOverview({ rpc: async () => { throw new Error("network"); } } as never);
  assert.ok(Object.values(thrown).every((s) => !s.ok));
  assert.ok(!JSON.stringify(thrown).includes("boom") && !JSON.stringify(thrown).includes("network"), "internal errors aren't shown");
});

const opts = { newComponentHref: "/studio/new", continueHref: null, myComponentsHref: "/components", feedbackStepAvailable: false, feedbackHref: "/explore" };

test("checklist: a brand-new user sees all steps open, with step 3 coming soon", () => {
  const c = deriveChecklist({ hasComponent: false, hasPublished: false, hasCommented: false }, opts);
  assert.equal(c.visible, true);
  assert.deepEqual(c.steps.map((s) => s.done), [false, false, false]);
  assert.equal(c.steps[2].available, false);
  assert.equal(c.steps[1].href, "/studio/new");
});

test("checklist: step 2 continues the latest draft once there is one", () => {
  const c = deriveChecklist({ hasComponent: true, hasPublished: false, hasCommented: false }, { ...opts, continueHref: "/studio/abc" });
  assert.equal(c.steps[1].href, "/studio/abc");
  assert.equal(c.steps[0].done, true);
});

test("checklist goes away once every available step is done, even if step 3 isn't possible yet", () => {
  assert.equal(deriveChecklist({ hasComponent: true, hasPublished: true, hasCommented: false }, opts).visible, false);
  assert.equal(deriveChecklist({ hasComponent: true, hasPublished: true, hasCommented: false }, { ...opts, feedbackStepAvailable: true }).visible, true);
  assert.equal(deriveChecklist({ hasComponent: true, hasPublished: true, hasCommented: true }, { ...opts, feedbackStepAvailable: true }).visible, false);
});

test("below the wide layout, feedback comes first only when there is some", () => {
  assert.equal(blockOrder(2)[0], "feedback");
  assert.equal(blockOrder(0)[0], "drafts");
});

test("comment excerpts are cut at a word near 120 characters", () => {
  const long = "word ".repeat(60);
  const e = excerpt(long);
  assert.ok(e.length <= 121 && e.endsWith("…") && !e.includes("wor…"));
  assert.equal(excerpt("  short   text "), "short text");
});

test("categories read in plain words", () => {
  assert.equal(categoryLabel("api-design"), "API design");
  assert.equal(categoryLabel("visual-polish"), "Visual polish");
  assert.equal(categoryLabel("something-new"), "Something new");
});

test("relative times", () => {
  const now = new Date("2026-10-01T12:00:00Z").getTime();
  assert.equal(formatRelative("2026-10-01T11:59:50Z", now), "just now");
  assert.equal(formatRelative("2026-10-01T11:30:00Z", now), "30 minutes ago");
  assert.equal(formatRelative("2026-10-01T10:00:00Z", now), "2 hours ago");
  assert.equal(formatRelative("2026-09-30T12:00:00Z", now), "yesterday");
  assert.equal(formatRelative("2026-09-22T12:00:00Z", now), "last week");
  assert.equal(formatRelative("2026-08-01T12:00:00Z", now), "2 months ago");
  assert.equal(formatRelative("nonsense", now), "");
});

test("checklist: once feedback is possible, step 3 links to where components can be found", () => {
  const c = deriveChecklist({ hasComponent: true, hasPublished: true, hasCommented: false }, { ...opts, feedbackStepAvailable: true });
  assert.equal(c.steps[2].href, "/explore");
  assert.equal(c.visible, true);
});
