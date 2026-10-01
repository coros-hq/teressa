import assert from "node:assert/strict";
import { test } from "node:test";

import { safeNextPath } from "./safe-redirect.ts";

test("same-site paths are kept, with their query and hash", () => {
  assert.equal(safeNextPath("/c/button#feedback"), "/c/button#feedback");
  assert.equal(safeNextPath("/explore?tag=card"), "/explore?tag=card");
});

test("anything that could leave the site falls back", () => {
  for (const bad of ["https://evil.test", "//evil.test", "/\\evil.test", "javascript:alert(1)", "evil", "", null, undefined, "/ok\nSet-Cookie: x"]) {
    assert.equal(safeNextPath(bad as string | null), "/overview", String(bad));
  }
  assert.equal(safeNextPath("//x", "/home"), "/home");
});
