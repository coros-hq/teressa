// Addresses of public profile pages: /u/<username>, or /u/<id> for people who haven't chosen a
// username. No server or React imports: the loader, the links and the tests all use it.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USERNAME = /^[a-z][a-z0-9_-]{2,29}$/;

export type Handle = { by: "id"; value: string } | { by: "username"; value: string };

/** What the address names, or null when it can't be a person (so no query is made at all). */
export function parseHandle(raw: string | undefined): Handle | null {
  const h = (raw ?? "").trim();
  if (UUID.test(h)) return { by: "id", value: h.toLowerCase() };
  const lower = h.toLowerCase();
  return USERNAME.test(lower) ? { by: "username", value: lower } : null;
}

/** The part of the address that names someone: their username if they have one, otherwise their id. */
export const profileHandle = (p: { id: string; username: string | null }) => p.username || p.id;
