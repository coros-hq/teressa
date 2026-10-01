// Publish details and their limits. Shared by the dialog (inline errors) and the server (the
// real check), so both always agree. No imports: this file also runs under `node --test`.

export const LIMITS = {
  title: 80,
  description: 160,
  category: 40,
  tags: 5,
  tag: 24,
  /** Code size, in bytes. The database function enforces the same number. */
  codeBytes: 204_800,
} as const;

export const LICENSE = "MIT";

export type Details = {
  title: string;
  description: string;
  category: string;
  tags: string[];
};

export type DetailsErrors = Partial<Record<"title" | "description" | "category" | "tags", string>>;

/** Order the fields appear in the form, so focus can go to the first invalid one. */
export const DETAIL_FIELDS = ["title", "description", "category", "tags"] as const;

export function validateDetails(d: Details): DetailsErrors {
  const errors: DetailsErrors = {};
  const title = d.title.trim();
  const description = d.description.trim();
  const category = d.category.trim();

  if (!title) errors.title = "Give your component a title.";
  else if (title.length > LIMITS.title) errors.title = `Keep the title to ${LIMITS.title} characters or fewer.`;

  if (!description) errors.description = "Add a short description.";
  else if (description.length > LIMITS.description)
    errors.description = `Keep the description to ${LIMITS.description} characters or fewer.`;

  if (!category) errors.category = "Add a category.";
  else if (category.length > LIMITS.category)
    errors.category = `Keep the category to ${LIMITS.category} characters or fewer.`;

  if (d.tags.length > LIMITS.tags) errors.tags = `Use up to ${LIMITS.tags} tags.`;
  else if (d.tags.some((t) => !t.trim() || t.length > LIMITS.tag))
    errors.tags = `Each tag can be up to ${LIMITS.tag} characters.`;

  return errors;
}

export function validateCode(code: string): string | null {
  if (!code.trim()) return "There's no code to publish yet.";
  if (new TextEncoder().encode(code).length > LIMITS.codeBytes)
    return `Your code is larger than ${LIMITS.codeBytes / 1024} KB. Split it into smaller components.`;
  return null;
}

/** Lowercase, trimmed, no duplicates, no leading #. */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  for (const raw of tags) {
    const t = raw.trim().replace(/^#/, "").toLowerCase();
    if (t) seen.add(t);
  }
  return [...seen];
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
