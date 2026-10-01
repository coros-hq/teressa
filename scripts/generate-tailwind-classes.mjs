// Writes the list of Tailwind class names and variants the code editor suggests, taken from the app's
// own stylesheet, so theme classes like bg-primary are included. Run it again after changing the theme
// or upgrading Tailwind:  node scripts/generate-tailwind-classes.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { __unstable__loadDesignSystem } from "tailwindcss";

const require = createRequire(import.meta.url);
const css = readFileSync("app/app.css", "utf8")
  // Fonts are not part of the class list and have no stylesheet to resolve here.
  .replace(/@import "@fontsource[^"]*";\n/g, "");

// Finds a stylesheet the way the build does: "pkg/file.css" is a file in the package, and a bare
// "pkg" is whatever its package.json offers for the "style" condition.
function resolveStyle(id, base) {
  if (id.startsWith(".")) return resolve(base, id);
  const [scope, name, ...rest] = id.startsWith("@") ? id.split("/") : [null, ...id.split("/")];
  const pkgName = scope ? `${scope}/${name}` : name;
  const sub = rest.join("/");
  const dir = resolve("node_modules", pkgName);
  const pkg = JSON.parse(readFileSync(resolve(dir, "package.json"), "utf8"));
  const pick = (v) => (typeof v === "string" ? v : v?.style ?? v?.default);
  if (sub) return resolve(dir, pick(pkg.exports?.[`./${sub}`]) ?? sub);
  const root = pkg.exports?.["."];
  const entry = pick(root) ?? pkg.style ?? pkg.main ?? "index.css";
  return resolve(dir, typeof entry === "string" ? entry : entry.default);
}

const design = await __unstable__loadDesignSystem(css, {
  base: resolve("app"),
  loadStylesheet: async (id, base) => {
    const path = id === "tailwindcss" ? require.resolve("tailwindcss/index.css") : resolveStyle(id, base);
    return { path, base: dirname(path), content: readFileSync(path, "utf8") };
  },
});

const classes = design.getClassList().map(([name]) => name).filter((n) => !n.includes("*"));
// Plain variants (hover, md, dark) as they are; functional ones (aria, min, group) with each of their
// known values (aria-checked, min-lg, group-hover). Ones that only take a free value (data-[...]) are left out.
const variants = [];
for (const v of design.getVariants()) {
  if (v.name.includes("*")) continue;
  if (v.values.length) for (const value of v.values) variants.push(v.name === "@" ? `@${value}` : `${v.name}-${value}`);
  else if (!v.isArbitrary) variants.push(v.name);
}
const out = { classes: [...new Set(classes)].sort(), variants: [...new Set(variants)].sort() };
writeFileSync("app/components/studio/tailwind-classes.json", JSON.stringify(out));
console.log(`${out.classes.length} classes, ${out.variants.length} variants`);
