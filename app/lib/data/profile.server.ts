import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AVATAR, normalizeProfile, sniffImageType, validateAvatar, validateProfile, validateUsername,
  type ProfileErrors, type ProfileInput,
} from "../settings/validation.ts";

// Reading and changing the signed-in person's profile. Every call runs as them, so row level
// security applies on top of the checks here.

export type Profile = ProfileInput & { id: string; avatarPath: string | null; avatarUrl: string | null };

const COLUMNS = "id, full_name, username, bio, website, github_username, avatar_path";
type Row = { id: string; full_name: string | null; username: string | null; bio: string | null; website: string | null; github_username: string | null; avatar_path: string | null };

export const avatarUrlFor = (path: string | null) =>
  path ? `${process.env.SUPABASE_URL}/storage/v1/object/public/avatars/${path}` : null;

const toProfile = (r: Row): Profile => ({
  id: r.id,
  displayName: r.full_name ?? "",
  username: r.username ?? "",
  bio: r.bio ?? "",
  website: r.website ?? "",
  githubUsername: r.github_username ?? "",
  avatarPath: r.avatar_path,
  avatarUrl: avatarUrlFor(r.avatar_path),
});

export async function getProfile(supabase: SupabaseClient, userId: string): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").select(COLUMNS).eq("id", userId).single();
  if (error || !data) throw new Error("Couldn't load your profile.");
  return toProfile(data as Row);
}

export type SaveResult =
  | { ok: true; profile: Profile }
  | { ok: false; fieldErrors?: ProfileErrors; message?: string };

// Which field a database rule belongs to, so a rejected value is shown on that field.
const CONSTRAINT_FIELD: Record<string, keyof ProfileInput> = {
  profiles_username_lower_key: "username",
  profiles_username_format: "username",
  profiles_username_not_reserved: "username",
  profiles_bio_length: "bio",
  profiles_website_format: "website",
  profiles_github_format: "githubUsername",
  profiles_full_name_length: "displayName",
};

export function mapProfileError(error: { code?: string; message?: string }): SaveResult & { ok: false } {
  const name = Object.keys(CONSTRAINT_FIELD).find((c) => error.message?.includes(c));
  if (name) {
    const field = CONSTRAINT_FIELD[name];
    // Someone else took the name between the check and the save: say so on the field.
    const message = error.code === "23505" ? "That username was just taken. Try another." : "Please check this field.";
    return { ok: false, fieldErrors: { [field]: message } };
  }
  return { ok: false, message: "Something went wrong and nothing was saved. Try again." };
}

export async function updateProfile(supabase: SupabaseClient, userId: string, input: ProfileInput): Promise<SaveResult> {
  const fieldErrors = validateProfile(input);
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  const values = normalizeProfile(input);
  const { data, error } = await supabase.from("profiles").update(values).eq("id", userId).select(COLUMNS).single();
  if (error || !data) return mapProfileError(error ?? {});

  // The sidebar and the Overview read the name from the sign-in account, so keep it in step.
  await supabase.auth.updateUser({ data: { full_name: values.full_name } }).catch(() => {});
  return { ok: true, profile: toProfile(data as Row) };
}

export type UsernameState = "available" | "taken" | "invalid" | "reserved";

/** Is this username free to use? Same rules as saving, so what the form says is what will happen. */
export async function checkUsername(supabase: SupabaseClient, username: string): Promise<{ state: UsernameState; message: string }> {
  const problem = validateUsername(username);
  if (problem) return { state: /isn't available/.test(problem) ? "reserved" : "invalid", message: problem };
  const { data, error } = await supabase.rpc("is_username_available", { p_username: username });
  if (error) throw new Error("Couldn't check that username.");
  return data === true ? { state: "available", message: "That username is available." } : { state: "taken", message: "That username is taken." };
}

// ---- avatar ---------------------------------------------------------------------------------------------

const EXTENSION = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as const;
export type AvatarResult = { ok: true; avatarPath: string; avatarUrl: string } | { ok: false; message: string };

/**
 * Stores a new avatar. The file is checked again here (size, and its real type from its bytes), so
 * the browser's checks aren't relied on. The old picture is only removed once the new one is saved,
 * so a failure at any point leaves the previous avatar in place.
 */
export async function uploadAvatar(supabase: SupabaseClient, userId: string, bytes: Uint8Array): Promise<AvatarResult> {
  const type = sniffImageType(bytes);
  if (!type) return { ok: false, message: "Choose a PNG, JPG or WebP image." };
  const problem = validateAvatar({ type, size: bytes.byteLength });
  if (problem) return { ok: false, message: problem };

  const { data: before } = await supabase.from("profiles").select("avatar_path").eq("id", userId).single();
  const path = `${userId}/${Date.now()}.${EXTENSION[type]}`;

  const up = await supabase.storage.from("avatars").upload(path, bytes, { contentType: type, upsert: false, cacheControl: "31536000" });
  if (up.error) return { ok: false, message: "The upload didn't work. Your current avatar is unchanged." };

  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", userId);
  if (error) {
    await supabase.storage.from("avatars").remove([path]);
    return { ok: false, message: "The upload didn't work. Your current avatar is unchanged." };
  }
  const old = (before as { avatar_path: string | null } | null)?.avatar_path;
  if (old && old !== path) await supabase.storage.from("avatars").remove([old]);
  return { ok: true, avatarPath: path, avatarUrl: avatarUrlFor(path)! };
}

export async function removeAvatar(supabase: SupabaseClient, userId: string): Promise<{ ok: boolean; message?: string }> {
  const { data } = await supabase.from("profiles").select("avatar_path").eq("id", userId).single();
  const old = (data as { avatar_path: string | null } | null)?.avatar_path;
  const { error } = await supabase.from("profiles").update({ avatar_path: null }).eq("id", userId);
  if (error) return { ok: false, message: "Couldn't remove your avatar. Try again." };
  if (old) await supabase.storage.from("avatars").remove([old]);
  return { ok: true };
}

export { AVATAR };
