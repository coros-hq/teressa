import assert from "node:assert/strict";
import { test } from "node:test";

import { sha256Hex } from "./publish/details.ts";
import { codeOfObject, getPublishedVersion, mapPublishError, publishComponent, type PublishInput } from "./publishing.server.ts";

const CODE = `export default function A() { return <p>Hi</p>; }`;
const KEY = "11111111-1111-4111-8111-111111111111";
const CID = "c0c0c0c0-0000-4000-8000-000000000001";
const LIGHT = `${CID}/aaaaaaaa-0000-4000-8000-000000000001-light.webp`;
const DARK = `${CID}/aaaaaaaa-0000-4000-8000-000000000002-dark.webp`;
const base: PublishInput = {
  componentId: CID,
  objectId: "o1",
  details: { title: "  Card ", description: "A card", category: "Cards", tags: ["UI", "ui"] },
  checkResults: { reportedBy: "browser" },
  idempotencyKey: KEY,
  previewLight: LIGHT,
  previewDark: DARK,
  origin: "https://teressa.test",
};

// A stand-in for the data client: one saved draft, and a recorded function call.
function fakeSupabase(opts: { previewFiles?: string[]; objects?: unknown; rpc?: { data?: unknown; error?: { message?: string; code?: string } } } = {}) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const objects = "objects" in opts ? opts.objects : [{ id: "o1", kind: "component", code: CODE }];
  const client = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: objects === null ? null : { objects }, error: null }) }) }) }),
    storage: { from: () => ({ list: async () => ({ data: (opts.previewFiles ?? [LIGHT, DARK].map((p) => p.split("/")[1])).map((name) => ({ name })), error: null }) }) },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return opts.rpc ?? { data: { slug: "card", version: 1, repeated: false }, error: null };
    },
  };
  return { client: client as never, calls };
}

test("publishes the saved draft's code, with cleaned details and a hash", async () => {
  const { client, calls } = fakeSupabase();
  const r = await publishComponent(client, base);
  assert.ok(r.ok && r.slug === "card" && r.version === 1);
  const a = calls[0].args;
  assert.equal(a.p_title, "Card");
  assert.deepEqual(a.p_tags, ["ui"]);
  assert.equal(a.p_idempotency_key, KEY);
  assert.equal(a.p_code_sha256, await sha256Hex(CODE));
  assert.ok(!("p_code" in a), "code is never taken from the request");
  assert.ok(r.ok && r.installCommand.endsWith("https://teressa.test/r/card.json"));
  assert.ok(r.ok && r.publicUrl === "https://teressa.test/c/card");
});

test("a retry with the same key is passed through and reported as repeated", async () => {
  const { client } = fakeSupabase({ rpc: { data: { slug: "card", version: 1, repeated: true } } });
  const r = await publishComponent(client, base);
  assert.ok(r.ok && r.repeated);
});

test("invalid details are rejected before the database is called", async () => {
  const { client, calls } = fakeSupabase();
  const r = await publishComponent(client, { ...base, details: { ...base.details, description: "" } });
  assert.ok(!r.ok && r.status === 400 && r.fieldErrors?.description);
  assert.equal(calls.length, 0);
});

test("missing component, missing code, and empty code are refused", async () => {
  assert.equal((await publishComponent(fakeSupabase({ objects: null }).client, base) as { status: number }).status, 404);
  const none = await publishComponent(fakeSupabase({ objects: [] }).client, base);
  assert.ok(!none.ok && none.code === "no_code");
  const empty = await publishComponent(fakeSupabase({ objects: [{ id: "o1", kind: "component", code: "  " }] }).client, base);
  assert.ok(!empty.ok && empty.code === "empty_code");
});

test("oversized code is refused", async () => {
  const big = "x".repeat(205_000);
  const r = await publishComponent(fakeSupabase({ objects: [{ id: "o1", kind: "component", code: big }] }).client, base);
  assert.ok(!r.ok && r.code === "code_too_large");
});

test("database errors become clear messages with the right status", () => {
  const cases: [string, number][] = [
    ["rate_limited", 429], ["not_allowed", 403], ["duplicate_code", 409], ["no_code_changes", 409], ["draft_changed", 409],
  ];
  for (const [message, status] of cases) {
    const o = mapPublishError({ message });
    assert.ok(!o.ok && o.status === status && o.message.length > 10, message);
  }
  const race = mapPublishError({ code: "23505", message: "duplicate key value violates unique constraint" });
  assert.ok(!race.ok && race.status === 409 && /same moment/.test(race.message));
  const unknown = mapPublishError({ message: "relation does not exist" });
  assert.ok(!unknown.ok && unknown.status === 500 && !/relation/.test(unknown.message), "internal errors aren't shown");
});

test("a database failure returns a safe error and claims nothing", async () => {
  const { client } = fakeSupabase({ rpc: { error: { message: "FetchError" } } });
  const r = await publishComponent(client, base);
  assert.ok(!r.ok && r.status === 500);
});

test("finds a component's code in the saved design, in either saved shape", () => {
  assert.equal(codeOfObject([{ id: "o1", kind: "component", code: "x" }], "o1"), "x");
  assert.equal(codeOfObject({ version: 2, objects: [{ id: "o1", kind: "component", code: "x" }] }, "o1"), "x");
  assert.equal(codeOfObject([{ id: "o1", kind: "frame", code: "x" }], "o1"), null);
});

test("public reads only return what the published view and versions give", async () => {
  const tables: string[] = [];
  const client = {
    from: (t: string) => {
      tables.push(t);
      const row = t === "published_components" ? { id: "c1", slug: "card", current_version_id: "v2" } : { version: 2, code: CODE, details: { title: "Card" }, published_at: "t" };
      const chain: Record<string, unknown> = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: row, error: null }) };
      return chain;
    },
  };
  const v = await getPublishedVersion(client as never, "card", null);
  assert.equal(v?.version, 2);
  assert.ok(!tables.includes("components"), "never reads the drafts table");
});

test("previews: both are passed to the database function", async () => {
  const { client, calls } = fakeSupabase();
  await publishComponent(client, base);
  assert.equal(calls[0].args.p_preview_light, LIGHT);
  assert.equal(calls[0].args.p_preview_dark, DARK);
});

test("previews: a publish whose preview files aren't really stored is refused before the database is called", async () => {
  const { client, calls } = fakeSupabase({ previewFiles: [LIGHT.split("/")[1]] }); // the dark one is missing
  const r = await publishComponent(client, base);
  assert.ok(!r.ok && r.code === "invalid_preview");
  assert.equal(calls.length, 0);
});

test("previews: paths from another component, swapped themes, or odd names are refused", async () => {
  for (const patch of [
    { previewLight: `c1c1c1c1-0000-4000-8000-000000000009/aaaaaaaa-0000-4000-8000-000000000001-light.webp` },
    { previewLight: DARK, previewDark: LIGHT },
    { previewDark: `${CID}/../evil-dark.webp` },
    { previewLight: "" },
  ]) {
    const { client, calls } = fakeSupabase();
    const r = await publishComponent(client, { ...base, ...patch });
    assert.ok(!r.ok && r.code === "invalid_preview", JSON.stringify(patch));
    assert.equal(calls.length, 0);
  }
});
