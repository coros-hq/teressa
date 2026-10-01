import assert from "node:assert/strict";
import { test } from "node:test";

import { badgeText, isUnread, notificationHref, notificationText, type Notification } from "./notifications.ts";

const base: Notification = { kind: "feedback", id: "c1", at: "2026-10-01T12:00:00Z", actor_name: "Sam", component_name: "Login Form", slug: "login-form", body: "Nice" };

test("each kind reads as a sentence", () => {
  assert.equal(notificationText(base), "Sam left feedback on Login Form");
  assert.equal(notificationText({ ...base, kind: "reply" }), "Sam replied to your comment on Login Form");
  assert.equal(notificationText({ ...base, kind: "new_component" }), "Sam published Login Form");
});

test("a missing or blank name reads as Someone", () => {
  assert.equal(notificationText({ ...base, actor_name: null }), "Someone left feedback on Login Form");
  assert.equal(notificationText({ ...base, actor_name: "  " }), "Someone left feedback on Login Form");
});

test("feedback and replies lead to the comment, new components to the page", () => {
  assert.equal(notificationHref(base), "/c/login-form#comment-c1");
  assert.equal(notificationHref({ ...base, kind: "reply" }), "/c/login-form#comment-c1");
  assert.equal(notificationHref({ ...base, kind: "new_component", id: "x" }), "/c/login-form");
});

test("unread means newer than when you last looked", () => {
  assert.equal(isUnread(base, "2026-10-01T11:00:00Z"), true);
  assert.equal(isUnread(base, "2026-10-01T12:00:00Z"), false);
  assert.equal(isUnread(base, "2026-10-01T13:00:00Z"), false);
});

test("the badge caps at 99+", () => {
  assert.equal(badgeText(7), "7");
  assert.equal(badgeText(99), "99");
  assert.equal(badgeText(100), "99+");
});
