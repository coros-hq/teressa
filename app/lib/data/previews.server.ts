import type { SupabaseClient } from "@supabase/supabase-js";

import { sniffImageType } from "../settings/validation.ts";

// The preview images of a published version: a light and a dark picture, made in the publisher's
// browser and stored in the public "previews" bucket under the component's own folder. Files are
// only ever added: the storage rules don't let anyone replace or delete one.

export const PREVIEW_MAX_BYTES = 600 * 1024;
export const PREVIEW_PATH = /^([0-9a-f-]{36})\/[0-9a-f-]{36}-(light|dark)\.(webp|png)$/;

export const previewUrl = (path: string | null) => (path ? `${process.env.SUPABASE_URL}/storage/v1/object/public/previews/${path}` : null);

const EXTENSION = { "image/webp": "webp", "image/png": "png" } as const;

export type StoreResult = { ok: true; previewLight: string; previewDark: string } | { ok: false; status: number; message: string };

function check(bytes: Uint8Array, label: string): { type: keyof typeof EXTENSION } | { error: string } {
  if (bytes.byteLength === 0) return { error: `The ${label} preview is empty.` };
  if (bytes.byteLength > PREVIEW_MAX_BYTES) return { error: `The ${label} preview is too large.` };
  const type = sniffImageType(bytes);
  // The picture's real type comes from its own bytes, not from what the browser said it was.
  if (type !== "image/webp" && type !== "image/png") return { error: `The ${label} preview isn't a valid image.` };
  return { type };
}

export async function storePreviews(
  supabase: SupabaseClient,
  componentId: string,
  files: { light: Uint8Array; dark: Uint8Array },
): Promise<StoreResult> {
  if (!/^[0-9a-f-]{36}$/.test(componentId)) return { ok: false, status: 400, message: "That component couldn't be found." };
  const light = check(files.light, "light");
  const dark = check(files.dark, "dark");
  if ("error" in light) return { ok: false, status: 400, message: light.error };
  if ("error" in dark) return { ok: false, status: 400, message: dark.error };

  const bucket = supabase.storage.from("previews");
  const paths = {
    light: `${componentId}/${crypto.randomUUID()}-light.${EXTENSION[light.type]}`,
    dark: `${componentId}/${crypto.randomUUID()}-dark.${EXTENSION[dark.type]}`,
  };
  const first = await bucket.upload(paths.light, files.light, { contentType: light.type, upsert: false, cacheControl: "31536000" });
  if (first.error) return { ok: false, status: 403, message: "We couldn't save the preview. Check that you can publish this component." };
  const second = await bucket.upload(paths.dark, files.dark, { contentType: dark.type, upsert: false, cacheControl: "31536000" });
  if (second.error) {
    await bucket.remove([paths.light]); // don't leave half a pair behind
    return { ok: false, status: 500, message: "We couldn't save the preview. Try again." };
  }
  return { ok: true, previewLight: paths.light, previewDark: paths.dark };
}

/** Both paths are in this component's folder, have the right shape, and the files are really there. */
export async function previewsExist(supabase: SupabaseClient, componentId: string, light: string, dark: string): Promise<boolean> {
  for (const [path, theme] of [[light, "light"], [dark, "dark"]] as const) {
    const m = PREVIEW_PATH.exec(path);
    if (!m || m[1] !== componentId || m[2] !== theme) return false;
  }
  const { data, error } = await supabase.storage.from("previews").list(componentId, { limit: 1000 });
  if (error || !data) return false;
  const names = new Set(data.map((f) => `${componentId}/${f.name}`));
  return names.has(light) && names.has(dark);
}

/** Removes every preview of the given components (used when they are deleted along with an account). */
export async function removePreviewsOf(admin: SupabaseClient, componentIds: string[]): Promise<boolean> {
  for (const id of componentIds) {
    if (!/^[0-9a-f-]{36}$/.test(id)) continue;
    const bucket = admin.storage.from("previews");
    const { data, error } = await bucket.list(id, { limit: 1000 });
    if (error) return false;
    const files = (data ?? []).map((f) => `${id}/${f.name}`);
    if (files.length && (await bucket.remove(files)).error) return false;
  }
  return true;
}
