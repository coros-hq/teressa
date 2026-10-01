import { classifyImports, normalizeImportAlias } from "./dependencies.ts";

// The JSON that `npx shadcn add <url>` reads. Field names follow the registry-item schema:
// https://ui.shadcn.com/schema/registry-item.json (JSON Schema draft-07, read on 2026-09-30),
// documented at https://ui.shadcn.com/docs/registry/registry-item-json

export const REGISTRY_SCHEMA_URL = "https://ui.shadcn.com/schema/registry-item.json";

export type RegistryItem = {
  $schema: string;
  name: string;
  type: "registry:component";
  title: string;
  description: string;
  dependencies: string[];
  registryDependencies: string[];
  files: { path: string; content: string; type: "registry:component" }[];
  categories: string[];
  meta: { version: number; license: string; tags: string[]; publishedAt: string };
};

export type PublishedVersion = {
  slug: string;
  version: number;
  code: string;
  details: { title: string; description: string; category: string; tags: string[]; license?: string };
  publishedAt: string;
};

export function buildRegistryItem(v: PublishedVersion): RegistryItem {
  // Both lists come from the code itself, so they always match what the file really imports.
  const { dependencies, registryDependencies } = classifyImports(v.code);
  return {
    $schema: REGISTRY_SCHEMA_URL,
    name: v.slug,
    type: "registry:component",
    title: v.details.title,
    description: v.details.description,
    dependencies,
    registryDependencies,
    files: [
      {
        path: `components/${v.slug}.tsx`,
        content: normalizeImportAlias(v.code),
        type: "registry:component",
      },
    ],
    categories: [v.details.category],
    meta: {
      version: v.version,
      license: v.details.license ?? "MIT",
      tags: v.details.tags,
      publishedAt: v.publishedAt,
    },
  };
}

/** Parses "my-card.json" or "my-card@2.json". Null when it isn't one of those. */
export function parseRegistryFile(file: string): { slug: string; version: number | null } | null {
  const m = /^([a-z0-9][a-z0-9-]*)(?:@([1-9][0-9]{0,8}))?\.json$/.exec(file);
  return m ? { slug: m[1], version: m[2] ? Number(m[2]) : null } : null;
}
