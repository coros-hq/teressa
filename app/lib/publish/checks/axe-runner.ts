import type { AuditResult, Theme } from "./types.ts";

// Drives the sandboxed preview: asks it to audit the code once per theme, waits (with a time
// limit) and hands back both results. The preview does the actual rendering and axe run; this
// only sequences the requests, so it can be tested with a stand-in.

export type AuditFn = (code: string, theme: Theme) => Promise<AuditResult | null>;

export class AuditUnavailable extends Error {}

export const AUDIT_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AuditUnavailable(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Light, then dark. Throws AuditUnavailable when the preview doesn't answer. */
export async function runAudits(audit: AuditFn, code: string, timeoutMs = AUDIT_TIMEOUT_MS): Promise<AuditResult[]> {
  const results: AuditResult[] = [];
  for (const theme of ["light", "dark"] as const) {
    const r = await withTimeout(audit(code, theme), timeoutMs, `The preview didn't answer for ${theme} mode.`);
    if (!r) throw new AuditUnavailable("The preview isn't ready yet.");
    results.push(r);
  }
  return results;
}
