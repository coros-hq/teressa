import { evaluateAccessibility } from "./accessibility.ts";
import { AuditUnavailable, runAudits, type AuditFn } from "./axe-runner.ts";
import { checkCompile } from "./compile.ts";
import { evaluateModes } from "./modes.ts";
import { checkThemeTokens } from "./theme-tokens.ts";
import type { CheckId, CheckResult } from "./types.ts";

// Runs the four checks in order and reports each result as it lands. One check failing never
// stops the others: people should see everything that needs fixing in one go.
export async function runChecks(args: {
  code: string;
  /** Same code with an id on every element, used for the browser scans so findings can point at a line. */
  instrumentedCode: string;
  audit: AuditFn;
  onStart: (id: CheckId) => void;
  onResult: (result: CheckResult) => void;
  /** Adds a line number to findings that only know which element they are about. */
  lineOfElement?: (sid: number) => number | undefined;
  isCancelled?: () => boolean;
}): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const done = (r: CheckResult) => {
    results.push(r);
    args.onResult(r);
  };
  const safe = async (id: CheckId, fn: () => CheckResult | Promise<CheckResult>) => {
    args.onStart(id);
    try {
      done(await fn());
    } catch (e) {
      // The check itself broke. That is never a pass.
      done({ id, status: "crashed", findings: [], error: e instanceof AuditUnavailable ? e.message : "This check couldn't run." });
    }
  };

  await safe("compile", () => checkCompile(args.code));
  if (args.isCancelled?.()) return results;

  // Both browser checks share one scan of each theme.
  args.onStart("accessibility");
  args.onStart("modes");
  let audits;
  try {
    audits = await runAudits(args.audit, args.instrumentedCode);
  } catch (e) {
    const error = e instanceof AuditUnavailable ? e.message : "This check couldn't run.";
    done({ id: "accessibility", status: "crashed", findings: [], error });
    await safe("tokens", () => checkThemeTokens(args.code));
    done({ id: "modes", status: "crashed", findings: [], error });
    return results;
  }
  done(withLines(evaluateAccessibility(audits), audits, args.lineOfElement));
  await safe("tokens", () => checkThemeTokens(args.code));
  done(withLines(evaluateModes(audits), audits, args.lineOfElement));
  return results;
}

// Findings from a scan carry snippets, not lines. The preview tells us which element each snippet
// is (its data-sid), so we can look up the line it starts on.
function withLines(
  result: CheckResult,
  audits: { violations: { id: string; nodes: { html: string; sid: number | null }[] }[] }[],
  lineOfElement?: (sid: number) => number | undefined,
): CheckResult {
  if (!lineOfElement) return result;
  const sidByHtml = new Map<string, number>();
  for (const a of audits) for (const v of a.violations) for (const n of v.nodes) if (n.sid !== null) sidByHtml.set(n.html, n.sid);
  return {
    ...result,
    findings: result.findings.map((f) => {
      if (f.line !== undefined) return f;
      const sid = f.snippets?.map((s) => sidByHtml.get(s)).find((s) => s !== undefined);
      return { ...f, line: sid === undefined ? undefined : lineOfElement(sid) };
    }),
  };
}
