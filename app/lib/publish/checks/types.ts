// Shared shapes for the publish checks. Types only, so it is safe to import from anywhere.

export type Theme = "light" | "dark";
export type Impact = "minor" | "moderate" | "serious" | "critical";
export type CheckId = "compile" | "accessibility" | "tokens" | "modes";

export const CHECK_ORDER: CheckId[] = ["compile", "accessibility", "tokens", "modes"];

export const CHECK_TITLES: Record<CheckId, string> = {
  compile: "Code compiles",
  accessibility: "Accessibility",
  tokens: "Theme tokens",
  modes: "Light and dark mode",
};

export type Finding = {
  /** Short machine name, for example "color-contrast" or "hex-color". */
  rule: string;
  /** Plain-language sentence for the person reading it. */
  message: string;
  /** Errors block publishing; warnings don't. */
  severity: "error" | "warning";
  line?: number;
  impact?: Impact;
  theme?: Theme;
  /** The elements involved, as short HTML snippets. */
  snippets?: string[];
};

export type CheckResult = {
  id: CheckId;
  /** "crashed" means the check itself couldn't run. It never counts as a pass. */
  status: "passed" | "failed" | "crashed";
  findings: Finding[];
  /** Set when status is "crashed". */
  error?: string;
};

// ---- what the sandboxed preview sends back after auditing one theme ---------------------------

export type AuditViolation = {
  id: string;
  impact: Impact | null;
  /** axe's short title, for example "Elements must meet minimum color contrast ratio thresholds". */
  help: string;
  /** Elements involved; `sid` is the preview's element id when it could be found. */
  nodes: { html: string; sid: number | null }[];
};

export type AuditResult = {
  theme: Theme;
  render: { ok: true } | { ok: false; phase: "compile" | "runtime"; message: string };
  /** The component rendered, but drew nothing. */
  empty: boolean;
  violations: AuditViolation[];
  /** Set when axe itself failed to run. */
  axeError?: string;
};
