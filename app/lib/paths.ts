// Where "New component" leads: a page that asks whether to make it on the canvas or in code.
export const NEW_COMPONENT_PATH = "/new";

export const MY_COMPONENTS_PATH = "/components";

// The public page for a published component doesn't exist yet. Until it does, anything that would
// link to it shows a "coming soon" label instead of a dead link. Flip this and fill in
// `publicPagePath` / `commentPath` when the page is built.
export const HAS_PUBLIC_PAGE = true;
export const publicPagePath = (slug: string) => `/c/${slug}`;
export const commentPath = (slug: string, commentId: string) => `/c/${slug}#comment-${commentId}`;

// The public profile page: /u/{username}, or /u/{id} for people without a username.
export const HAS_PUBLIC_PROFILE = true;
export const publicProfilePath = (username: string) => `/u/${username}`;

// Where the root address sends people: the dashboard if they're signed in, the public explore page if not.
export const SIGNED_IN_PATH = "/overview";
export const SIGNED_OUT_PATH = "/explore";
