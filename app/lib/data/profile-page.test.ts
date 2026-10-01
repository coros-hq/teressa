import assert from "node:assert/strict";
import { test } from "node:test";

import { parseHandle, profileHandle } from "./profile-page.ts";

const ID = "6e40aa41-4de0-4efe-a2b3-1034d5bfcc58";

test("a username is read in lower case", () => {
  assert.deepEqual(parseHandle("Oussama_C"), { by: "username", value: "oussama_c" });
});

test("an id is recognised", () => {
  assert.deepEqual(parseHandle(ID.toUpperCase()), { by: "id", value: ID });
});

test("anything that can't be a person is refused before any query", () => {
  for (const bad of ["", "ab", "1abc", "a b c", "a/b", "x".repeat(31), "name%27--", "-abc", undefined]) assert.equal(parseHandle(bad as string), null, String(bad));
});

test("the handle is the username, or the id when there is none", () => {
  assert.equal(profileHandle({ id: ID, username: "sam" }), "sam");
  assert.equal(profileHandle({ id: ID, username: null }), ID);
  assert.equal(profileHandle({ id: ID, username: "" }), ID);
});
