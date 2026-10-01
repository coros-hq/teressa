import type { AuditResult, AuditViolation, CheckResult, Finding, Impact, Theme } from "./types.ts";

// Check 2: axe-core runs against the rendered component in the sandboxed preview, in light and dark.
// Serious and critical problems block publishing; minor and moderate ones are shown as warnings.
// Color contrast is reported by the light/dark check instead (see modes.ts), so it isn't listed twice.
// Can't catch: anything axe can't judge from a still render (focus order, keyboard use, screen
// reader wording), or states that aren't on screen (open menus, error messages).

export const BLOCKING_IMPACTS: Impact[] = ["serious", "critical"];
export const CONTRAST_RULE = "color-contrast";

// Plain-language versions of the rules people hit most. Anything else uses axe's own title.
const PLAIN: Record<string, string> = {
  "button-name": "A button has no text or label, so a screen reader can't say what it does.",
  "link-name": "A link has no text or label, so a screen reader can't say where it goes.",
  label: "A form field has no label.",
  "image-alt": "An image has no alternative text.",
  "aria-allowed-attr": "An ARIA attribute is used somewhere it isn't allowed.",
  "aria-required-attr": "An element is missing an ARIA attribute it needs.",
  "aria-valid-attr-value": "An ARIA attribute has a value that isn't valid.",
  "aria-roles": "An element uses a role that doesn't exist.",
  "duplicate-id": "Two elements share the same id.",
  "heading-order": "Headings skip a level.",
  "empty-heading": "A heading has no text.",
  "svg-img-alt": "An SVG image has no text alternative.",
  "select-name": "A dropdown has no label.",
  "input-image-alt": "An image button has no text alternative.",
  "nested-interactive": "A button or link contains another button or link.",
  tabindex: "Something uses a tabindex above 0, which makes the tab order confusing.",
};

export function toFindings(violations: AuditViolation[], theme: Theme): Finding[] {
  return violations
    .filter((v) => v.id !== CONTRAST_RULE)
    .map((v) => {
      const blocking = v.impact !== null && BLOCKING_IMPACTS.includes(v.impact);
      return {
        rule: v.id,
        severity: blocking ? ("error" as const) : ("warning" as const),
        impact: v.impact ?? "minor",
        theme,
        message: `${PLAIN[v.id] ?? v.help} (${v.id}, ${v.impact ?? "minor"} impact, ${theme} mode)`,
        snippets: v.nodes.map((n) => n.html),
      };
    });
}

/** Turns the two audits (light, dark) into the check result. `audits` holds one per theme. */
export function evaluateAccessibility(audits: AuditResult[]): CheckResult {
  const broken = audits.find((a) => a.axeError || !a.render.ok);
  if (broken) {
    return {
      id: "accessibility",
      status: "crashed",
      findings: [],
      error: broken.axeError
        ? "The accessibility scan couldn't run."
        : `The component couldn't be drawn in ${broken.theme} mode, so it couldn't be scanned.`,
    };
  }
  const findings = audits.flatMap((a) => toFindings(a.violations, a.theme));
  return {
    id: "accessibility",
    status: findings.some((f) => f.severity === "error") ? "failed" : "passed",
    findings,
  };
}
