import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("auth/confirm", "routes/auth/confirm.tsx"),
  route("sign-out", "routes/auth/sign-out.tsx"),
  route("r/:file", "routes/registry/item.ts"),
  route("explore", "routes/explore.tsx"),
  route("c/:slug", "routes/component.tsx"),
  route("u/:handle", "routes/profile.tsx"),
  route("api/copy/:slug", "routes/api/copy.ts"),
  route("api/session", "routes/api/session.ts"),
  layout("routes/auth/layout.tsx", [
    route("sign-in", "routes/auth/sign-in.tsx"),
    route("sign-up", "routes/auth/sign-up.tsx"),
    route("forgot-password", "routes/auth/forgot-password.tsx"),
    route("reset-password", "routes/auth/reset-password.tsx"),
  ]),
  layout("routes/app/authenticated.tsx", [
    layout("routes/app/layout.tsx", [
      route("overview", "routes/app/overview.tsx"),
      route("components", "routes/app/components.tsx"),
      route("new", "routes/app/new-component.tsx"),
      route("notifications", "routes/app/notifications.tsx"),
      route("settings", "routes/app/settings/layout.tsx", [
        index("routes/app/settings/index.tsx"),
        route("profile", "routes/app/settings/profile.tsx"),
        route("account", "routes/app/settings/account.tsx"),
        route("appearance", "routes/app/settings/appearance.tsx"),
        route("notifications", "routes/app/settings/notifications.tsx"),
      ]),
    ]),
    route("studio/:componentId", "routes/app/studio.tsx"),
    route("api/components/:componentId", "routes/api/save-component.ts"),
    route("api/notifications", "routes/api/notifications.ts"),
    route("api/publish/:componentId", "routes/api/publish.ts"),
    route("api/publish/:componentId/previews", "routes/api/publish-previews.ts"),
    route("api/settings/username", "routes/api/settings-username.ts"),
    route("api/settings/avatar", "routes/api/settings-avatar.ts"),
    route("api/settings/account", "routes/api/settings-account.ts"),
    route("api/settings/notifications", "routes/api/settings-notifications.ts"),
    route("api/settings/delete-account", "routes/api/settings-delete.ts"),
  ]),
] satisfies RouteConfig;
