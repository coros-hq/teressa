import type { SupabaseClient } from "@supabase/supabase-js";

import { toGalleryItem, type GalleryItem } from "./gallery.ts";
import { previewUrl } from "./previews.server.ts";
import { avatarUrlFor } from "./profile.server.ts";
import type { Handle } from "./profile-page.ts";

export type PublicProfile = {
  id: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  website: string | null;
  githubUsername: string | null;
  avatarUrl: string | null;
};

export type ProfilePage = { profile: PublicProfile; items: GalleryItem[]; totalCopies: number; hasMore: boolean };

export const PROFILE_PAGE_SIZE = 48;

const COLUMNS =
  "id, slug, name, description, category, tags, version, published_at, copies, comment_count, preview_light, preview_dark, author_id, author_name, author_username, author_avatar_path";

const maybe = (v: unknown) => (typeof v === "string" && v ? v : null);

// Runs as a visitor. Profiles are public by design (the sign-in email is never in that table), and
// the components come from the public view, so a draft can't appear here.
export async function getProfilePage(supabase: SupabaseClient, handle: Handle): Promise<ProfilePage | null> {
  const query = supabase.from("profiles").select("id, full_name, username, bio, website, github_username, avatar_path");
  const { data: p, error } = await (handle.by === "id" ? query.eq("id", handle.value) : query.eq("username", handle.value)).maybeSingle();
  if (error || !p) return null;

  const { data: rows, error: listError } = await supabase
    .from("published_components")
    .select(COLUMNS)
    .eq("author_id", p.id)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("id")
    .range(0, PROFILE_PAGE_SIZE);
  if (listError) throw new Error("Couldn't load this person's components.");

  const all = (rows ?? []).map((r) => toGalleryItem(r as Record<string, unknown>, { preview: previewUrl, avatar: avatarUrlFor }));
  const items = all.slice(0, PROFILE_PAGE_SIZE);
  return {
    profile: {
      id: p.id,
      name: maybe(p.full_name),
      username: maybe(p.username),
      bio: maybe(p.bio),
      website: maybe(p.website),
      githubUsername: maybe(p.github_username),
      avatarUrl: avatarUrlFor(maybe(p.avatar_path)),
    },
    items,
    totalCopies: items.reduce((n, i) => n + i.copies, 0),
    hasMore: all.length > PROFILE_PAGE_SIZE,
  };
}
