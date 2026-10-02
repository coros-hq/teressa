import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

import { Button } from "~/components/ui/button";
import { SIGNED_IN_PATH, SIGNED_OUT_PATH } from "~/lib/paths";

export function meta() {
  return [{ title: "Teressa" }];
}

type State = "checking" | "failed";

// The loading screen shows at once (it needs no data), while the session is checked in the background.
export default function Home() {
  const navigate = useNavigate();
  const [state, setState] = useState<State>("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState("checking");
    fetch("/api/session", { signal: controller.signal, cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad answer"))))
      .then((body: { authenticated?: boolean }) => navigate(body.authenticated ? SIGNED_IN_PATH : SIGNED_OUT_PATH, { replace: true }))
      .catch((e) => {
        if (e?.name !== "AbortError") setState("failed");
      });
    return () => controller.abort();
  }, [attempt, navigate]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return (
    <main className="bg-background text-foreground grid min-h-svh place-items-center p-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <img src="/logo.svg" alt="" width={47} height={44} className="h-14 w-auto" />
        <p className="text-2xl font-bold tracking-tight">Teressa</p>

        {state === "checking" ? (
          <p role="status" aria-live="polite" className="text-muted-foreground flex items-center gap-2 text-sm">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
            Getting things ready…
          </p>
        ) : (
          <div role="alert" className="grid justify-items-center gap-3">
            <p className="text-sm">We couldn&apos;t check your session. Check your connection and try again.</p>
            <Button className="min-h-11" onClick={retry}>
              Try again
            </Button>
          </div>
        )}

        {/* Without JavaScript the check can't run, so offer the public page directly. */}
        <noscript>
          <Link to={SIGNED_OUT_PATH} className="text-sm underline underline-offset-4">
            Continue to explore
          </Link>
        </noscript>
      </div>
    </main>
  );
}
