import type { SupabaseClient } from "@supabase/supabase-js";

import type { NotificationsPayload } from "./notifications";

export async function getNotifications(supabase: SupabaseClient, limit: number, offset = 0): Promise<NotificationsPayload> {
  const { data, error } = await supabase.rpc("get_notifications", { p_limit: limit, p_offset: offset });
  if (error) throw error;
  return data as NotificationsPayload;
}

export async function markNotificationsSeen(supabase: SupabaseClient): Promise<boolean> {
  const { error } = await supabase.rpc("mark_notifications_seen");
  return !error;
}
