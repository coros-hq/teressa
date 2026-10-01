import { CHECK_ORDER, type CheckId, type CheckResult } from "./types.ts";

// The publish dialog's check progress, as plain data, so the rules are easy to test:
// - results belong to one exact version of the code (its hash) and go stale when it changes
// - Publish needs all four checks passed; warnings never block; a crashed check is not a pass

export type CheckState =
  | { status: "pending" }
  | { status: "running" }
  | { status: "done"; result: CheckResult };

export type ChecksState = {
  /** Hash of the code these results are for. Null before the first run. */
  codeHash: string | null;
  checks: Record<CheckId, CheckState>;
};

export const initialChecks = (): ChecksState => ({
  codeHash: null,
  checks: Object.fromEntries(CHECK_ORDER.map((id) => [id, { status: "pending" }])) as ChecksState["checks"],
});

export const startRun = (codeHash: string): ChecksState => ({ ...initialChecks(), codeHash });

export const markRunning = (s: ChecksState, id: CheckId): ChecksState => ({
  ...s,
  checks: { ...s.checks, [id]: { status: "running" } },
});

export const setResult = (s: ChecksState, result: CheckResult): ChecksState => ({
  ...s,
  checks: { ...s.checks, [result.id]: { status: "done", result } },
});

/** Results exist for different code than the code now. */
export const isStale = (s: ChecksState, currentHash: string) => s.codeHash !== null && s.codeHash !== currentHash;

export const isRunning = (s: ChecksState) => CHECK_ORDER.some((id) => s.checks[id].status === "running");

export const hasFailure = (s: ChecksState) =>
  CHECK_ORDER.some((id) => {
    const c = s.checks[id];
    return c.status === "done" && c.result.status !== "passed";
  });

export function canPublish(s: ChecksState, currentHash: string): boolean {
  if (isStale(s, currentHash) || s.codeHash !== currentHash) return false;
  return CHECK_ORDER.every((id) => {
    const c = s.checks[id];
    return c.status === "done" && c.result.status === "passed";
  });
}

/** What the server stores next to the version. Informational: it comes from the browser. */
export function summarize(s: ChecksState) {
  return {
    reportedBy: "browser",
    codeHash: s.codeHash,
    checks: Object.fromEntries(
      CHECK_ORDER.map((id) => {
        const c = s.checks[id];
        const r = c.status === "done" ? c.result : null;
        return [
          id,
          {
            status: r?.status ?? "pending",
            errors: r?.findings.filter((f) => f.severity === "error").length ?? 0,
            warnings: r?.findings.filter((f) => f.severity === "warning").length ?? 0,
          },
        ];
      }),
    ),
  };
}
