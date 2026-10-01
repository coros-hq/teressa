import type { SupabaseClient } from "@supabase/supabase-js";

import { failedOverview, parseOverview, type OverviewResult } from "./overview.ts";

// One call to the database function `get_overview`, which returns every block at once. It runs as
// the signed-in person, so row level security applies, and it takes their id from the session
// rather than from us. It never throws: a failure becomes an error for each block, so the page can
// show a "Try again" inline instead of breaking.
export async function getOverview(supabase: SupabaseClient): Promise<OverviewResult> {
  try {
    const { data, error } = await supabase.rpc("get_overview");
    if (error || data == null) return failedOverview("Couldn't load this right now.");
    return parseOverview(data);
  } catch {
    return failedOverview("Couldn't load this right now.");
  }
}
