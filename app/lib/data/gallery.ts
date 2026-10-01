// What the public gallery shows and how its URL is read. No server or React imports: it is used by
// the loader, the page and the tests alike.

export const PAGE_SIZE = 24;
export type GallerySort = "newest" | "popular";
export type GalleryParams = { q: string; category: string | null; tag: string | null; sort: GallerySort; page: number };

export const SORTS: { value: GallerySort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most copied" },
];

/** Search text kept to plain characters, so it can never change what the query means. */
export const cleanSearch = (raw: string) =>
  raw.toLowerCase().replace(/[^a-z0-9 _.-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);

/** Tags are stored lowercase, with letters, digits and hyphens. Anything else can't match one. */
export const cleanTag = (raw: string) => raw.toLowerCase().replace(/[^a-z0-9-]+/g, "").slice(0, 24);

export function parseGalleryParams(url: URL): GalleryParams {
  const p = url.searchParams;
  const page = Number.parseInt(p.get("page") ?? "1", 10);
  const category = (p.get("category") ?? "").trim().slice(0, 40);
  return {
    q: cleanSearch(p.get("q") ?? ""),
    category: category || null,
    tag: cleanTag(p.get("tag") ?? "") || null,
    sort: p.get("sort") === "popular" ? "popular" : "newest",
    page: Number.isFinite(page) ? Math.min(Math.max(page, 1), 500) : 1,
  };
}

/** The address for a view of the gallery. Defaults are left out so addresses stay short. */
export function galleryHref(current: GalleryParams, change: Partial<GalleryParams> = {}): string {
  const next = { ...current, ...change };
  // Changing the search, the category or the order starts again from the first page.
  if (("q" in change || "category" in change || "tag" in change || "sort" in change) && !("page" in change)) next.page = 1;
  const qs = new URLSearchParams();
  if (next.q) qs.set("q", next.q);
  if (next.category) qs.set("category", next.category);
  if (next.tag) qs.set("tag", next.tag);
  if (next.sort !== "newest") qs.set("sort", next.sort);
  if (next.page > 1) qs.set("page", String(next.page));
  const s = qs.toString();
  return s ? `/explore?${s}` : "/explore";
}

export type GalleryItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  version: number;
  publishedAt: string | null;
  copies: number;
  commentCount: number;
  previewLight: string | null;
  previewDark: string | null;
  /** The author's account was deleted and the component kept. */
  authorDeleted: boolean;
  /** Who to link to. Null when the account was deleted. */
  authorId: string | null;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
};

export type GalleryResult = {
  items: GalleryItem[];
  hasMore: boolean;
  categories: { category: string; total: number }[];
  tags: { tag: string; total: number }[];
};

type Row = Record<string, unknown>;
const text = (v: unknown) => (typeof v === "string" ? v : "");
const maybe = (v: unknown) => (typeof v === "string" && v ? v : null);

/** One database row into what a card needs. Picture and avatar paths become full addresses. */
export function toGalleryItem(r: Row, urls: { preview: (p: string | null) => string | null; avatar: (p: string | null) => string | null }): GalleryItem {
  return {
    id: text(r.id),
    slug: text(r.slug),
    name: text(r.name),
    description: text(r.description),
    category: text(r.category),
    tags: Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === "string") : [],
    version: Number(r.version) || 1,
    publishedAt: maybe(r.published_at),
    copies: Number(r.copies) || 0,
    commentCount: Number(r.comment_count) || 0,
    previewLight: urls.preview(maybe(r.preview_light)),
    previewDark: urls.preview(maybe(r.preview_dark)),
    authorDeleted: r.author_id === null,
    authorId: maybe(r.author_id),
    authorName: maybe(r.author_name),
    authorUsername: maybe(r.author_username),
    authorAvatarUrl: urls.avatar(maybe(r.author_avatar_path)),
  };
}

/** How to name the author on a card. */
export function authorLabel(i: Pick<GalleryItem, "authorDeleted" | "authorUsername" | "authorName">): string {
  if (i.authorDeleted) return "Deleted user";
  if (i.authorUsername) return `@${i.authorUsername}`;
  return i.authorName ?? "A Teressa member";
}
