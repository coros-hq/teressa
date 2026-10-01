import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { validateAgainstSchema } from "./json-schema.ts";
import { buildRegistryItem, parseRegistryFile, type PublishedVersion } from "./registry.ts";

// A copy of https://ui.shadcn.com/schema/registry-item.json (draft-07), kept next to this file so
// the test runs offline. `pnpm validate:registry <url>` checks a live endpoint against the live schema.
const schema = JSON.parse(readFileSync(new URL("./registry-item.schema.json", import.meta.url), "utf8"));

const example: PublishedVersion = {
  slug: "notification-card",
  version: 2,
  publishedAt: "2026-09-30T12:00:00Z",
  details: { title: "Notification card", description: "A card for a single notification.", category: "Cards", tags: ["card", "notification"] },
  code: `import { Bell } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
export default function NotificationCard() { return <Button><Bell /></Button>; }
`,
};

test("an example published component matches the registry schema", () => {
  assert.deepEqual(validateAgainstSchema(buildRegistryItem(example), schema), []);
});

test("maps imports to dependencies and registryDependencies", () => {
  const item = buildRegistryItem(example);
  assert.deepEqual(item.dependencies, ["lucide-react"]);
  assert.deepEqual(item.registryDependencies, ["avatar", "button"]);
  assert.equal(item.name, "notification-card");
  assert.equal(item.type, "registry:component");
  assert.equal(item.files[0].path, "components/notification-card.tsx");
  assert.equal(item.files[0].type, "registry:component");
  assert.match(item.files[0].content, /from "@\/components\/ui\/button"/);
});

test("the validator catches real schema violations", () => {
  const bad = { ...buildRegistryItem(example), type: "registry:nonsense" };
  assert.ok(validateAgainstSchema(bad, schema).length > 0);
  assert.ok(validateAgainstSchema({ name: "x", type: "registry:component", files: [{ content: "x" }] }, schema).length > 0);
  assert.ok(validateAgainstSchema({ type: "registry:component" }, schema).length > 0);
});

test("file names: latest and pinned versions, nothing else", () => {
  assert.deepEqual(parseRegistryFile("my-card.json"), { slug: "my-card", version: null });
  assert.deepEqual(parseRegistryFile("my-card@3.json"), { slug: "my-card", version: 3 });
  for (const bad of ["my-card", "My-Card.json", "my-card@0.json", "my-card@x.json", "../etc.json", "a/b.json", ".json"]) {
    assert.equal(parseRegistryFile(bad), null, bad);
  }
});
