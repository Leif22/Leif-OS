import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardInboxItem } from "./types";

export async function fetchUnreadDashboardInbox(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ items: DashboardInboxItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from("inbox_items")
    .select("id, content, source, source_ref, created_at")
    .eq("user_id", userId)
    .eq("status", "pending")
    .eq("is_read", false)
    .order("created_at", { ascending: false });

  if (error) {
    return { items: [], error: error.message };
  }

  return { items: (data ?? []) as DashboardInboxItem[], error: null };
}
