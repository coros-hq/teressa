import assert from "node:assert/strict";
import { test } from "node:test";

import { isThemeChoice } from "../theme.ts";
import {
  AVATAR, RESERVED_USERNAMES, cleanGithub, confirmationMatches, normalizeProfile, sameProfile, sniffImageType,
  validateAvatar, validateEmailAddress, validateNewPassword, validateProfile, validateUsername, validateWebsite,
} from "./validation.ts";

const good = { displayName: "Ada Lovelace", username: "ada_l", bio: "Hi", website: "https://ada.dev", githubUsername: "ada-l" };

test("a complete profile is valid", () => assert.deepEqual(validateProfile(good), {}));

test("display name: required, up to 60", () => {
  assert.ok(validateProfile({ ...good, displayName: "  " }).displayName);
  assert.ok(validateProfile({ ...good, displayName: "x".repeat(61) }).displayName);
  assert.equal(validateProfile({ ...good, displayName: "x".repeat(60) }).displayName, undefined);
});

test("username rules", () => {
  for (const bad of ["", "ab", "1abc", "_abc", "-abc", "Ada", "ada.dev", "ada dev", "ada!", "a".repeat(31)]) assert.ok(validateUsername(bad), `"${bad}" should be refused`);
  for (const ok of ["abc", "ada_l", "a-b-c", "a1_b-2", "a".repeat(30)]) assert.equal(validateUsername(ok), null, `"${ok}" should be allowed`);
});

test("reserved usernames are refused, with a message that doesn't blame the format", () => {
  for (const r of ["admin", "settings", "studio", "api", "support", "explore"]) assert.match(validateUsername(r) ?? "", /isn't available/, r);
  assert.ok(RESERVED_USERNAMES.includes("r"));
});

test("bio: optional, up to 160", () => {
  assert.equal(validateProfile({ ...good, bio: "" }).bio, undefined);
  assert.ok(validateProfile({ ...good, bio: "x".repeat(161) }).bio);
});

test("website: optional, http or https only", () => {
  assert.equal(validateWebsite(""), null);
  assert.equal(validateWebsite("https://example.com/a?b=c"), null);
  assert.equal(validateWebsite("http://localhost:3000"), null);
  for (const bad of ["example.com", "javascript:alert(1)", "ftp://x.com", "https://", "https://a b.com", "data:text/html,hi"]) assert.ok(validateWebsite(bad), bad);
});

test("github username: format only, and links or @ are cleaned up", () => {
  assert.equal(cleanGithub("@octocat"), "octocat");
  assert.equal(cleanGithub("https://github.com/octocat/"), "octocat");
  assert.equal(validateProfile({ ...good, githubUsername: "@octocat" }).githubUsername, undefined);
  for (const bad of ["a--b", "-ab", "ab-", "a b", "a".repeat(40), "a_b"]) assert.ok(validateProfile({ ...good, githubUsername: bad }).githubUsername, bad);
  assert.equal(validateProfile({ ...good, githubUsername: "" }).githubUsername, undefined);
});

test("saving trims, cleans, and stores empty optional fields as nothing", () => {
  const n = normalizeProfile({ ...good, displayName: "  Ada  ", bio: "  ", website: "", githubUsername: "@ada-l" });
  assert.deepEqual(n, { full_name: "Ada", username: "ada_l", bio: null, website: null, github_username: "ada-l" });
});

test("a form counts as unchanged when only surrounding spaces differ", () => {
  assert.equal(sameProfile(good, { ...good, bio: " Hi " }), true);
  assert.equal(sameProfile(good, { ...good, bio: "Hello" }), false);
});

test("avatar: type and size limits", () => {
  assert.equal(validateAvatar({ type: "image/png", size: 1000 }), null);
  assert.equal(validateAvatar({ type: "image/webp", size: AVATAR.maxBytes }), null);
  assert.match(validateAvatar({ type: "image/gif", size: 1000 }) ?? "", /PNG, JPG or WebP/);
  assert.match(validateAvatar({ type: "image/png", size: AVATAR.maxBytes + 1 }) ?? "", /2 MB/);
  assert.ok(validateAvatar({ type: "image/png", size: 0 }));
});

test("avatar: the real type comes from the file's own bytes", () => {
  assert.equal(sniffImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])), "image/png");
  assert.equal(sniffImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(sniffImageType(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])), "image/webp");
  assert.equal(sniffImageType(new TextEncoder().encode("<svg onload=alert(1)>")), null);
  assert.equal(sniffImageType(new TextEncoder().encode("GIF89a")), null);
});

test("password: same rules as sign-up, and the two entries must match", () => {
  assert.deepEqual(validateNewPassword("longenough", "longenough"), {});
  assert.ok(validateNewPassword("short", "short").password);
  assert.ok(validateNewPassword("longenough", "different").confirm);
});

test("email address", () => {
  assert.equal(validateEmailAddress("a@b.co"), null);
  for (const bad of ["", "a", "a@b", "a b@c.d", "@b.c"]) assert.ok(validateEmailAddress(bad), bad);
});

test("deleting needs the username typed exactly; with no username, a phrase", () => {
  assert.equal(confirmationMatches("ada_l", "ada_l"), true);
  assert.equal(confirmationMatches(" ada_l ", "ada_l"), true);
  assert.equal(confirmationMatches("Ada_L", "ada_l"), false);
  assert.equal(confirmationMatches("delete my account", null), true);
  assert.equal(confirmationMatches("ada_l", null), false);
});

test("the theme: only light and dark are valid choices, never the device's", () => {
  assert.equal(isThemeChoice("light"), true);
  assert.equal(isThemeChoice("dark"), true);
  assert.equal(isThemeChoice("system"), false);
});
