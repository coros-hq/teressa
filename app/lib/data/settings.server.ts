import type { SupabaseClient } from "@supabase/supabase-js";

import {
  NOTIFICATION_COLUMNS, NOTIFICATION_DEFAULTS, isNotificationKey, validateEmailAddress, validateNewPassword,
  type NotificationKey, type NotificationPrefs,
} from "../settings/validation.ts";

// ---- notification preferences -------------------------------------------------------------------------------

/** Someone who has never changed a toggle has no row, and gets the defaults. */
export async function getNotificationPrefs(supabase: SupabaseClient, userId: string): Promise<NotificationPrefs> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("new_feedback, comment_replies, feedback_addressed, product_updates")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Couldn't load your email preferences.");
  if (!data) return { ...NOTIFICATION_DEFAULTS };
  const row = data as Record<string, boolean>;
  return Object.fromEntries(
    (Object.keys(NOTIFICATION_COLUMNS) as NotificationKey[]).map((k) => [k, row[NOTIFICATION_COLUMNS[k]]]),
  ) as NotificationPrefs;
}

export async function setNotificationPref(supabase: SupabaseClient, userId: string, key: unknown, value: unknown) {
  if (!isNotificationKey(key) || typeof value !== "boolean") return { ok: false as const, message: "That setting couldn't be read." };
  const column = NOTIFICATION_COLUMNS[key];
  const failed = { ok: false as const, message: "Couldn't save that. Try again." };

  // Update the row if there is one. (A combined "upsert" would need permission to rewrite user_id,
  // which people deliberately don't have.)
  const update = () => supabase.from("notification_preferences").update({ [column]: value }).eq("user_id", userId).select("user_id");
  const first = await update();
  if (first.error) return failed;
  if ((first.data ?? []).length > 0) return { ok: true as const };

  // No row yet: this is the first change this person has made.
  const insert = await supabase.from("notification_preferences").insert({ user_id: userId, [column]: value });
  if (!insert.error) return { ok: true as const };
  // Two changes at once can both try to create the row; the loser just updates it.
  if (insert.error.code === "23505") {
    const retry = await update();
    return !retry.error && (retry.data ?? []).length > 0 ? { ok: true as const } : failed;
  }
  return failed;
}

// ---- account --------------------------------------------------------------------------------------------------------

export type AccountInfo = {
  email: string;
  /** An address someone asked to change to, waiting for the confirmation link. */
  pendingEmail: string | null;
  identities: { id: string; provider: string }[];
  /** Signs in with an email and password (or has set one). */
  hasPassword: boolean;
};

export async function getAccount(supabase: SupabaseClient): Promise<AccountInfo> {
  const { data: u, error } = await supabase.auth.getUser();
  if (error || !u.user) throw new Error("Couldn't load your account.");
  const { data: ids } = await supabase.auth.getUserIdentities();
  const identities = (ids?.identities ?? []).map((i) => ({ id: i.identity_id, provider: i.provider }));
  return {
    email: u.user.email ?? "",
    pendingEmail: (u.user as { new_email?: string }).new_email ?? null,
    identities,
    hasPassword: identities.some((i) => i.provider === "email"),
  };
}

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string; fieldErrors?: Record<string, string>; needsReauth?: boolean };

export async function requestEmailChange(supabase: SupabaseClient, currentEmail: string, next: string, redirectTo: string): Promise<ActionResult> {
  const problem = validateEmailAddress(next);
  if (problem) return { ok: false, message: problem, fieldErrors: { email: problem } };
  if (next.trim().toLowerCase() === currentEmail.toLowerCase()) {
    return { ok: false, message: "That's already your email.", fieldErrors: { email: "That's already your email." } };
  }
  const { error } = await supabase.auth.updateUser({ email: next.trim() }, { emailRedirectTo: redirectTo });
  // An address that is already in use looks exactly like success, so this can't be used to find out
  // who has an account. (The link simply never arrives for them.)
  if (error && !/already|registered|exists/i.test(error.message)) {
    return { ok: false, message: "We couldn't start the email change. Try again in a moment." };
  }
  return { ok: true };
}

export async function changePassword(
  supabase: SupabaseClient,
  verifier: Pick<SupabaseClient, "auth">,
  args: { email: string; hasPassword: boolean; current: string; next: string; confirm: string; nonce?: string },
): Promise<ActionResult> {
  const errors = validateNewPassword(args.next, args.confirm);
  if (errors.password || errors.confirm) {
    return { ok: false, message: errors.password ?? errors.confirm!, fieldErrors: { ...(errors.password && { password: errors.password }), ...(errors.confirm && { confirm: errors.confirm }) } };
  }
  // People who already have a password prove they know it. A separate client checks it, so the
  // current session isn't touched. (People who only signed in with GitHub have nothing to prove here.)
  if (args.hasPassword) {
    const { error } = await verifier.auth.signInWithPassword({ email: args.email, password: args.current });
    if (error) return { ok: false, message: "That password isn't right.", fieldErrors: { current: "That password isn't right." } };
  }
  const { error } = await supabase.auth.updateUser({ password: args.next, ...(args.nonce ? { nonce: args.nonce } : {}) });
  if (error) {
    if (/reauth|nonce/i.test(error.message)) return { ok: false, needsReauth: true, message: "For your security, enter the code we just emailed you." };
    if (/same|different/i.test(error.message)) return { ok: false, message: "Choose a password you haven't used here before.", fieldErrors: { password: "Choose a different password." } };
    return { ok: false, message: "We couldn't change your password. Try again." };
  }
  return { ok: true };
}

export async function sendReauthCode(supabase: SupabaseClient): Promise<ActionResult> {
  const { error } = await supabase.auth.reauthenticate();
  return error ? { ok: false, message: "We couldn't send a code. Try again in a moment." } : { ok: true };
}

export async function startLinkGithub(supabase: SupabaseClient, redirectTo: string): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const { data, error } = await supabase.auth.linkIdentity({ provider: "github", options: { redirectTo, skipBrowserRedirect: true } });
  if (error || !data?.url) {
    const code = (error as { code?: string } | null)?.code ?? "";
    // Two things must be switched on in the sign-in settings before this can work: linking accounts, and GitHub itself.
    if (code === "manual_linking_disabled" || /manual linking/i.test(error?.message ?? "")) {
      return { ok: false, message: "Connecting accounts isn't turned on yet." };
    }
    if (/provider|not enabled|unsupported/i.test(error?.message ?? "")) return { ok: false, message: "GitHub sign-in isn't set up yet." };
    return { ok: false, message: "We couldn't connect GitHub. Try again." };
  }
  return { ok: true, url: data.url };
}

export async function unlinkIdentity(supabase: SupabaseClient, identityId: string): Promise<ActionResult> {
  const { data } = await supabase.auth.getUserIdentities();
  const all = data?.identities ?? [];
  // The last way to sign in can never be removed, whatever the browser asked for.
  if (all.length < 2) return { ok: false, message: "This is your only way to sign in, so it can't be disconnected." };
  const target = all.find((i) => i.identity_id === identityId);
  if (!target) return { ok: false, message: "That account isn't connected." };
  const { error } = await supabase.auth.unlinkIdentity(target);
  return error ? { ok: false, message: "We couldn't disconnect that account. Try again." } : { ok: true };
}

export async function signOutOtherDevices(supabase: SupabaseClient): Promise<ActionResult> {
  const { error } = await supabase.auth.signOut({ scope: "others" });
  return error ? { ok: false, message: "We couldn't sign out your other devices. Try again." } : { ok: true };
}
