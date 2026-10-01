import type { Route } from "./+types/settings-account";
import {
  changePassword, getAccount, requestEmailChange, sendReauthCode, signOutOtherDevices, startLinkGithub, unlinkIdentity,
} from "~/lib/data/settings.server";
import { guard } from "~/lib/security.server";
import { createPublicClient } from "~/lib/supabase/server";

// POST { intent, ... } for everything on the Account section. Nothing here logs emails or passwords.
export async function action({ request }: Route.ActionArgs) {
  const g = await guard(request);
  if ("response" in g) return g.response;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return g.json({ ok: false, message: "That request couldn't be read." }, 400);
  }
  const text = (k: string) => (typeof body[k] === "string" ? (body[k] as string) : "");
  const origin = new URL(request.url).origin;
  const back = `${origin}/auth/confirm?next=/settings/account`;
  const status = (r: { ok: boolean }) => (r.ok ? 200 : 400);

  switch (body.intent) {
    case "change-email": {
      const account = await getAccount(g.supabase);
      const r = await requestEmailChange(g.supabase, account.email, text("email"), back);
      return g.json(r, status(r));
    }
    case "change-password": {
      const account = await getAccount(g.supabase);
      const r = await changePassword(g.supabase, createPublicClient(), {
        email: account.email,
        hasPassword: account.hasPassword,
        current: text("current"),
        next: text("password"),
        confirm: text("confirm"),
        nonce: text("nonce") || undefined,
      });
      return g.json(r, status(r));
    }
    case "send-code": {
      const r = await sendReauthCode(g.supabase);
      return g.json(r, status(r));
    }
    case "link-github": {
      const r = await startLinkGithub(g.supabase, back);
      return g.json(r, status(r));
    }
    case "unlink": {
      const r = await unlinkIdentity(g.supabase, text("identityId"));
      return g.json(r, status(r));
    }
    case "sign-out-others": {
      const r = await signOutOtherDevices(g.supabase);
      return g.json(r, status(r));
    }
    default:
      return g.json({ ok: false, message: "That request couldn't be read." }, 400);
  }
}
