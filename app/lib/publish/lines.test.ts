import assert from "node:assert/strict";
import { test } from "node:test";

import { offsetOfLine } from "./lines.ts";

test("finds the start of a line, after its indentation", () => {
  const code = "a\n  bb\nccc";
  assert.equal(offsetOfLine(code, 1), 0);
  assert.equal(offsetOfLine(code, 2), 4);
  assert.equal(offsetOfLine(code, 3), 7);
});

test("a line past the end goes to the end", () => assert.equal(offsetOfLine("a\nb", 9), 3));
