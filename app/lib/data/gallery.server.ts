import type { SupabaseClient } from "@supabase/supabase-js";

import { avatarUrlFor } from "./profile.server.ts";
import { previewUrl } from "./previews.server.ts";
import { PAGE_SIZE, toGalleryItem, type GalleryParams, type GalleryResult } from "./gallery.ts";

const COLUMNS =
  "id, slug, name, description, category, tags, version, published_at, copies, comment_count, preview_light, preview_dark, author_id, author_name, author_username, author_avatar_path";

// Reads only the public `published_components` view, as a visitor: never the components table, which
// holds draft code. Searching and filtering happen in the database, one page at a time.
export async function getGallery(supabase: SupabaseClient, params: GalleryParams): Promise<GalleryResult> {
  const from = (params.page - 1) * PAGE_SIZE;
  let query = supabase.from("published_components").select(COLUMNS);

  if (params.category) query = query.eq("category", params.category);
  if (params.tag) query = query.contains("tags", [params.tag]);
  if (params.q) {
    // `params.q` only holds letters, digits, spaces, dots, hyphens and underscores (see cleanSearch).
    const term = params.q.replace(/ /g, "%");
    query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%,tags.cs.{${params.q.replace(/ /g, "-")}}`);
  }
  query =
    params.sort === "popular"
      ? query.order("copies", { ascending: false }).order("published_at", { ascending: false, nullsFirst: false })
      : query.order("published_at", { ascending: false, nullsFirst: false });
  // One more than a page, to know whether there is a next one.
  query = query.order("id").range(from, from + PAGE_SIZE);

  const [rows, cats, tags] = await Promise.all([query, supabase.rpc("gallery_categories"), supabase.rpc("gallery_tags")]);
  if (rows.error) throw new Error("Couldn't load the gallery.");

  const all = (rows.data ?? []).map((r) => toGalleryItem(r as Record<string, unknown>, { preview: previewUrl, avatar: avatarUrlFor }));
  return {
    items: all.slice(0, PAGE_SIZE),
    hasMore: all.length > PAGE_SIZE,
    // The filter is a nicety: if it can't load, the gallery itself still works.
    tags: tags.error ? [] : (tags.data as { tag: string; total: number | string }[]).map((t) => ({ tag: t.tag, total: Number(t.total) })),
    categories: cats.error ? [] : (cats.data as { category: string; total: number | string }[]).map((c) => ({ category: c.category, total: Number(c.total) })),
  };
}
