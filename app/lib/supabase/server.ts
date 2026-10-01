import { createClient as createBrowserlessClient } from "@supabase/supabase-js";
import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";

// A Supabase client bound to one request. Session cookies are read from the request and any
// refreshed ones are collected in `headers`, which every loader/action must pass on in its response.
export function createClient(request: Request) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set (see .env.example).");
  }

  const headers = new Headers();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () =>
        parseCookieHeader(request.headers.get("Cookie") ?? "").map((c) => ({
          name: c.name,
          value: c.value ?? "",
        })),
      setAll: (cookies) =>
        cookies.forEach(({ name, value, options }) =>
          headers.append("Set-Cookie", serializeCookieHeader(name, value, options)),
        ),
    },
  });

  return { supabase, headers };
}

// The signed-in user, verified with Supabase (not just read from the cookie), or null.
export async function getUser(request: Request) {
  const { supabase, headers } = createClient(request);
  const { data } = await supabase.auth.getUser();
  return { user: data.user, supabase, headers };
}

// A client with no session, for public endpoints: it only ever sees what signed-out visitors see.
export function createPublicClient() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set (see .env.example).");
  }
  return createBrowserlessClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
