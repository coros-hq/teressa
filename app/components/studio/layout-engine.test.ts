import assert from "node:assert/strict";
import { test } from "node:test";

import { arrange, contains, flowStyle, type Item, type Rect } from "./layout-engine.ts";

const r = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
const items = (...rects: Rect[]): Item<number>[] => rects.map((rect, value) => ({ value, rect }));
const values = (b: ReturnType<typeof arrange<number>>): unknown =>
  b.kind === "leaf" ? b.item.value : b.kind === "flow" ? [b.dir, b.blocks.map(values)] : ["abs", b.items.map((i) => i.value)];

test("one layer is just itself", () => assert.deepEqual(values(arrange(items(r(0, 0, 10, 10)))), 0));

test("layers stacked with empty bands between them become a column", () => {
  assert.deepEqual(values(arrange(items(r(0, 0, 100, 20), r(0, 30, 100, 20), r(0, 60, 100, 20)))), ["col", [0, 1, 2]]);
});

test("layers side by side become a row", () => {
  assert.deepEqual(values(arrange(items(r(0, 0, 40, 40), r(50, 0, 40, 40), r(100, 0, 40, 40)))), ["row", [0, 1, 2]]);
});

test("a row inside a column (a label with a field beside it, over a button)", () => {
  const b = arrange(items(r(0, 0, 40, 20), r(50, 0, 100, 20), r(0, 40, 150, 30)));
  assert.deepEqual(values(b), ["col", [["row", [0, 1]], 2]]);
});

test("order follows position, not the order the layers were drawn", () => {
  assert.deepEqual(values(arrange(items(r(0, 60, 10, 10), r(0, 0, 10, 10), r(0, 30, 10, 10)))), ["col", [1, 2, 0]]);
});

test("layers closer than a pixel count as touching, not overlapping", () => {
  assert.deepEqual(values(arrange(items(r(0, 0, 100, 20), r(0, 19.4, 100, 20)))), ["col", [0, 1]]);
});

test("layers that really overlap with no band between them keep their positions", () => {
  assert.deepEqual(values(arrange(items(r(0, 0, 100, 60), r(50, 30, 100, 60)))), ["abs", [0, 1]]);
});

test("only the overlapping part is pinned; the rest still flows", () => {
  const b = arrange(items(r(0, 0, 100, 20), r(0, 40, 100, 60), r(50, 70, 100, 60)));
  assert.deepEqual(values(b), ["col", [0, ["abs", [1, 2]]]]);
});

test("containment (with a hand-drawn half pixel of slack)", () => {
  assert.equal(contains(r(0, 0, 100, 40), r(10, 10, 50, 20)), true);
  assert.equal(contains(r(0, 0, 100, 40), r(10, 10, 100, 20)), false);
  assert.equal(contains(r(0, 0, 100, 40), r(-0.4, 0, 50, 20)), true);
});

test("a column with equal gaps uses one gap, and starts flush left", () => {
  const s = flowStyle("col", r(0, 0, 200, 200), [r(0, 0, 100, 20), r(0, 30, 100, 20), r(0, 60, 100, 20)]);
  assert.deepEqual(s.container, ["flex", "flex-col", "gap-[10px]", "items-start"]);
  assert.ok(s.items.every((i) => i.length === 0));
});

test("unequal gaps become margins on the children that need them", () => {
  const s = flowStyle("col", r(0, 0, 200, 200), [r(0, 0, 100, 20), r(0, 30, 100, 20), r(0, 80, 100, 20)]);
  assert.ok(!s.container.some((c) => c.startsWith("gap-")));
  assert.deepEqual(s.items, [[], ["mt-[10px]"], ["mt-[30px]"]]);
});

test("content centered in its box is centered by the layout, not by padding", () => {
  const s = flowStyle("col", r(0, 0, 100, 50), [r(30, 15, 40, 20)]);
  assert.deepEqual(s.container, ["flex", "flex-col", "justify-center", "items-center"]);
});

test("content that isn't centered gets the padding it has", () => {
  const s = flowStyle("col", r(0, 0, 100, 100), [r(16, 24, 60, 20)]);
  assert.deepEqual(s.container, ["flex", "flex-col", "pt-[24px]", "items-start", "pl-[16px]"]);
});

test("a row aligns across its height", () => {
  const centered = flowStyle("row", r(0, 0, 200, 60), [r(10, 20, 40, 20), r(60, 10, 40, 40)]);
  assert.ok(centered.container.includes("items-center") && centered.container.includes("flex-row"));
  const top = flowStyle("row", r(0, 0, 200, 60), [r(0, 0, 40, 20), r(60, 0, 40, 40)]);
  assert.ok(top.container.includes("items-start"));
  const bottom = flowStyle("row", r(0, 0, 200, 60), [r(0, 40, 40, 20), r(60, 20, 40, 40)]);
  assert.ok(bottom.container.includes("items-end"));
});

test("children at different distances from the edge are each nudged", () => {
  const s = flowStyle("col", r(0, 0, 200, 100), [r(10, 0, 50, 20), r(40, 30, 50, 20)]);
  assert.ok(s.container.includes("pl-[10px]"));
  assert.deepEqual(s.items, [[], ["ml-[30px]"]]);
});

test("content pushed to the end of the flow uses justify-end", () => {
  const s = flowStyle("col", r(0, 0, 100, 100), [r(0, 70, 100, 30)]);
  assert.ok(s.container.includes("justify-end"));
});

test("a label a pixel or two off-center is treated as centered", () => {
  const s = flowStyle("col", r(0, 0, 180, 60), [r(55, 20, 70, 24)]); // 20 above, 16 below
  assert.ok(s.container.includes("justify-center") && s.container.includes("items-center"));
  const far = flowStyle("col", r(0, 0, 180, 60), [r(55, 28, 70, 24)]); // 28 above, 8 below: really sits low
  assert.ok(!far.container.includes("justify-center"));
});
