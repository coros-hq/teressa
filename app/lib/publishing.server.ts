import type { SupabaseClient } from "@supabase/supabase-js";

import { classifyImports } from "./publish/dependencies.ts";
import { normalizeTags, sha256Hex, validateCode, validateDetails, type Details } from "./publish/details.ts";
import { publishLinks } from "./publish/urls.ts";
import { previewsExist } from "./data/previews.server.ts";

// Publishing, server side. The work itself happens in the database function `publish_component`
// (one transaction: ownership, validation, slug, version, status, rate limit). This file prepares
// the call and turns its errors into messages people can act on.
//
// What this does NOT prove: the accessibility, theme and light/dark checks run in the visitor's
// browser, so a determined person can skip them. `checkResults` is stored for information only.
// What is enforced here and in the database: ownership, required fields, limits, the code being
// the saved draft, no exact copies, immutability and the rate limit.

export type PublishInput = {
  componentId: string;
  objectId: string;
  details: Details;
  checkResults: unknown;
  idempotencyKey: string;
  /** Where the browser-made preview images were stored (see data/previews.server.ts). */
  previewLight: string;
  previewDark: string;
  origin: string;
};

export type PublishOutcome =
  | { ok: true; slug: string; version: number; repeated: boolean; publicUrl: string; registryUrl: string; installCommand: string }
  | { ok: false; status: number; code: string; message: string; fieldErrors?: Record<string, string> };

const fail = (status: number, code: string, message: string, fieldErrors?: Record<string, string>): PublishOutcome => ({
  ok: false, status, code, message, fieldErrors,
});

// Messages raised by publish_component (see supabase/migrations/0002_publishing.sql).
const DB_ERRORS: Record<string, { status: number; message: string }> = {
  not_signed_in: { status: 401, message: "Sign in again to publish." },
  not_allowed: { status: 403, message: "Only the owner or an author of this component can publish it." },
  invalid_title: { status: 400, message: "Check the title." },
  invalid_description: { status: 400, message: "Check the description." },
  invalid_category: { status: 400, message: "Check the category." },
  invalid_tags: { status: 400, message: "Check the tags." },
  invalid_dependencies: { status: 400, message: "This component needs too many packages." },
  invalid_preview: { status: 400, message: "The preview images couldn't be used. Run the checks again to make new ones." },
  invalid_check_results: { status: 400, message: "The check results couldn't be read. Run the checks again." },
  empty_code: { status: 400, message: "There's no code to publish yet." },
  code_too_large: { status: 400, message: "Your code is too large to publish. Split it into smaller components." },
  draft_changed: { status: 409, message: "Your code changed while publishing. Run the checks again and retry." },
  no_code_changes: { status: 409, message: "Nothing has changed since your last published version. Edit the code to publish a new one." },
  duplicate_code: { status: 409, message: "This code is identical to a component that's already published. Make it your own before publishing." },
  rate_limited: { status: 429, message: "You've published a lot in the past hour. Try again a little later." },
};

type ErrorLike = { message?: string; code?: string };

export function mapPublishError(error: ErrorLike): PublishOutcome {
  const known = error.message ? DB_ERRORS[error.message] : undefined;
  if (known) return fail(known.status, error.message!, known.message);
  // Unique violation: two people published the same component (or claimed the same name) at once.
  if (error.code === "23505")
    return fail(409, "conflict", "Someone published at the same moment. Try again in a few seconds.");
  return fail(500, "unknown", "Something went wrong and nothing was published. Try again.");
}

type DraftRow = { objects: unknown } | null;

/** The code of one component in a saved design, or null. */
export function codeOfObject(objects: unknown, objectId: string): string | null {
  const list = Array.isArray(objects) ? objects : (objects as { objects?: unknown } | null)?.objects;
  if (!Array.isArray(list)) return null;
  const found = list.find((o) => o?.id === objectId && o?.kind === "component");
  return typeof found?.code === "string" ? found.code : null;
}

export async function publishComponent(supabase: SupabaseClient, input: PublishInput): Promise<PublishOutcome> {
  const details: Details = {
    title: input.details.title.trim(),
    description: input.details.description.trim(),
    category: input.details.category.trim(),
    tags: normalizeTags(input.details.tags),
  };
  const fieldErrors = validateDetails(details);
  if (Object.keys(fieldErrors).length) return fail(400, "invalid_details", "Fix the highlighted fields.", fieldErrors);
  if (!/^[0-9a-f-]{36}$/i.test(input.idempotencyKey)) return fail(400, "invalid_key", "Something went wrong. Reload and try again.");

  // Always the saved draft: what's on screen but not yet saved is never published.
  const { data: row, error: readError } = await supabase
    .from("components")
    .select("objects")
    .eq("id", input.componentId)
    .maybeSingle();
  if (readError) return fail(500, "unknown", "Something went wrong and nothing was published. Try again.");
  const draft = row as DraftRow;
  if (!draft) return fail(404, "not_found", "We couldn't find this component.");

  const code = codeOfObject(draft.objects, input.objectId);
  if (code === null) return fail(400, "no_code", "Pick a component that has code to publish.");
  const codeError = validateCode(code);
  if (codeError) return fail(400, codeError.startsWith("There") ? "empty_code" : "code_too_large", codeError);

  // Every version needs both previews, and they have to be real files in this component's folder.
  if (!(await previewsExist(supabase, input.componentId, input.previewLight, input.previewDark))) {
    return fail(400, "invalid_preview", "The preview images couldn't be found. Run the checks again to make new ones.");
  }

  const { data, error } = await supabase.rpc("publish_component", {
    p_component_id: input.componentId,
    p_object_id: input.objectId,
    p_code_sha256: await sha256Hex(code),
    p_title: details.title,
    p_description: details.description,
    p_category: details.category,
    p_tags: details.tags,
    p_dependencies: classifyImports(code).dependencies,
    p_check_results: input.checkResults ?? {},
    p_idempotency_key: input.idempotencyKey,
    p_preview_light: input.previewLight,
    p_preview_dark: input.previewDark,
  });
  if (error) return mapPublishError(error);

  const result = data as { slug: string; version: number; repeated: boolean };
  return { ok: true, slug: result.slug, version: result.version, repeated: result.repeated, ...publishLinks(input.origin, result.slug) };
}

// ---- public reads (registry, later the public page) -----------------------------------------------

export type PublicVersion = {
  slug: string;
  version: number;
  code: string;
  details: { title: string; description: string; category: string; tags: string[]; license?: string };
  publishedAt: string;
};

// Reads only published data: the published_components view and component_versions. Never the
// components table, which holds draft code.
export async function getPublishedVersion(
  supabase: SupabaseClient,
  slug: string,
  version: number | null,
): Promise<PublicVersion | null> {
  const { data: comp, error } = await supabase
    .from("published_components")
    .select("id, slug, current_version_id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!comp) return null;

  let query = supabase
    .from("component_versions")
    .select("version, code, details, published_at")
    .eq("component_id", comp.id)
    .eq("is_published", true);
  query = version ? query.eq("version", version) : query.eq("id", comp.current_version_id);
  const { data: v, error: vError } = await query.maybeSingle();
  if (vError) throw vError;
  if (!v) return null;
  return { slug: comp.slug, version: v.version, code: v.code, details: v.details, publishedAt: v.published_at };
}
