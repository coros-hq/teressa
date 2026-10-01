// Works out what a component needs from its import lines: packages from npm, and the project's own
// UI components. A plain scan of import statements, not a full parse.

export type Dependencies = {
  /** npm packages to install. */
  dependencies: string[];
  /** UI components the project must have, by name (for example "button"). */
  registryDependencies: string[];
  /** Imports we don't know how to supply (relative files, unknown aliases). */
  unsupported: string[];
};

const IMPORT_RE =
  /(?:^|[\s;])(?:import|export)\s+(?:type\s+)?(?:[\w*${}\s,]+?\s+from\s+)?["']([^"']+)["']|\brequire\(\s*["']([^"']+)["']\s*\)|\bimport\(\s*["']([^"']+)["']\s*\)/g;

/** Every module specifier the code imports, in order, without duplicates. */
export function detectImports(code: string): string[] {
  const found = new Set<string>();
  for (const m of code.matchAll(IMPORT_RE)) found.add(m[1] ?? m[2] ?? m[3]);
  return [...found];
}

const ALWAYS_PROVIDED = new Set(["react", "react-dom"]);

function packageName(spec: string): string {
  const parts = spec.split("/");
  return spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

export function classifyImports(code: string): Dependencies {
  const dependencies = new Set<string>();
  const registryDependencies = new Set<string>();
  const unsupported: string[] = [];

  for (const spec of detectImports(code)) {
    const ui = spec.match(/^(?:@|~)\/components\/ui\/([a-z0-9-]+)$/);
    if (ui) registryDependencies.add(ui[1]);
    else if (spec === "@/lib/utils" || spec === "~/lib/utils") continue; // `cn` ships with every project
    else if (spec.startsWith(".") || spec.startsWith("@/") || spec.startsWith("~/")) unsupported.push(spec);
    else if (!ALWAYS_PROVIDED.has(packageName(spec))) dependencies.add(packageName(spec));
  }
  return {
    dependencies: [...dependencies].sort(),
    registryDependencies: [...registryDependencies].sort(),
    unsupported,
  };
}

/** The project alias is `@/` in published files, so the install command can rewrite it. */
export function normalizeImportAlias(code: string): string {
  return code.replace(/(from\s+|import\s+|import\(\s*|require\(\s*)(["'])~\//g, "$1$2@/");
}
