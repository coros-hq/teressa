// What the Overview page shows, and the rules around it. No server or React imports: it is used by
// the loader, the components and the tests alike.

export type Stats = { drafts: number; published: number; openFeedback: number; copies: number | null };
export type DraftItem = { id: string; name: string; projectName: string; updatedAt: string };
export type PublishedItem = {
  id: string;
  name: string;
  slug: string;
  version: number;
  publishedAt: string;
  openFeedback: number;
  copies: number | null;
};
export type FeedbackItem = {
  id: string;
  componentId: string;
  componentName: string;
  slug: string;
  category: string;
  body: string;
  lineNumber: number | null;
  createdAt: string;
  authorName: string | null;
};
export type RequestItem = { id: string; name: string; slug: string; authorName: string | null; commentCount: number };
export type Checklist = { hasComponent: boolean; hasPublished: boolean; hasCommented: boolean };

export type Overview = {
  stats: Stats;
  recentDrafts: DraftItem[];
  published: PublishedItem[];
  openFeedback: FeedbackItem[];
  feedbackRequests: RequestItem[];
  checklist: Checklist;
};

/** One block's data, or why it couldn't be loaded. Blocks succeed or fail on their own. */
export type Section<T> = { ok: true; data: T } | { ok: false; error: string };
export type OverviewResult = { [K in keyof Overview]: Section<Overview[K]> };

export const OVERVIEW_LIMITS = { drafts: 3, published: 5, feedback: 5, requests: 4 } as const;

// ---- reading the database's answer ---------------------------------------------------------------------

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, name: string) => {
  if (typeof v !== "string") throw new Error(`${name} is not text`);
  return v;
};
const num = (v: unknown, name: string) => {
  const n = typeof v === "string" ? Number(v) : v; // big counts can arrive as text
  if (typeof n !== "number" || !Number.isFinite(n)) throw new Error(`${name} is not a number`);
  return n;
};
const optNum = (v: unknown, name: string) => (v === null || v === undefined ? null : num(v, name));
const optStr = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const list = (v: unknown, name: string): Raw[] => {
  if (!Array.isArray(v) || !v.every(isObj)) throw new Error(`${name} is not a list`);
  return v;
};

const READERS: { [K in keyof Overview]: (raw: unknown) => Overview[K] } = {
  stats: (r) => {
    if (!isObj(r)) throw new Error("stats missing");
    return {
      drafts: num(r.drafts, "drafts"),
      published: num(r.published, "published"),
      openFeedback: num(r.open_feedback, "open_feedback"),
      copies: optNum(r.copies, "copies"),
    };
  },
  recentDrafts: (r) =>
    list(r, "recent_drafts").map((d) => ({
      id: str(d.id, "id"),
      name: str(d.name, "name"),
      projectName: str(d.project_name, "project_name"),
      updatedAt: str(d.updated_at, "updated_at"),
    })),
  published: (r) =>
    list(r, "published").map((p) => ({
      id: str(p.id, "id"),
      name: str(p.name, "name"),
      slug: str(p.slug, "slug"),
      version: num(p.version, "version"),
      publishedAt: str(p.published_at, "published_at"),
      openFeedback: num(p.open_feedback, "open_feedback"),
      copies: optNum(p.copies, "copies"),
    })),
  openFeedback: (r) =>
    list(r, "open_feedback").map((f) => ({
      id: str(f.id, "id"),
      componentId: str(f.component_id, "component_id"),
      componentName: str(f.component_name, "component_name"),
      slug: str(f.slug, "slug"),
      category: str(f.category, "category"),
      body: str(f.body, "body"),
      lineNumber: optNum(f.line_number, "line_number"),
      createdAt: str(f.created_at, "created_at"),
      authorName: optStr(f.author_name),
    })),
  feedbackRequests: (r) =>
    list(r, "feedback_requests").map((q) => ({
      id: str(q.id, "id"),
      name: str(q.name, "name"),
      slug: str(q.slug, "slug"),
      authorName: optStr(q.author_name),
      commentCount: num(q.comment_count, "comment_count"),
    })),
  checklist: (r) => {
    if (!isObj(r)) throw new Error("checklist missing");
    return {
      hasComponent: r.has_component === true,
      hasPublished: r.has_published === true,
      hasCommented: r.has_commented === true,
    };
  },
};

const KEYS: Record<keyof Overview, string> = {
  stats: "stats",
  recentDrafts: "recent_drafts",
  published: "published",
  openFeedback: "open_feedback",
  feedbackRequests: "feedback_requests",
  checklist: "checklist",
};

/** Reads each block on its own, so one malformed block doesn't take the others down. */
export function parseOverview(raw: unknown): OverviewResult {
  const source: Raw = isObj(raw) ? raw : {};
  const out = {} as Record<string, Section<unknown>>;
  for (const key of Object.keys(READERS) as (keyof Overview)[]) {
    try {
      out[key] = { ok: true, data: READERS[key](source[KEYS[key]]) };
    } catch (e) {
      out[key] = { ok: false, error: e instanceof Error ? e.message : "unreadable" };
    }
  }
  return out as OverviewResult;
}

export function failedOverview(error: string): OverviewResult {
  const fail = { ok: false, error } as const;
  return { stats: fail, recentDrafts: fail, published: fail, openFeedback: fail, feedbackRequests: fail, checklist: fail };
}

// ---- presentation rules ---------------------------------------------------------------------------------

export const CATEGORY_LABELS: Record<string, string> = {
  accessibility: "Accessibility",
  "api-design": "API design",
  "visual-polish": "Visual polish",
};
export const categoryLabel = (c: string) => CATEGORY_LABELS[c] ?? c.replace(/-/g, " ").replace(/^./, (x) => x.toUpperCase());

/** Cuts a long comment to about `max` characters, at a word, with an ellipsis. */
export function excerpt(body: string, max = 120): string {
  const text = body.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export type ChecklistStep = {
  id: "create" | "publish" | "feedback";
  label: string;
  done: boolean;
  /** False until the thing the step needs exists. Unavailable steps are shown as "coming soon". */
  available: boolean;
  href: string | null;
};

/**
 * Where the person is, worked out from what they've actually done. Nothing is stored for it.
 * It is shown only while an available step is still open, and goes away on its own after that.
 */
export function deriveChecklist(
  c: Checklist,
  opts: { newComponentHref: string; continueHref: string | null; myComponentsHref: string; feedbackStepAvailable: boolean; feedbackHref: string },
): { steps: ChecklistStep[]; visible: boolean } {
  const steps: ChecklistStep[] = [
    { id: "create", label: "Create your first component", done: c.hasComponent, available: true, href: opts.newComponentHref },
    {
      id: "publish",
      label: "Publish it",
      done: c.hasPublished,
      available: true,
      href: opts.continueHref ?? (c.hasComponent ? opts.myComponentsHref : opts.newComponentHref),
    },
    {
      id: "feedback",
      label: "Leave feedback on someone else's component",
      done: c.hasCommented,
      available: opts.feedbackStepAvailable,
      href: opts.feedbackStepAvailable ? opts.feedbackHref : null,
    },
  ];
  return { steps, visible: steps.some((s) => s.available && !s.done) };
}

/** Below the wide layout everything is one column: feedback leads when there is some to read. */
export function blockOrder(openFeedback: number): ("feedback" | "drafts" | "published" | "requests")[] {
  return openFeedback > 0
    ? ["feedback", "drafts", "published", "requests"]
    : ["drafts", "published", "feedback", "requests"];
}
