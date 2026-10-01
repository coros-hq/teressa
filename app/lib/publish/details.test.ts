import assert from "node:assert/strict";
import { test } from "node:test";

import { LIMITS, normalizeTags, sha256Hex, validateCode, validateDetails } from "./details.ts";

const good = { title: "Card", description: "A card.", category: "Cards", tags: ["a"] };

test("valid details have no errors", () => assert.deepEqual(validateDetails(good), {}));

test("required fields and limits", () => {
  assert.deepEqual(Object.keys(validateDetails({ title: " ", description: "", category: "", tags: [] })), ["title", "description", "category"]);
  assert.ok(validateDetails({ ...good, description: "x".repeat(LIMITS.description + 1) }).description);
  assert.ok(validateDetails({ ...good, tags: ["1", "2", "3", "4", "5", "6"] }).tags);
  assert.equal(validateDetails({ ...good, category: "Any free text category" }).category, undefined);
});

test("code must be present and under the limit", () => {
  assert.ok(validateCode("   "));
  assert.ok(validateCode("x".repeat(LIMITS.codeBytes + 1)));
  assert.equal(validateCode("export default () => null"), null);
});

test("tags are cleaned up", () => assert.deepEqual(normalizeTags(["#UI", "ui", " Card "]), ["ui", "card"]));

test("hash matches a known value", async () => {
  assert.equal(await sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
