import geistMonoUrl from "@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?url";
import outfitUrl from "@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2?url";

import type { FontPayload, ThemeVars } from "./preview-protocol";

// Reads the app's theme tokens (light and dark) out of its own stylesheets, so the preview always
// matches the app without duplicating any color values here.
export function collectThemeVars(): { light: ThemeVars; dark: ThemeVars } {
  const light: ThemeVars = {};
  const dark: ThemeVars = {};

  const readRule = (rule: CSSStyleRule, into: ThemeVars) => {
    for (let i = 0; i < rule.style.length; i++) {
      const name = rule.style[i];
      if (name.startsWith("--")) into[name] = rule.style.getPropertyValue(name).trim();
    }
  };
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        // A rule may list several selectors (":root, .light"): it counts if one of them is ours.
        const selectors = rule.selectorText.split(",").map((x) => x.replace(/\s+/g, ""));
        if (selectors.includes(":root")) readRule(rule, light);
        else if (selectors.includes(".dark")) readRule(rule, dark);
      } else if ("cssRules" in rule) {
        walk((rule as CSSGroupingRule).cssRules);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules);
    } catch {
      // cross-origin stylesheet: not ours, skip
    }
  }
  return { light, dark };
}

let fontsPromise: Promise<FontPayload[]> | null = null;

// The sandboxed frame can't fetch our font files itself, so we hand it the bytes.
export function loadFonts(): Promise<FontPayload[]> {
  fontsPromise ??= Promise.all(
    [
      { family: "Outfit Variable", weight: "100 900", url: outfitUrl },
      { family: "Geist Mono Variable", weight: "100 900", url: geistMonoUrl },
    ].map(async ({ family, weight, url }) => ({
      family,
      weight,
      data: await (await fetch(url)).arrayBuffer(),
    }))
  ).catch(() => []);
  return fontsPromise;
}
