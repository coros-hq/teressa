import { CONTRAST_RULE } from "./accessibility.ts";
import type { AuditResult, CheckResult, Finding } from "./types.ts";

// Check 4: the component is drawn in both themes. It fails if either drawing throws, comes out
// empty, or has text that axe says is hard to read (contrast). Can't catch: text over images or
// gradients (axe marks those "needs review" and they're skipped), or states not on screen.

export function evaluateModes(audits: AuditResult[]): CheckResult {
  const findings: Finding[] = [];

  for (const a of audits) {
    if (!a.render.ok) {
      findings.push({
        rule: "render-error",
        severity: "error",
        theme: a.theme,
        message: `It couldn't be drawn in ${a.theme} mode: ${a.render.message}`,
      });
      continue;
    }
    if (a.empty) {
      findings.push({
        rule: "empty-output",
        severity: "error",
        theme: a.theme,
        message: `Nothing is drawn in ${a.theme} mode. Make sure the component returns something visible.`,
      });
    }
    if (a.axeError) continue; // reported below, so it isn't read as a pass
    for (const v of a.violations.filter((x) => x.id === CONTRAST_RULE)) {
      findings.push({
        rule: CONTRAST_RULE,
        severity: "error",
        theme: a.theme,
        impact: v.impact ?? "serious",
        message: `Some text is hard to read in ${a.theme} mode (not enough contrast with its background).`,
        snippets: v.nodes.map((n) => n.html),
      });
    }
  }

  const scanFailed = audits.find((a) => a.axeError);
  if (scanFailed && !findings.length) {
    return { id: "modes", status: "crashed", findings, error: "The contrast scan couldn't run." };
  }
  return { id: "modes", status: findings.some((f) => f.severity === "error") ? "failed" : "passed", findings };
}
