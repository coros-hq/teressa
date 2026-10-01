import type { SupabaseClient } from "@supabase/supabase-js";

import { confirmationMatches } from "../settings/validation.ts";
import { removePreviewsOf } from "./previews.server.ts";

// Deleting an account, with the service role. It is the only place that does, and it only runs
// after the caller's session was verified by the route. Every step can be repeated, so a deletion
// that stopped half way is finished by running it again (the database remembers the first choice).
//
//   1. the database clears the person's data (comments and drafts; published components deleted or kept)
//   2. their avatar files are removed
//   3. the sign-in account is deleted (which removes the profile and preferences)
//   4. the bookkeeping row is cleared

export type DeleteResult = { ok: true } | { ok: false; status: number; message: string };

export async function deleteAccount(
  admin: SupabaseClient,
  args: { userId: string; username: string | null; confirmation: unknown; keepPublished: unknown },
): Promise<DeleteResult> {
  if (typeof args.confirmation !== "string" || !confirmationMatches(args.confirmation, args.username)) {
    return { ok: false, status: 400, message: "What you typed doesn't match. Nothing was deleted." };
  }
  if (typeof args.keepPublished !== "boolean") return { ok: false, status: 400, message: "Choose what happens to your published components." };

  const begin = await admin.rpc("begin_account_deletion", { p_user: args.userId, p_keep_published: args.keepPublished });
  if (begin.error) {
    if (begin.error.message === "rate_limited") return { ok: false, status: 429, message: "Too many attempts. Wait a little while and try again." };
    return { ok: false, status: 500, message: "Something went wrong. Nothing more was deleted. Try again to finish." };
  }

  // The preview images of the components that were just deleted go too (kept components keep theirs).
  const deleted = (begin.data as { deleted_component_ids?: unknown } | null)?.deleted_component_ids;
  const ids = Array.isArray(deleted) ? deleted.filter((x): x is string => typeof x === "string") : [];
  if (!(await removePreviewsOf(admin, ids))) return { ok: false, status: 500, message: "Something went wrong. Try again to finish." };

  const bucket = admin.storage.from("avatars");
  const listed = await bucket.list(args.userId, { limit: 1000 });
  if (listed.error) return { ok: false, status: 500, message: "Something went wrong. Try again to finish." };
  const files = (listed.data ?? []).map((f) => `${args.userId}/${f.name}`);
  if (files.length) {
    const removed = await bucket.remove(files);
    if (removed.error) return { ok: false, status: 500, message: "Something went wrong. Try again to finish." };
  }

  const gone = await admin.auth.admin.deleteUser(args.userId);
  // Already deleted by an earlier attempt is fine: that is what a retry looks like.
  if (gone.error && !/not found|user_not_found/i.test(`${gone.error.code ?? ""} ${gone.error.message}`)) {
    return { ok: false, status: 500, message: "Something went wrong. Try again to finish." };
  }

  await admin.rpc("finish_account_deletion", { p_user: args.userId });
  return { ok: true };
}
