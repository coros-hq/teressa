import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildThreads, categoryLabelOf, commenterLabel, countByStatus, discussionHref, filterThreads, lineCountOf,
  parseDiscussionParams, toComment, validateBody, validateFeedback, type Comment,
} from "./discussion.ts";

const c = (id: string, over: Partial<Comment> = {}): Comment => ({
  id, parentId: null, version: 1, authorId: "u", authorName: "N", authorUsername: "n", authorAvatarUrl: null,
  body: "b", category: "accessibility", line: null, status: "open", createdAt: `2026-10-0${id}T10:00:00Z`, ...over,
});

test("feedback is grouped with its replies, newest feedback first, replies oldest first", () => {
  const all = [c("1"), c("2"), c("3", { parentId: "1", category: null, createdAt: "2026-10-05T10:00:00Z" }), c("4", { parentId: "1", category: null, createdAt: "2026-10-04T10:00:00Z" })];
  const t = buildThreads(all);
  assert.deepEqual(t.map((x) => x.feedback.id), ["2", "1"]);
  assert.deepEqual(t[1].replies.map((r) => r.id), ["4", "3"]);
  assert.deepEqual(buildThreads(all, "oldest").map((x) => x.feedback.id), ["1", "2"]);
});

test("a reply whose feedback is gone isn't shown on its own", () => {
  assert.equal(buildThreads([c("1", { parentId: "9" })]).length, 0);
});

test("filtering and counting by status (replies don't count)", () => {
  const t = buildThreads([c("1"), c("2", { status: "addressed" }), c("3"), c("4", { parentId: "1", category: null })]);
  assert.deepEqual(countByStatus(t), { all: 3, open: 2, addressed: 1 });
  assert.deepEqual(filterThreads(t, "addressed").map((x) => x.feedback.id), ["2"]);
  assert.equal(filterThreads(t, "all").length, 3);
});

test("the view is read from the address with safe defaults", () => {
  const p = (qs: string) => parseDiscussionParams(new URL(`https://x.test/c/a${qs}`));
  assert.deepEqual(p(""), { status: "all", sort: "newest" });
  assert.deepEqual(p("?feedback=open&sort=oldest"), { status: "open", sort: "oldest" });
  assert.deepEqual(p("?feedback=%27drop&sort=x"), { status: "all", sort: "newest" });
  assert.equal(discussionHref("btn", { status: "all", sort: "newest" }, {}), "/c/btn#feedback");
  assert.equal(discussionHref("btn", { status: "all", sort: "newest" }, { status: "open", sort: "oldest" }), "/c/btn?feedback=open&sort=oldest#feedback");
});

test("feedback needs a message and a topic; the line is optional but real", () => {
  const ok = { body: "Add a label", category: "accessibility", line: "" };
  assert.deepEqual(validateFeedback(ok, 20), {});
  assert.ok(validateFeedback({ ...ok, body: "   " }, 20).body);
  assert.ok(validateFeedback({ ...ok, body: "x".repeat(2001) }, 20).body);
  assert.equal(validateFeedback({ ...ok, body: "x".repeat(2000) }, 20).body, undefined);
  assert.ok(validateFeedback({ ...ok, category: "" }, 20).category);
  assert.ok(validateFeedback({ ...ok, category: "spam" }, 20).category);
  assert.deepEqual(validateFeedback({ ...ok, line: "12" }, 20), {});
  for (const bad of ["0", "-3", "1.5", "abc"]) assert.ok(validateFeedback({ ...ok, line: bad }, 20).line, bad);
  assert.match(validateFeedback({ ...ok, line: "25" }, 20).line ?? "", /only has 20 lines/);
});

test("a reply is just a message", () => {
  assert.equal(validateBody("Thanks!"), null);
  assert.ok(validateBody(""));
});

test("lines of code are counted the way an editor shows them", () => {
  assert.equal(lineCountOf(""), 0);
  assert.equal(lineCountOf("a"), 1);
  assert.equal(lineCountOf("a\nb\n"), 2);
  assert.equal(lineCountOf("a\n\nb"), 3);
});

test("rows from the database become comments", () => {
  const row = toComment({ id: 7, parent_id: null, version: "2", author_id: "u", author_name: "Ben", author_username: "ben", author_avatar_path: "u/a.webp", body: "hi", category: "api-design", line_number: "4", status: "addressed", created_at: "t" }, (p) => (p ? `https://cdn/${p}` : null));
  assert.equal(row.version, 2);
  assert.equal(row.line, 4);
  assert.equal(row.status, "addressed");
  assert.equal(row.authorAvatarUrl, "https://cdn/u/a.webp");
  assert.equal(toComment({ id: "1", body: "x", status: "weird", created_at: "t" }, () => null).status, "open");
});

test("people are named plainly, including deleted accounts", () => {
  assert.equal(commenterLabel({ authorId: null, authorUsername: null, authorName: null }), "Deleted user");
  assert.equal(commenterLabel({ authorId: "u", authorUsername: "ben", authorName: "Ben" }), "@ben");
  assert.equal(commenterLabel({ authorId: "u", authorUsername: null, authorName: "Ben" }), "Ben");
  assert.equal(categoryLabelOf("api-design"), "API design");
});
