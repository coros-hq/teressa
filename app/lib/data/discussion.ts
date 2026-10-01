// The discussion under a published component: feedback, replies, and how they're grouped and
// filtered. No server or React imports: used by the page, the actions and the tests alike.

export const FEEDBACK_CATEGORIES = [
  { value: "accessibility", label: "Accessibility" },
  { value: "api-design", label: "API design" },
  { value: "visual-polish", label: "Visual polish" },
] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]["value"];
export const categoryLabelOf = (v: string | null) => FEEDBACK_CATEGORIES.find((c) => c.value === v)?.label ?? v ?? "";

export const COMMENT_MAX = 2000;

export type Comment = {
  id: string;
  parentId: string | null;
  version: number;
  authorId: string | null;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  body: string;
  category: string | null;
  line: number | null;
  status: "open" | "addressed";
  createdAt: string;
};

export type Thread = { feedback: Comment; replies: Comment[] };

export type StatusFilter = "all" | "open" | "addressed";
export type ThreadSort = "newest" | "oldest";
export type DiscussionParams = { status: StatusFilter; sort: ThreadSort };

export function parseDiscussionParams(url: URL): DiscussionParams {
  const p = url.searchParams;
  const status = p.get("feedback");
  return {
    status: status === "open" || status === "addressed" ? status : "all",
    sort: p.get("sort") === "oldest" ? "oldest" : "newest",
  };
}

/** The address of the page with a different view of the discussion. Defaults are left out. */
export function discussionHref(slug: string, current: DiscussionParams, change: Partial<DiscussionParams>): string {
  const next = { ...current, ...change };
  const qs = new URLSearchParams();
  if (next.status !== "all") qs.set("feedback", next.status);
  if (next.sort !== "newest") qs.set("sort", next.sort);
  const s = qs.toString();
  return `/c/${slug}${s ? `?${s}` : ""}#feedback`;
}

/**
 * Feedback with the replies under it. Feedback is ordered as asked (newest first by default);
 * replies always read oldest to newest, like a conversation. A reply whose feedback is missing is dropped.
 */
export function buildThreads(comments: Comment[], sort: ThreadSort = "newest"): Thread[] {
  const byTime = (a: Comment, b: Comment) => Date.parse(a.createdAt) - Date.parse(b.createdAt);
  const top = comments.filter((c) => c.parentId === null).sort((a, b) => (sort === "newest" ? byTime(b, a) : byTime(a, b)));
  return top.map((feedback) => ({
    feedback,
    replies: comments.filter((c) => c.parentId === feedback.id).sort(byTime),
  }));
}

export const filterThreads = (threads: Thread[], status: StatusFilter) =>
  status === "all" ? threads : threads.filter((t) => t.feedback.status === status);

export const countByStatus = (threads: Thread[]) => ({
  all: threads.length,
  open: threads.filter((t) => t.feedback.status === "open").length,
  addressed: threads.filter((t) => t.feedback.status === "addressed").length,
});

// ---- validation (shared with the server) --------------------------------------------------------------------

export type FeedbackInput = { body: string; category: string; line: string };
export type FeedbackErrors = Partial<Record<keyof FeedbackInput, string>>;

export function validateBody(body: string): string | null {
  const t = body.trim();
  if (!t) return "Write something first.";
  if (t.length > COMMENT_MAX) return `Keep it to ${COMMENT_MAX.toLocaleString("en")} characters or fewer.`;
  return null;
}

/** `lineCount` is how many lines the code has, so feedback can't point past the end. */
export function validateFeedback(input: FeedbackInput, lineCount: number): FeedbackErrors {
  const errors: FeedbackErrors = {};
  const body = validateBody(input.body);
  if (body) errors.body = body;
  if (!FEEDBACK_CATEGORIES.some((c) => c.value === input.category)) errors.category = "Choose what your feedback is about.";
  const line = input.line.trim();
  if (line) {
    const n = Number(line);
    if (!Number.isInteger(n) || n < 1) errors.line = "Enter a line number, like 12.";
    else if (n > lineCount) errors.line = `The code only has ${lineCount} ${lineCount === 1 ? "line" : "lines"}.`;
  }
  return errors;
}

export const lineCountOf = (code: string) => (code === "" ? 0 : code.replace(/\n$/, "").split("\n").length);

/** Rows from the public_comments view into comments. */
export function toComment(r: Record<string, unknown>, avatar: (p: string | null) => string | null): Comment {
  const s = (v: unknown) => (typeof v === "string" && v ? v : null);
  return {
    id: String(r.id),
    parentId: s(r.parent_id),
    version: Number(r.version) || 1,
    authorId: s(r.author_id),
    authorName: s(r.author_name),
    authorUsername: s(r.author_username),
    authorAvatarUrl: avatar(s(r.author_avatar_path)),
    body: typeof r.body === "string" ? r.body : "",
    category: s(r.category),
    line: r.line_number === null || r.line_number === undefined ? null : Number(r.line_number),
    status: r.status === "addressed" ? "addressed" : "open",
    createdAt: String(r.created_at),
  };
}

/** How to name someone in a thread. The author's account may have been deleted. */
export const commenterLabel = (c: Pick<Comment, "authorId" | "authorUsername" | "authorName">) =>
  c.authorId === null ? "Deleted user" : c.authorUsername ? `@${c.authorUsername}` : (c.authorName ?? "A Teressa member");
