import { useCallback, useEffect, useRef, useState } from "react";

import type { AuditFn } from "~/lib/publish/checks/axe-runner.ts";
import { runChecks } from "~/lib/publish/checks/run.ts";
import {
  canPublish,
  initialChecks,
  isRunning,
  isStale,
  markRunning,
  setResult,
  startRun,
  type ChecksState,
} from "~/lib/publish/checks/state.ts";
import { sha256Hex } from "~/lib/publish/details.ts";

import { instrument, parseJsx } from "../jsx-tree";

// The Publish dialog's checks for one component's code. Lives in the studio page, not the dialog,
// so results survive closing the dialog, and go stale the moment the code changes.
export function usePublishChecks(code: string | null) {
  const [state, setState] = useState<ChecksState>(initialChecks);
  const [hash, setHash] = useState<string | null>(null);
  const runId = useRef(0);

  useEffect(() => {
    let live = true;
    if (code === null) setHash(null);
    else void sha256Hex(code).then((h) => live && setHash(h));
    return () => {
      live = false;
    };
  }, [code]);

  const run = useCallback(
    async (audit: AuditFn) => {
      if (code === null) return;
      const id = ++runId.current;
      const current = () => runId.current === id;
      setState(startRun(await sha256Hex(code)));

      const nodes = parseJsx(code);
      await runChecks({
        code,
        instrumentedCode: instrument(code, nodes),
        audit,
        lineOfElement: (sid) => nodes[sid]?.line,
        onStart: (check) => current() && setState((s) => markRunning(s, check)),
        onResult: (result) => current() && setState((s) => setResult(s, result)),
        isCancelled: () => !current(),
      });
    },
    [code],
  );

  const stale = hash !== null && isStale(state, hash);
  return {
    state,
    hash,
    run,
    running: isRunning(state),
    stale,
    /** Nothing has run for this exact code yet (first time, or the code changed). */
    needsRun: hash !== null && (state.codeHash === null || stale),
    canPublish: hash !== null && canPublish(state, hash),
  };
}

export type PublishChecks = ReturnType<typeof usePublishChecks>;
