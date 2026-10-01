import assert from "node:assert/strict";
import { test } from "node:test";

import { deleteOwnComment, getComponentPage, mapDiscussionError, postFeedback, postReply, recordCopy, setFeedbackStatus } from "./component-page.server.ts";

const CID = "c0c0c0c0-0000-4000-8000-000000000001";
const VID = "d0d0d0d0-0000-4000-8000-000000000001";
const CODE = "export default function A() {\n  return <p>a</p>;\n}\n";

// A stand-in for the database that records what was asked of it.
function fake(opts: { published?: boolean; parent?: unknown; insertError?: { code?: string; message?: string }; updated?: unknown[]; deleted?: unknown[]; comments?: unknown[] } = {}) {
  const log: string[] = [];
  const published = opts.published ?? true;
  const client = {
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select: () => q,
        eq: (k: string, v: unknown) => (log.push(`${table} eq ${k}=${v}`), q),
        order: () => q,
        limit: () => q,
        insert: (v: unknown) => (log.push(`insert ${table} ${JSON.stringify(v)}`), q),
        update: (v: unknown) => (log.push(`update ${table} ${JSON.stringify(v)}`), q),
        delete: () => (log.push(`delete ${table}`), q),
        single: async () => (opts.insertError ? { data: null, error: opts.insertError } : { data: { id: "new" }, error: null }),
        maybeSingle: async () => {
          if (table === "published_components") return { data: published ? { id: CID, slug: "btn", name: "Btn", description: "d", category: "Cards", tags: ["a"], version: 2, published_at: "t", copies: "3", current_version_id: VID, preview_light: null, preview_dark: null, author_id: "u1", author_name: "Ada", author_username: "ada", author_avatar_path: null } : null, error: null };
          if (table === "component_versions") return { data: { code: CODE }, error: null };
          if (table === "public_comments") return { data: opts.parent === undefined ? { id: "p1", version_id: "v-old", parent_id: null, component_id: CID } : opts.parent, error: null };
          return { data: null, error: null };
        },
        then: (res: (v: unknown) => void) =>
          res(
            table === "public_comments" ? { data: opts.comments ?? [], error: null }
            : log.some((l) => l.startsWith("update")) ? { data: opts.updated ?? [{ id: "x" }], error: null }
            : log.some((l) => l.startsWith("delete")) ? { data: opts.deleted ?? [{ id: "x" }], error: null }
            : { data: [], error: null },
          ),
      };
      return q;
    },
    rpc: async (fn: string, args: unknown) => (log.push(`rpc ${fn} ${JSON.stringify(args)}`), { data: null, error: null }),
  };
  return { client: client as never, log };
}

test("the page loads the component with its current code and the discussion", async () => {
  const f = fake({ comments: [{ id: "1", parent_id: null, version: 1, author_id: "u2", author_name: "Ben", author_username: "ben", body: "hi", category: "accessibility", line_number: 2, status: "open", created_at: "t" }] });
  const page = await getComponentPage(f.client, "btn");
  assert.ok(page);
  assert.equal(page.component.code, CODE);
  assert.equal(page.lineCount, 3);
  assert.equal(page.component.copies, 3);
  assert.equal(page.comments[0].line, 2);
  assert.ok(!f.log.some((l) => l.includes("components eq") && !l.includes("published_components")), "never reads the drafts table");
});

test("an unpublished or unknown slug is just not found", async () => {
  assert.equal(await getComponentPage(fake({ published: false }).client, "nope"), null);
});

test("feedback is attached to the current version, trimmed, with an optional line", async () => {
  const f = fake();
  const r = await postFeedback(f.client, { slug: "btn", body: "  Add a label  ", category: "accessibility", line: "2" });
  assert.ok(r.ok);
  const insert = f.log.find((l) => l.startsWith("insert comments"))!;
  assert.match(insert, new RegExp(`"component_id":"${CID}"`));
  assert.match(insert, new RegExp(`"version_id":"${VID}"`));
  assert.match(insert, /"body":"Add a label"/);
  assert.match(insert, /"line_number":2/);
  assert.ok(!insert.includes("author_id"), "the author always comes from the session, never from the request");
});

test("feedback that breaks the rules is refused with field errors, and nothing is written", async () => {
  for (const input of [{ body: "", category: "accessibility", line: "" }, { body: "x", category: "nope", line: "" }, { body: "x", category: "accessibility", line: "99" }]) {
    const f = fake();
    const r = await postFeedback(f.client, { slug: "btn", ...input });
    assert.ok(!r.ok && r.status === 400 && r.fieldErrors);
    assert.ok(!f.log.some((l) => l.startsWith("insert")));
  }
});

test("feedback on something that isn't published is refused", async () => {
  const r = await postFeedback(fake({ published: false }).client, { slug: "x", body: "x", category: "accessibility", line: "" });
  assert.ok(!r.ok && r.status === 404);
});

test("a reply goes on the version of the feedback it answers", async () => {
  const f = fake();
  const r = await postReply(f.client, { slug: "btn", parentId: "p1", body: "Thanks" });
  assert.ok(r.ok);
  const insert = f.log.find((l) => l.startsWith("insert comments"))!;
  assert.match(insert, /"version_id":"v-old"/);
  assert.match(insert, /"parent_id":"p1"/);
  assert.ok(!insert.includes("category"));
});

test("a reply can't go under a reply, under something on another component, or be empty", async () => {
  assert.ok(!(await postReply(fake({ parent: { id: "p", version_id: "v", parent_id: "other", component_id: CID } }).client, { slug: "btn", parentId: "p", body: "x" })).ok);
  assert.ok(!(await postReply(fake({ parent: { id: "p", version_id: "v", parent_id: null, component_id: "someone-else" } }).client, { slug: "btn", parentId: "p", body: "x" })).ok);
  assert.ok(!(await postReply(fake({ parent: null }).client, { slug: "btn", parentId: "p", body: "x" })).ok);
  const empty = fake();
  assert.ok(!(await postReply(empty.client, { slug: "btn", parentId: "p1", body: "  " })).ok);
  assert.ok(!empty.log.some((l) => l.startsWith("insert")));
});

test("only the two real statuses are accepted, and a no-op is reported as not allowed", async () => {
  assert.ok((await setFeedbackStatus(fake().client, "c1", "addressed")).ok);
  assert.ok(!(await setFeedbackStatus(fake().client, "c1", "closed")).ok);
  const denied = await setFeedbackStatus(fake({ updated: [] }).client, "c1", "addressed");
  assert.ok(!denied.ok && denied.status === 403 && /person who published/.test(denied.message));
});

test("deleting: your own goes, someone else's is reported as not allowed", async () => {
  assert.ok((await deleteOwnComment(fake().client, "c1")).ok);
  const denied = await deleteOwnComment(fake({ deleted: [] }).client, "c1");
  assert.ok(!denied.ok && denied.status === 403);
});

test("database failures become plain messages, and nothing internal leaks", () => {
  assert.equal(mapDiscussionError({ message: "rate_limited" }).status, 429);
  assert.equal(mapDiscussionError({ message: "invalid_reply" }).status, 400);
  assert.equal(mapDiscussionError({ message: "only the component owner can change a comment's status" }).status, 403);
  assert.equal(mapDiscussionError({ message: "only the commenter can edit a comment" }).status, 403);
  assert.equal(mapDiscussionError({ code: "42501", message: "new row violates row-level security policy" }).status, 403);
  const other = mapDiscussionError({ message: "relation comments does not exist" });
  assert.equal(other.status, 500);
  assert.ok(!/relation/.test(other.message));
});

test("copies are counted once per call, and only for sensible slugs", async () => {
  const f = fake();
  await recordCopy(f.client, "my-button");
  await recordCopy(f.client, "../etc/passwd");
  await recordCopy(f.client, "");
  assert.deepEqual(f.log, ['rpc record_copy {"p_slug":"my-button"}']);
});
