import type { SupabaseClient } from "@supabase/supabase-js";
import { timestampToBerlinYmd, todayYmdInRecommendationTz } from "@/lib/dashboard/berlin-date";
import { parseInboxAiSuggestion } from "@/lib/inbox/ai-suggestions";
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
      .select("id, content, source, source_ref, metadata, ai_status, ai_suggestion, ai_checked_at, ai_error, created_at")
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
    items: ((pendRes.data ?? []) as Record<string, unknown>[]).map((row) => {
      const metadata =
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {};
      const aiStatusRaw = String(row.ai_status ?? "");
      const aiStatus: DashboardInboxItem["ai_status"] =
        aiStatusRaw === "pending" || aiStatusRaw === "ready" || aiStatusRaw === "rejected" || aiStatusRaw === "failed"
          ? aiStatusRaw
          : undefined;
      const aiSuggestion = parseInboxAiSuggestion(row.ai_suggestion) ?? parseInboxAiSuggestion(metadata.ai_suggestion_v1);
      return {
        id: String(row.id ?? ""),
        content: String(row.content ?? ""),
        source: String(row.source ?? ""),
        source_ref: row.source_ref == null ? null : String(row.source_ref),
        metadata,
        ai_status: aiStatus,
        ai_error: row.ai_error == null ? null : String(row.ai_error),
        ai_suggestion: aiStatus === "rejected" ? null : aiSuggestion,
        ai_suggestion_rejected:
          aiStatus === "rejected" ||
          (typeof metadata.ai_suggestion_rejected_at === "string" && metadata.ai_suggestion_rejected_at.trim().length > 0),
        ai_suggestion_checked:
          aiStatus === "ready" ||
          aiStatus === "failed" ||
          aiStatus === "rejected" ||
          (typeof row.ai_checked_at === "string" && row.ai_checked_at.trim().length > 0),
        created_at: String(row.created_at ?? ""),
      };
    }),
    progress: { todayTotal, todayDone },
    error: null,
  };
}
