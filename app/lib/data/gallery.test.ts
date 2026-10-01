import assert from "node:assert/strict";
import { test } from "node:test";

import { PAGE_SIZE, authorLabel, cleanSearch, galleryHref, parseGalleryParams, toGalleryItem } from "./gallery.ts";
import { getGallery } from "./gallery.server.ts";

const parse = (qs: string) => parseGalleryParams(new URL(`https://x.test/explore${qs}`));

test("the address is read safely, with sensible defaults", () => {
  assert.deepEqual(parse(""), { q: "", category: null, tag: null, sort: "newest", page: 1 });
  assert.deepEqual(parse("?q=Button&category=Cards&tag=Pricing&sort=popular&page=3"), { q: "button", category: "Cards", tag: "pricing", sort: "popular", page: 3 });
  assert.equal(parse("?sort=drop-table").sort, "newest");
  assert.equal(parse("?page=-5").page, 1);
  assert.equal(parse("?page=abc").page, 1);
  assert.equal(parse("?page=999999").page, 500);
});

test("a tag in the address is reduced to what a tag can be", () => {
  assert.equal(parse("?tag=Data-Table").tag, "data-table");
  assert.equal(parse("?tag=a%2Cb)(c").tag, "abc");
  assert.equal(parse("?tag=%25%27").tag, null);
  assert.equal(parse("?tag=" + "x".repeat(50)).tag?.length, 24);
});

test("search text is reduced to plain characters, so it can't change the meaning of the query", () => {
  assert.equal(cleanSearch("  Hello,  World!  "), "hello world");
  assert.equal(cleanSearch("a),name.eq.x,(b"), "a name.eq.x b");
  assert.equal(cleanSearch("50%_off*{x}"), "50 _off x");
  assert.equal(cleanSearch("x".repeat(100)).length, 60);
});

test("addresses leave out defaults, and changing a filter starts again from page one", () => {
  const cur = parse("?q=card&page=4");
  assert.equal(galleryHref(cur, { page: 5 }), "/explore?q=card&page=5");
  assert.equal(galleryHref(cur, { sort: "popular" }), "/explore?q=card&sort=popular");
  assert.equal(galleryHref(cur, { category: "Forms" }), "/explore?q=card&category=Forms");
  assert.equal(galleryHref(cur, { q: "" }), "/explore");
  assert.equal(galleryHref(cur, { tag: "pricing" }), "/explore?q=card&tag=pricing", "a new tag starts from page one");
  assert.equal(galleryHref(parse("?category=Cards&tag=pricing"), { tag: null }), "/explore?category=Cards");
  assert.equal(galleryHref(parse("?category=Cards&tag=pricing"), { category: "Forms" }), "/explore?category=Forms&tag=pricing", "category and tag combine");
  assert.equal(galleryHref(parse("")), "/explore");
});

const urls = { preview: (p: string | null) => (p ? `https://cdn/p/${p}` : null), avatar: (p: string | null) => (p ? `https://cdn/a/${p}` : null) };

test("a database row becomes a card, with full picture addresses", () => {
  const item = toGalleryItem({ id: "1", slug: "btn", name: "Button", description: "d", category: "Buttons", tags: ["a", 3], version: "2", published_at: "t", copies: "5", preview_light: "x/l.webp", preview_dark: null, author_id: "u", author_name: "Ada", author_username: "ada", author_avatar_path: "u/a.webp" }, urls);
  assert.equal(item.version, 2);
  assert.equal(item.copies, 5);
  assert.deepEqual(item.tags, ["a"]);
  assert.equal(item.previewLight, "https://cdn/p/x/l.webp");
  assert.equal(item.previewDark, null);
  assert.equal(item.authorAvatarUrl, "https://cdn/a/u/a.webp");
});

test("authors are named plainly, including when their account was deleted", () => {
  assert.equal(authorLabel({ authorDeleted: true, authorUsername: null, authorName: null }), "Deleted user");
  assert.equal(authorLabel({ authorDeleted: false, authorUsername: "ada", authorName: "Ada" }), "@ada");
  assert.equal(authorLabel({ authorDeleted: false, authorUsername: null, authorName: "Ada" }), "Ada");
  assert.equal(authorLabel({ authorDeleted: false, authorUsername: null, authorName: null }), "A Teressa member");
});

// A stand-in for the database that records how it was asked.
function fake(rows: unknown[], catError = false) {
  const calls: string[] = [];
  const chain: Record<string, unknown> = {
    select: (c: string) => (calls.push(`select ${c.split(",")[0]}`), chain),
    eq: (k: string, v: string) => (calls.push(`eq ${k}=${v}`), chain),
    contains: (k: string, v: unknown[]) => (calls.push(`contains ${k}=${v.join(",")}`), chain),
    or: (f: string) => (calls.push(`or ${f}`), chain),
    order: (k: string) => (calls.push(`order ${k}`), chain),
    range: (a: number, b: number) => (calls.push(`range ${a}-${b}`), chain),
    then: (res: (v: unknown) => void) => res({ data: rows, error: null }),
  };
  return { calls, client: { from: (t: string) => (calls.push(`from ${t}`), chain), rpc: async (fn: string) => (catError ? { data: null, error: { message: "x" } } : fn === "gallery_tags" ? { data: [{ tag: "pricing", total: "2" }], error: null } : { data: [{ category: "Cards", total: "3" }], error: null }) } as never };
}

test("the gallery reads only the public view, one page at a time, newest first by default", async () => {
  const f = fake([]);
  await getGallery(f.client, parse(""));
  assert.ok(f.calls.includes("from published_components"));
  assert.ok(!f.calls.some((c) => c.startsWith("from components")));
  assert.deepEqual(f.calls.filter((c) => c.startsWith("order")), ["order published_at", "order id"]);
  assert.ok(f.calls.includes(`range 0-${PAGE_SIZE}`));
});

test("later pages start further on, and 'popular' orders by copies", async () => {
  const f = fake([]);
  await getGallery(f.client, parse("?page=3&sort=popular&category=Cards"));
  assert.ok(f.calls.includes(`range ${2 * PAGE_SIZE}-${3 * PAGE_SIZE}`));
  assert.equal(f.calls.find((c) => c.startsWith("order")), "order copies");
  assert.ok(f.calls.includes("eq category=Cards"));
});

test("filtering by a tag asks the database for components whose tags contain it, and it combines with a category", async () => {
  const f = fake([]);
  await getGallery(f.client, parse("?tag=pricing&category=Cards"));
  assert.ok(f.calls.includes("contains tags=pricing"));
  assert.ok(f.calls.includes("eq category=Cards"));
});

test("a search becomes a safe name/description/tag filter", async () => {
  const f = fake([]);
  await getGallery(f.client, parse("?q=data%20table),x"));
  const filter = f.calls.find((c) => c.startsWith("or "))!;
  assert.match(filter, /name\.ilike\.%data%table%x%/);
  assert.equal((filter.match(/\(/g) ?? []).length, 0);
});

test("there is a next page only when more than a page came back", async () => {
  const row = (i: number) => ({ id: String(i), slug: `s${i}`, name: `n${i}`, description: "", category: "c", tags: [], version: 1, copies: 0, author_id: "u" });
  const full = await getGallery(fake(Array.from({ length: PAGE_SIZE + 1 }, (_, i) => row(i))).client, parse(""));
  assert.equal(full.items.length, PAGE_SIZE);
  assert.equal(full.hasMore, true);
  const last = await getGallery(fake(Array.from({ length: 5 }, (_, i) => row(i))).client, parse(""));
  assert.equal(last.hasMore, false);
  assert.equal(last.items.length, 5);
});

test("if the category list can't load, the gallery still does", async () => {
  const r = await getGallery(fake([], true).client, parse(""));
  assert.deepEqual(r.categories, []);
  assert.deepEqual(r.tags, []);
  const ok = await getGallery(fake([]).client, parse(""));
  assert.deepEqual(ok.categories, [{ category: "Cards", total: 3 }]);
  assert.deepEqual(ok.tags, [{ tag: "pricing", total: 2 }]);
});
