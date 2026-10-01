import { redirect } from "react-router";
import type { EmailOtpType } from "@supabase/supabase-js";

import type { Route } from "./+types/confirm";
import { createClient } from "~/lib/supabase/server";

// Landing point for links in Supabase emails (confirm sign-up, reset password). Turns the code or
// token in the link into a session cookie, then sends the person on to `next`.
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  // Only allow same-site paths, so the link can't be used as an open redirect.
  const nextParam = url.searchParams.get("next") ?? "/overview";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/overview";

  const { supabase, headers } = createClient(request);
  let error = null;
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else {
    error = new Error("Missing code");
  }

  if (error) {
    // A failed password-reset link goes back to that flow; anything else (confirming a new account,
    // a changed email) lands on sign-in, where signing in works if the account was already confirmed.
    const isReset = type === "recovery" || next.startsWith("/reset-password");
    return redirect(isReset ? "/reset-password?error=invalid" : "/sign-in?notice=confirm-failed", { headers });
  }
  return redirect(next, { headers });
}
