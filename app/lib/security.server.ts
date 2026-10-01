import { getUser } from "./supabase/server";

// Shared by the Settings endpoints. Each one verifies the session itself (the page guard doesn't
// run for plain requests to an endpoint), and refuses anything that didn't come from our own pages.

export async function guard(request: Request) {
  const auth = await getUser(request);
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: auth.headers });

  if (request.method !== "GET") {
    // Browsers mark cross-site requests. We only accept our own pages.
    const site = request.headers.get("Sec-Fetch-Site");
    if (site && site !== "same-origin") return { response: json({ ok: false, message: "Request blocked." }, 403) } as const;
  }
  if (!auth.user) return { response: json({ ok: false, message: "Sign in again to continue." }, 401) } as const;
  return { user: auth.user, supabase: auth.supabase, headers: auth.headers, json } as const;
}

/** Expires the sign-in cookies, for after the account they belong to is gone. */
export function clearAuthCookies(request: Request): Headers {
  const headers = new Headers();
  const names = (request.headers.get("Cookie") ?? "").split(";").map((c) => c.split("=")[0].trim()).filter((n) => n.startsWith("sb-"));
  for (const name of names) headers.append("Set-Cookie", `${name}=; Path=/; Max-Age=0; SameSite=Lax`);
  return headers;
}
