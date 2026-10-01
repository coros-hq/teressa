import { createClient } from "@supabase/supabase-js";

// A client with the service-role key: it bypasses row level security, so it is used ONLY on the
// server, for the few things a signed-in person can't do themselves (deleting an account). The
// ".server" in the file name keeps it out of anything sent to the browser.
export function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set on the server.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
