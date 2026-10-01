import { transform } from "sucrase";

import type { CheckResult, Finding } from "./types.ts";

// Check 1: the code turns into JavaScript without syntax errors, and something is exported that
// can be used as a component. It does not run the code (the light/dark check does that).
// Can't catch: type errors (types are stripped, not checked), or code that compiles but throws
// when it runs.

export function checkCompile(code: string): CheckResult {
  let js: string;
  try {
    ({ code: js } = transform(code, {
      transforms: ["typescript", "jsx", "imports"],
      jsxRuntime: "automatic",
      production: true,
      filePath: "component.tsx",
    }));
  } catch (e) {
    return { id: "compile", status: "failed", findings: [syntaxFinding(e)] };
  }

  const findings: Finding[] = [];
  // After the transform, exports look like `exports.default = X` or `exports.Card = Card`.
  const hasDefault = /\bexports\.default\s*=/.test(js);
  const hasNamed = /\bexports\.[A-Z][A-Za-z0-9_]*\s*=/.test(js);
  if (!hasDefault && !hasNamed) {
    findings.push({
      rule: "no-export",
      severity: "error",
      message:
        "Nothing is exported as a component. Add a default export, for example: export default function MyComponent() { … }",
    });
  }
  return { id: "compile", status: findings.length ? "failed" : "passed", findings };
}

function syntaxFinding(e: unknown): Finding {
  const raw = e instanceof Error ? e.message : String(e);
  // The compiler reports positions as "message (line:column)".
  const m = /^(.*)\s\((\d+):(\d+)\)$/s.exec(raw);
  return {
    rule: "syntax-error",
    severity: "error",
    message: `There's a syntax error: ${(m ? m[1] : raw).trim()}.`,
    line: m ? Number(m[2]) : undefined,
  };
}
