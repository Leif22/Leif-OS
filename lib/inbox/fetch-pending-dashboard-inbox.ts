import type { SupabaseClient } from "@supabase/supabase-js";
import { timestampToBerlinYmd, todayYmdInRecommendationTz } from "@/lib/dashboard/berlin-date";
import type { DashboardInboxItem } from "./types";

/** Alle noch offenen (`pending`) Inbox-Einträge fürs Dashboard, neueste zuerst. */
export async function fetchPendingDashboardInbox(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  items: DashboardInboxItem[];
  progress: { todayTotal: number; todayDone: number };
  error: string | null;
}> {
  const recentWindowStartIso = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
  const todayYmd = todayYmdInRecommendationTz();
  const [pendRes, statsRes] = await Promise.all([
    supabase
      .from("inbox_items")
      .select("id, content, source, source_ref, created_at")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("inbox_items")
      .select("status, created_at")
      .eq("user_id", userId)
      .gte("created_at", recentWindowStartIso),
  ]);

  if (pendRes.error) {
    return { items: [], progress: { todayTotal: 0, todayDone: 0 }, error: pendRes.error.message };
  }
  if (statsRes.error) {
    return { items: [], progress: { todayTotal: 0, todayDone: 0 }, error: statsRes.error.message };
  }

  let todayTotal = 0;
  let todayDone = 0;
  for (const row of (statsRes.data ?? []) as Record<string, unknown>[]) {
    const createdAt = String(row.created_at ?? "");
    if (timestampToBerlinYmd(createdAt) !== todayYmd) continue;
    todayTotal += 1;
    const st = String(row.status ?? "");
    if (st === "processed" || st === "discarded") todayDone += 1;
  }

  return {
    items: (pendRes.data ?? []) as DashboardInboxItem[],
    progress: { todayTotal, todayDone },
    error: null,
  };
}
