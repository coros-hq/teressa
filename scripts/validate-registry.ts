// Fetches a published component's registry JSON and checks it against the registry-item schema.
//   pnpm validate:registry https://your-site.example/r/my-component.json
// Uses the live schema from ui.shadcn.com, falling back to the copy in the repo when offline.
import { readFileSync } from "node:fs";

import { validateAgainstSchema } from "../app/lib/publish/json-schema.ts";
import { REGISTRY_SCHEMA_URL } from "../app/lib/publish/registry.ts";

const url = process.argv[2];
if (!url) {
  console.error("Usage: pnpm validate:registry <url to /r/<slug>.json>");
  process.exit(2);
}

async function loadSchema() {
  try {
    const res = await fetch(REGISTRY_SCHEMA_URL);
    if (res.ok) return { schema: await res.json(), source: REGISTRY_SCHEMA_URL };
  } catch {}
  const local = new URL("../app/lib/publish/registry-item.schema.json", import.meta.url);
  return { schema: JSON.parse(readFileSync(local, "utf8")), source: "local copy" };
}

const res = await fetch(url);
const type = res.headers.get("content-type") ?? "";
if (!res.ok) {
  console.error(`FAIL: ${url} answered ${res.status}`);
  process.exit(1);
}
if (!type.includes("application/json")) {
  console.error(`FAIL: content-type is "${type}", expected application/json`);
  process.exit(1);
}

const { schema, source } = await loadSchema();
const errors = validateAgainstSchema(await res.json(), schema);
if (errors.length) {
  console.error(`FAIL: does not match the schema (${source}):\n - ${errors.join("\n - ")}`);
  process.exit(1);
}
console.log(`OK: ${url} matches the registry-item schema (${source}). Cache-Control: ${res.headers.get("cache-control")}`);
