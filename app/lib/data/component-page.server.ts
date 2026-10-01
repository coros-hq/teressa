import type { SupabaseClient } from "@supabase/supabase-js";

import { avatarUrlFor } from "./profile.server.ts";
import { previewUrl } from "./previews.server.ts";
import { lineCountOf, toComment, validateBody, validateFeedback, type Comment, type FeedbackErrors } from "./discussion.ts";

// Everything the public component page reads and does. It runs as whoever is looking: signed out they
// can read, signed in they can also write, and row level security decides what each is allowed.

export type PublicComponent = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  version: number;
  publishedAt: string | null;
  copies: number;
  previewLight: string | null;
  previewDark: string | null;
  /** Null when the author's account was deleted and the component kept. */
  authorId: string | null;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  code: string;
};

export type ComponentPage = { component: PublicComponent; comments: Comment[]; lineCount: number };

const COLUMNS =
  "id, slug, name, description, category, tags, version, published_at, copies, current_version_id, preview_light, preview_dark, author_id, author_name, author_username, author_avatar_path";

/** The component with its current code and every comment, or null if there's no such published component. */
export async function getComponentPage(supabase: SupabaseClient, slug: string): Promise<ComponentPage | null> {
  const { data: row, error } = await supabase.from("published_components").select(COLUMNS).eq("slug", slug).maybeSingle();
  if (error) throw new Error("Couldn't load this component.");
  if (!row) return null;

  const [version, comments] = await Promise.all([
    supabase.from("component_versions").select("code").eq("id", row.current_version_id).maybeSingle(),
    supabase
      .from("public_comments")
      .select("id, parent_id, version, author_id, author_name, author_username, author_avatar_path, body, category, line_number, status, created_at")
      .eq("component_id", row.id)
      .order("created_at", { ascending: true })
      .limit(1000),
  ]);
  if (version.error || comments.error || !version.data) throw new Error("Couldn't load this component.");

  const code = version.data.code as string;
  return {
    lineCount: lineCountOf(code),
    comments: (comments.data ?? []).map((r) => toComment(r as Record<string, unknown>, avatarUrlFor)),
    component: {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description ?? "",
      category: row.category ?? "",
      tags: Array.isArray(row.tags) ? row.tags : [],
      version: Number(row.version) || 1,
      publishedAt: row.published_at,
      copies: Number(row.copies) || 0,
      previewLight: previewUrl(row.preview_light),
      previewDark: previewUrl(row.preview_dark),
      authorId: row.author_id,
      authorName: row.author_name,
      authorUsername: row.author_username,
      authorAvatarUrl: avatarUrlFor(row.author_avatar_path),
      code,
    },
  };
}

// ---- writing ------------------------------------------------------------------------------------------------------

export type DiscussionResult =
  | { ok: true; id?: string }
  | { ok: false; status: number; message: string; fieldErrors?: FeedbackErrors };

const fail = (status: number, message: string, fieldErrors?: FeedbackErrors): DiscussionResult => ({ ok: false, status, message, fieldErrors });

export function mapDiscussionError(error: { code?: string; message?: string }): DiscussionResult & { ok: false } {
  if (error.message === "rate_limited") return fail(429, "You've posted a lot in the past hour. Try again a little later.") as never;
  if (error.message === "invalid_reply") return fail(400, "That reply can't go there.") as never;
  // The database's own rules about who may change what (for example, only the author sets a status).
  if (/only the component owner|only the commenter|only feedback has a status/i.test(error.message ?? ""))
    return fail(403, "Only the person who published this can do that.") as never;
  if (error.code === "42501" || /row-level security|permission denied/i.test(error.message ?? ""))
    return fail(403, "You can't do that here. Sign in again and try once more.") as never;
  return fail(500, "Something went wrong and nothing was posted. Try again.") as never;
}

/** The published component and its current version, which new feedback is attached to. */
async function target(supabase: SupabaseClient, slug: string) {
  const { data } = await supabase.from("published_components").select("id, current_version_id").eq("slug", slug).maybeSingle();
  return data ? { componentId: data.id as string, versionId: data.current_version_id as string } : null;
}

export async function postFeedback(
  supabase: SupabaseClient,
  input: { slug: string; body: string; category: string; line: string },
): Promise<DiscussionResult> {
  const t = await target(supabase, input.slug);
  if (!t) return fail(404, "This component isn't available any more.");
  const { data: v } = await supabase.from("component_versions").select("code").eq("id", t.versionId).maybeSingle();
  const errors = validateFeedback(input, lineCountOf((v?.code as string | undefined) ?? ""));
  if (Object.keys(errors).length) return fail(400, "Check the highlighted fields.", errors);

  const line = input.line.trim();
  const { data, error } = await supabase
    .from("comments")
    .insert({ component_id: t.componentId, version_id: t.versionId, body: input.body.trim(), category: input.category, line_number: line ? Number(line) : null })
    .select("id")
    .single();
  if (error || !data) return mapDiscussionError(error ?? {});
  return { ok: true, id: data.id };
}

export async function postReply(supabase: SupabaseClient, input: { slug: string; parentId: string; body: string }): Promise<DiscussionResult> {
  const problem = validateBody(input.body);
  if (problem) return fail(400, problem, { body: problem });
  const t = await target(supabase, input.slug);
  if (!t) return fail(404, "This component isn't available any more.");

  // The reply goes on the same version as the feedback it answers.
  const { data: parent } = await supabase
    .from("public_comments")
    .select("id, version_id, parent_id, component_id")
    .eq("id", input.parentId)
    .maybeSingle();
  if (!parent || parent.parent_id !== null || parent.component_id !== t.componentId) return fail(400, "That reply can't go there.");

  const { data, error } = await supabase
    .from("comments")
    .insert({ component_id: t.componentId, version_id: parent.version_id, body: input.body.trim(), parent_id: parent.id })
    .select("id")
    .single();
  if (error || !data) return mapDiscussionError(error ?? {});
  return { ok: true, id: data.id };
}

/** The author of the component marks feedback as dealt with, or reopens it. */
export async function setFeedbackStatus(supabase: SupabaseClient, commentId: string, status: unknown): Promise<DiscussionResult> {
  if (status !== "open" && status !== "addressed") return fail(400, "That status isn't valid.");
  const { data, error } = await supabase.from("comments").update({ status }).eq("id", commentId).select("id");
  if (error) return mapDiscussionError(error);
  // Nothing updated means row level security said no: it isn't their component.
  if (!data?.length) return fail(403, "Only the person who published this can do that.");
  return { ok: true };
}

export async function deleteOwnComment(supabase: SupabaseClient, commentId: string): Promise<DiscussionResult> {
  const { data, error } = await supabase.from("comments").delete().eq("id", commentId).select("id");
  if (error) return mapDiscussionError(error);
  if (!data?.length) return fail(403, "You can only delete your own comments.");
  return { ok: true };
}

/** Counts one copy of a published component. Anyone can do this, signed in or not. */
export async function recordCopy(supabase: SupabaseClient, slug: string): Promise<void> {
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(slug)) return;
  await supabase.rpc("record_copy", { p_slug: slug });
}
