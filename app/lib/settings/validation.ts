// The rules for the Settings forms. One copy, used by the forms (to show errors as people type) and
// by the server (the real check), so they can never disagree. No imports: it also runs under tests.
// The database enforces the same rules again (see supabase/migrations/0005_settings.sql).

export const LIMITS = { displayName: 60, usernameMin: 3, usernameMax: 30, bio: 160, website: 200, github: 39 } as const;

// Keep in step with is_reserved_username() in the database.
export const RESERVED_USERNAMES = [
  "admin", "administrator", "root", "support", "help", "staff", "team", "teressa", "official", "security", "abuse",
  "settings", "studio", "api", "r", "c", "u", "explore", "overview", "components", "feedback",
  "sign-in", "sign-up", "sign-out", "signin", "signup", "login", "logout", "register", "auth",
  "forgot-password", "reset-password", "dashboard", "docs", "blog", "about", "terms", "privacy", "status",
  "new", "edit", "me", "null", "undefined", "www", "mail", "static", "assets", "public",
];

export const USERNAME_PATTERN = /^[a-z][a-z0-9_-]{2,29}$/;
// GitHub's own rule: letters, digits and single hyphens, no leading or trailing hyphen, up to 39.
export const GITHUB_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

export type ProfileInput = { displayName: string; username: string; bio: string; website: string; githubUsername: string };
export type ProfileErrors = Partial<Record<keyof ProfileInput, string>>;
export const PROFILE_FIELDS = ["displayName", "username", "bio", "website", "githubUsername"] as const;

export function validateUsername(value: string): string | null {
  const u = value.trim();
  if (!u) return "Choose a username.";
  if (u.length < LIMITS.usernameMin) return `Use at least ${LIMITS.usernameMin} characters.`;
  if (u.length > LIMITS.usernameMax) return `Use ${LIMITS.usernameMax} characters or fewer.`;
  if (!/^[a-z]/.test(u)) return "Start with a lowercase letter.";
  if (!USERNAME_PATTERN.test(u)) return "Use only lowercase letters, numbers, hyphens and underscores.";
  if (RESERVED_USERNAMES.includes(u)) return "That username isn't available.";
  return null;
}

export function validateWebsite(value: string): string | null {
  const w = value.trim();
  if (!w) return null;
  if (w.length > LIMITS.website) return `Use ${LIMITS.website} characters or fewer.`;
  if (/\s/.test(w)) return "Enter a web address like https://example.com.";
  try {
    const url = new URL(w);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "The address must start with http:// or https://.";
    if (!url.hostname || !/^https?:\/\/[^\s/$.?#]/i.test(w)) return "Enter a web address like https://example.com.";
  } catch {
    return "Enter a web address like https://example.com.";
  }
  return null;
}

/** People paste "@name" or a full link; keep just the name. */
export const cleanGithub = (value: string) =>
  value.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/^@/, "").replace(/\/+$/, "");

export function validateProfile(input: ProfileInput): ProfileErrors {
  const errors: ProfileErrors = {};
  const name = input.displayName.trim();
  if (!name) errors.displayName = "Enter your name.";
  else if (name.length > LIMITS.displayName) errors.displayName = `Use ${LIMITS.displayName} characters or fewer.`;

  const u = validateUsername(input.username);
  if (u) errors.username = u;

  if (input.bio.length > LIMITS.bio) errors.bio = `Keep your bio to ${LIMITS.bio} characters or fewer.`;

  const w = validateWebsite(input.website);
  if (w) errors.website = w;

  const g = cleanGithub(input.githubUsername);
  if (g && !GITHUB_PATTERN.test(g)) errors.githubUsername = "That doesn't look like a GitHub username.";
  return errors;
}

/** What gets saved: trimmed, GitHub cleaned up, and empty optional fields stored as nothing. */
export function normalizeProfile(input: ProfileInput) {
  const blank = (s: string) => (s.trim() === "" ? null : s.trim());
  return {
    full_name: input.displayName.trim(),
    username: input.username.trim(),
    bio: blank(input.bio),
    website: blank(input.website),
    github_username: blank(cleanGithub(input.githubUsername)),
  };
}

export const sameProfile = (a: ProfileInput, b: ProfileInput) =>
  PROFILE_FIELDS.every((k) => a[k].trim() === b[k].trim());

// ---- avatar ---------------------------------------------------------------------------------------------

export const AVATAR = { maxBytes: 2 * 1024 * 1024, types: ["image/png", "image/jpeg", "image/webp"], size: 512 } as const;

export function validateAvatar(file: { type: string; size: number }): string | null {
  if (!(AVATAR.types as readonly string[]).includes(file.type)) return "Choose a PNG, JPG or WebP image.";
  if (file.size > AVATAR.maxBytes) return "That image is larger than 2 MB. Choose a smaller one.";
  if (file.size === 0) return "That file is empty.";
  return null;
}

/** The real type of an image from its first bytes, so a renamed file can't pass as an image. */
export function sniffImageType(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
  const is = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (is(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (is(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (is(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  return null;
}

// ---- account --------------------------------------------------------------------------------------------

export const PASSWORD_MIN = 8; // the same rule as sign-up and reset

export function validateNewPassword(password: string, confirm: string): { password?: string; confirm?: string } {
  const errors: { password?: string; confirm?: string } = {};
  if (password.length < PASSWORD_MIN) errors.password = `Use at least ${PASSWORD_MIN} characters.`;
  else if (password.length > 72) errors.password = "Use 72 characters or fewer.";
  if (confirm !== password) errors.confirm = "The passwords don't match.";
  return errors;
}

export function validateEmailAddress(value: string): string | null {
  const e = value.trim();
  if (!e) return "Enter an email address.";
  if (e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return "Enter a valid email address.";
  return null;
}

/** What someone has to type to delete their account: their username, or a phrase if they have none. */
export const DELETE_PHRASE = "delete my account";
export const confirmationTarget = (username: string | null) => username ?? DELETE_PHRASE;
export const confirmationMatches = (typed: string, username: string | null) => typed.trim() === confirmationTarget(username);

// ---- notifications ---------------------------------------------------------------------------------------

export const NOTIFICATION_KEYS = ["newFeedback", "commentReplies", "feedbackAddressed", "productUpdates"] as const;
export type NotificationKey = (typeof NOTIFICATION_KEYS)[number];
export type NotificationPrefs = Record<NotificationKey, boolean>;
export const NOTIFICATION_DEFAULTS: NotificationPrefs = { newFeedback: true, commentReplies: true, feedbackAddressed: true, productUpdates: false };
export const NOTIFICATION_COLUMNS: Record<NotificationKey, string> = {
  newFeedback: "new_feedback",
  commentReplies: "comment_replies",
  feedbackAddressed: "feedback_addressed",
  productUpdates: "product_updates",
};
export const isNotificationKey = (v: unknown): v is NotificationKey => NOTIFICATION_KEYS.includes(v as NotificationKey);
