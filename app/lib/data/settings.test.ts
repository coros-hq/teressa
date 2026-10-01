import assert from "node:assert/strict";
import { test } from "node:test";

import { deleteAccount } from "./account-deletion.server.ts";
import { checkUsername, mapProfileError, removeAvatar, updateProfile, uploadAvatar } from "./profile.server.ts";
import { changePassword, getNotificationPrefs, requestEmailChange, setNotificationPref, startLinkGithub, unlinkIdentity } from "./settings.server.ts";

const U = "11111111-1111-4111-8111-111111111111";
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const input = { displayName: "Ada", username: "ada_l", bio: "", website: "", githubUsername: "" };

// A stand-in client that records what was asked of it.
function fake(opts: { updatedRows?: unknown[][]; insertError?: { code?: string }; update?: { data?: unknown; error?: unknown }; rpc?: Record<string, { data?: unknown; error?: unknown }>; uploadError?: boolean; profileRow?: unknown; prefs?: unknown; identities?: unknown[]; authError?: Record<string, { message: string }> } = {}) {
  const log: string[] = [];
  const chain = (table: string) => {
    const c: Record<string, unknown> = {
      select: () => c, eq: () => c,
      update: (v: unknown) => (log.push(`update ${table} ${JSON.stringify(v)}`), c),
      insert: (v: unknown) => (log.push(`insert ${table} ${JSON.stringify(v)}`), Promise.resolve({ error: opts.insertError ?? null })),
      single: async () => (log.push("single"), table === "profiles" && opts.profileRow ? { data: opts.profileRow, error: null } : opts.update ?? { data: { id: U, full_name: "Ada", username: "ada_l", bio: null, website: null, github_username: null, avatar_path: null }, error: null }),
      maybeSingle: async () => ({ data: opts.prefs ?? null, error: null }),
      then: (res: (v: unknown) => void) => res(table === "notification_preferences" ? { data: opts.updatedRows?.shift() ?? [], error: null } : opts.update ?? { error: null }),
    };
    return c;
  };
  const client = {
    from: chain,
    rpc: async (fn: string, args: unknown) => (log.push(`rpc ${fn}`), opts.rpc?.[fn] ?? { data: true, error: null }),
    storage: { from: () => ({
      upload: async (p: string) => (log.push(`upload ${p}`), { error: opts.uploadError ? { message: "x" } : null }),
      remove: async (p: string[]) => (log.push(`remove ${p.join(",")}`), { error: null }),
      list: async () => ({ data: [{ name: "a.webp" }, { name: "b.png" }], error: null }),
    }) },
    auth: {
      updateUser: async () => opts.authError?.updateUser ? { error: opts.authError.updateUser } : { error: null },
      signInWithPassword: async () => opts.authError?.signIn ? { error: opts.authError.signIn } : { error: null },
      getUserIdentities: async () => ({ data: { identities: opts.identities ?? [] } }),
      unlinkIdentity: async (i: unknown) => (log.push(`unlink ${JSON.stringify(i)}`), { error: null }),
      admin: { deleteUser: async () => (log.push("deleteUser"), opts.authError?.deleteUser ? { error: opts.authError.deleteUser } : { error: null }) },
    },
  };
  return { client: client as never, log };
}

test("profile: invalid input is refused before the database is touched", async () => {
  const { client, log } = fake();
  const r = await updateProfile(client, U, { ...input, username: "Admin!" });
  assert.ok(!r.ok && r.fieldErrors?.username);
  assert.equal(log.filter((l) => l.startsWith("update")).length, 0);
});

test("profile: saves trimmed values and returns the saved profile", async () => {
  const { client, log } = fake();
  const r = await updateProfile(client, U, { ...input, displayName: "  Ada  " });
  assert.ok(r.ok);
  assert.ok(log.some((l) => l.includes('"full_name":"Ada"')));
});

test("profile: a username taken at the last moment is reported on the username field", () => {
  const r = mapProfileError({ code: "23505", message: 'duplicate key value violates unique constraint "profiles_username_lower_key"' });
  assert.deepEqual(r.fieldErrors, { username: "That username was just taken. Try another." });
});

test("profile: other database rules show on their own field, and unknown errors are generic", () => {
  assert.ok(mapProfileError({ code: "23514", message: 'violates check constraint "profiles_website_format"' }).fieldErrors?.website);
  const generic = mapProfileError({ message: "relation does not exist" });
  assert.ok(!generic.fieldErrors && generic.message && !/relation/.test(generic.message));
});

test("username check: format and reserved names never reach the database; availability does", async () => {
  const f = fake({ rpc: { is_username_available: { data: false } } });
  assert.equal((await checkUsername(f.client, "Bad Name")).state, "invalid");
  assert.equal((await checkUsername(f.client, "admin")).state, "reserved");
  assert.equal(f.log.filter((l) => l.startsWith("rpc")).length, 0);
  assert.equal((await checkUsername(f.client, "taken_one")).state, "taken");
  assert.equal((await checkUsername(fake({ rpc: { is_username_available: { data: true } } }).client, "free_one")).state, "available");
});

test("avatar: stores in the person's own folder, then removes the old file", async () => {
  const { client, log } = fake({ profileRow: { avatar_path: `${U}/old.png` } });
  const r = await uploadAvatar(client, U, PNG);
  assert.ok(r.ok && r.avatarPath.startsWith(`${U}/`) && r.avatarPath.endsWith(".png"));
  const order = log.filter((l) => /^(upload|update profiles|remove)/.test(l));
  assert.match(order[0], /^upload/);
  assert.match(order[1], /^update profiles/);
  assert.equal(order[2], `remove ${U}/old.png`);
});

test("avatar: a file that isn't a real image, or is too big, is refused and nothing is stored", async () => {
  const { client, log } = fake();
  const fakeImage = new TextEncoder().encode("<svg onload=alert(1)></svg>");
  assert.ok(!(await uploadAvatar(client, U, fakeImage)).ok);
  const big = new Uint8Array(2 * 1024 * 1024 + 1); big.set(PNG);
  assert.ok(!(await uploadAvatar(client, U, big)).ok);
  assert.equal(log.filter((l) => l.startsWith("upload")).length, 0);
});

test("avatar: a failed upload keeps the previous avatar (nothing is updated or removed)", async () => {
  const { client, log } = fake({ uploadError: true, profileRow: { avatar_path: `${U}/old.png` } });
  const r = await uploadAvatar(client, U, PNG);
  assert.ok(!r.ok && /unchanged/.test(r.message));
  assert.ok(!log.some((l) => l.startsWith("update profiles") || l.startsWith("remove")));
});

test("avatar: removing clears the path and deletes the file", async () => {
  const { client, log } = fake({ profileRow: { avatar_path: `${U}/old.png` } });
  assert.ok((await removeAvatar(client, U)).ok);
  assert.ok(log.includes(`remove ${U}/old.png`));
});

test("notifications: no row means the defaults (feedback, replies, addressed on; product updates off)", async () => {
  assert.deepEqual(await getNotificationPrefs(fake().client, U), { newFeedback: true, commentReplies: true, feedbackAddressed: true, productUpdates: false });
  const p = await getNotificationPrefs(fake({ prefs: { new_feedback: false, comment_replies: true, feedback_addressed: true, product_updates: true } }).client, U);
  assert.equal(p.newFeedback, false);
  assert.equal(p.productUpdates, true);
});

test("notifications: the first change creates the row with only that column; later changes update it", async () => {
  const first = fake();
  assert.ok((await setNotificationPref(first.client, U, "productUpdates", true)).ok);
  assert.ok(first.log.some((l) => l === 'insert notification_preferences {"user_id":"' + U + '","product_updates":true}'));
  const later = fake({ updatedRows: [[{ user_id: U }]] });
  assert.ok((await setNotificationPref(later.client, U, "newFeedback", false)).ok);
  assert.ok(!later.log.some((l) => l.startsWith("insert")), "an existing row is updated, not re-created");
  assert.ok(later.log.some((l) => l.includes('update notification_preferences {"new_feedback":false}')));
});

test("notifications: two changes racing to create the row both end up saved", async () => {
  const f = fake({ insertError: { code: "23505" }, updatedRows: [[], [{ user_id: U }]] });
  assert.ok((await setNotificationPref(f.client, U, "commentReplies", false)).ok);
  const other = fake({ insertError: { code: "42501" } });
  assert.ok(!(await setNotificationPref(other.client, U, "commentReplies", false)).ok, "any other failure is reported, not hidden");
});

test("notifications: unknown keys and non-boolean values are refused", async () => {
  const f = fake();
  assert.ok(!(await setNotificationPref(f.client, U, "isAdmin", true)).ok);
  assert.ok(!(await setNotificationPref(f.client, U, "newFeedback", "yes")).ok);
  assert.equal(f.log.length, 0);
});

test("email change: an address that's already taken looks like success (no way to learn who has an account)", async () => {
  const taken = fake({ authError: { updateUser: { message: "A user with this email address has already been registered" } } });
  assert.ok((await requestEmailChange(taken.client, "me@x.com", "other@x.com", "/r")).ok);
  const down = fake({ authError: { updateUser: { message: "smtp failure" } } });
  assert.ok(!(await requestEmailChange(down.client, "me@x.com", "other@x.com", "/r")).ok);
  assert.ok(!(await requestEmailChange(fake().client, "me@x.com", "ME@x.com", "/r")).ok);
  assert.ok(!(await requestEmailChange(fake().client, "me@x.com", "nope", "/r")).ok);
});

test("password: people with a password must give the current one; wrong means refused and nothing changes", async () => {
  const wrong = fake({ authError: { signIn: { message: "Invalid login credentials" } } });
  const r = await changePassword(wrong.client, wrong.client, { email: "a@b.co", hasPassword: true, current: "nope", next: "longenough", confirm: "longenough" });
  assert.ok(!r.ok && r.fieldErrors?.current);
  const ok = fake();
  assert.ok((await changePassword(ok.client, ok.client, { email: "a@b.co", hasPassword: true, current: "right", next: "longenough", confirm: "longenough" })).ok);
});

test("password: GitHub-only people can set one without a current password, and a re-sign-in request is passed on", async () => {
  const f = fake();
  assert.ok((await changePassword(f.client, f.client, { email: "a@b.co", hasPassword: false, current: "", next: "longenough", confirm: "longenough" })).ok);
  const reauth = fake({ authError: { updateUser: { message: "Password update requires reauthentication" } } });
  const r = await changePassword(reauth.client, reauth.client, { email: "a@b.co", hasPassword: false, current: "", next: "longenough", confirm: "longenough" });
  assert.ok(!r.ok && r.needsReauth === true);
  assert.ok(!(await changePassword(f.client, f.client, { email: "a@b.co", hasPassword: false, current: "", next: "short", confirm: "short" })).ok);
});

test("connected accounts: the last way to sign in can't be removed, whatever was asked", async () => {
  const one = fake({ identities: [{ identity_id: "i1", provider: "email" }] });
  const r = await unlinkIdentity(one.client, "i1");
  assert.ok(!r.ok && /only way to sign in/.test(r.message));
  assert.ok(!one.log.some((l) => l.startsWith("unlink")));
  const two = fake({ identities: [{ identity_id: "i1", provider: "email" }, { identity_id: "i2", provider: "github" }] });
  assert.ok((await unlinkIdentity(two.client, "i2")).ok);
  assert.ok(!(await unlinkIdentity(two.client, "nope")).ok);
});

test("deleting: the typed confirmation is re-checked on the server before anything happens", async () => {
  const f = fake();
  const r = await deleteAccount(f.client, { userId: U, username: "ada_l", confirmation: "wrong", keepPublished: true });
  assert.ok(!r.ok && r.status === 400);
  assert.equal(f.log.length, 0, "nothing was touched");
  assert.ok(!(await deleteAccount(f.client, { userId: U, username: "ada_l", confirmation: "ada_l", keepPublished: "yes" })).ok);
});

test("deleting: runs the steps in order and clears the bookkeeping last", async () => {
  const f = fake();
  const r = await deleteAccount(f.client, { userId: U, username: "ada_l", confirmation: "ada_l", keepPublished: false });
  assert.ok(r.ok);
  assert.deepEqual(f.log, ["rpc begin_account_deletion", `remove ${U}/a.webp,${U}/b.png`, "deleteUser", "rpc finish_account_deletion"]);
});

test("deleting: safe to retry once the account is already gone, and rate limits are explained", async () => {
  const again = fake({ authError: { deleteUser: { message: "User not found" } } });
  assert.ok((await deleteAccount(again.client, { userId: U, username: null, confirmation: "delete my account", keepPublished: true })).ok);
  const limited = fake({ rpc: { begin_account_deletion: { error: { message: "rate_limited" } } } });
  const r = await deleteAccount(limited.client, { userId: U, username: "ada_l", confirmation: "ada_l", keepPublished: true });
  assert.ok(!r.ok && r.status === 429);
  assert.ok(!limited.log.includes("deleteUser"), "an account is never deleted when the database step failed");
});

test("connecting GitHub: says what's missing instead of a vague failure", async () => {
  const link = (error: object | null, url?: string) => ({ auth: { linkIdentity: async () => ({ data: url ? { url } : null, error }) } }) as never;
  assert.deepEqual(await startLinkGithub(link(null, "https://github.com/login"), "/r"), { ok: true, url: "https://github.com/login" });
  assert.match((await startLinkGithub(link({ code: "manual_linking_disabled", message: "Manual linking is disabled" }), "/r") as { message: string }).message, /Connecting accounts isn't turned on/);
  assert.match((await startLinkGithub(link({ message: "Unsupported provider: provider is not enabled" }), "/r") as { message: string }).message, /GitHub sign-in isn't set up/);
  assert.match((await startLinkGithub(link({ message: "boom" }), "/r") as { message: string }).message, /Try again/);
});

test("deleting: previews of the components that were deleted are removed too", async () => {
  const f = fake({ rpc: { begin_account_deletion: { data: { keep_published: false, deleted_component_ids: ["c0c0c0c0-0000-4000-8000-000000000001"] } } } });
  const r = await deleteAccount(f.client, { userId: U, username: "ada_l", confirmation: "ada_l", keepPublished: false });
  assert.ok(r.ok);
  assert.ok(f.log.some((l) => l.startsWith("remove c0c0c0c0-0000-4000-8000-000000000001/")));
});
