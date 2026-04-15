import type { SupabaseClient } from "@supabase/supabase-js";
import { buildInboxSuggestion, parseInboxAiSuggestion } from "@/lib/inbox/ai-suggestions";
import type { InboxListItem } from "./types";

async function ensurePendingAiSuggestions(
  supabase: SupabaseClient,
  userId: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  const candidates = rows.filter((row) => {
    const status = String(row.status ?? "pending");
    if (status !== "pending") return false;
    const aiStatus = String(row.ai_status ?? "pending");
    if (aiStatus !== "pending") return false;
    const metadata =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    const rejected =
      typeof metadata.ai_suggestion_rejected_at === "string" && metadata.ai_suggestion_rejected_at.trim().length > 0;
    if (rejected) return false;
    return true;
  });
  if (candidates.length === 0) return;

  let cursor = 0;
  async function worker() {
    while (cursor < candidates.length) {
      const idx = cursor++;
      const row = candidates[idx];
      const id = String(row.id ?? "");
      if (!id) continue;
      const content = String(row.content ?? "");
      const built = await buildInboxSuggestion(supabase, userId, content);
      const metadata =
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? ({ ...(row.metadata as Record<string, unknown>) } as Record<string, unknown>)
          : {};
      metadata.ai_suggestion_v1 = built.suggestion ?? null;
      metadata.ai_suggestion_checked_at = built.checkedAt;

      // Update in-memory row so current response already contains suggestion data.
      row.ai_status = built.status;
      row.ai_suggestion = built.suggestion;
      row.ai_checked_at = built.checkedAt;
      row.ai_error = built.error;
      row.metadata = metadata;

      await supabase
        .from("inbox_items")
        .update({
          ai_status: built.status,
          ai_suggestion: built.suggestion,
          ai_checked_at: built.checkedAt,
          ai_error: built.error,
          metadata,
        })
        .eq("id", id)
        .eq("user_id", userId)
        .eq("status", "pending");
    }
  }

  await Promise.all([worker(), worker()]);
}

export async function fetchPendingInboxItems(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ items: InboxListItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from("inbox_items")
    .select(
      "id, content, source, source_ref, status, processed_as, processed_ref_id, metadata, ai_status, ai_suggestion, ai_checked_at, ai_error, created_at, updated_at",
    )
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return { items: [], error: error.message };
  }
  const rows = ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({ ...row }));
  await ensurePendingAiSuggestions(supabase, userId, rows);
  return { items: normalizeRows(rows), error: null };
}

export async function fetchClosedInboxItems(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ items: InboxListItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from("inbox_items")
    .select(
      "id, content, source, source_ref, status, processed_as, processed_ref_id, metadata, ai_status, ai_suggestion, ai_checked_at, ai_error, created_at, updated_at",
    )
    .eq("user_id", userId)
    .in("status", ["processed", "discarded"])
    .order("updated_at", { ascending: false });

  if (error) {
    return { items: [], error: error.message };
  }
  return { items: normalizeRows(data), error: null };
}

function normalizeRows(data: unknown): InboxListItem[] {
  return (data as Record<string, unknown>[]).map((row) => {
    const st = String(row.status ?? "pending");
    const status: InboxListItem["status"] =
      st === "pending" || st === "processed" || st === "discarded" ? st : "pending";
    const metadata =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    const aiSuggestion = parseInboxAiSuggestion(row.ai_suggestion)
      ?? parseInboxAiSuggestion(metadata.ai_suggestion_v1);
    const aiStatus = String(row.ai_status ?? "");
    const aiRejectedFromMetadata =
      typeof metadata.ai_suggestion_rejected_at === "string" && metadata.ai_suggestion_rejected_at.trim().length > 0;
    return {
    id: String(row.id),
    content: String(row.content ?? ""),
    source: String(row.source ?? ""),
    source_ref: row.source_ref == null ? null : String(row.source_ref),
    status,
    processed_as:
      row.processed_as == null || row.processed_as === ""
        ? null
        : String(row.processed_as),
    processed_ref_id:
      row.processed_ref_id == null ? null : String(row.processed_ref_id),
    metadata,
    ai_status:
      aiStatus === "pending" || aiStatus === "ready" || aiStatus === "rejected" || aiStatus === "failed"
        ? aiStatus
        : undefined,
    ai_error: row.ai_error == null ? null : String(row.ai_error),
    ai_suggestion: aiStatus === "rejected" ? null : aiSuggestion,
    ai_suggestion_rejected: aiStatus === "rejected" || aiRejectedFromMetadata,
    ai_suggestion_checked:
      aiStatus === "ready" ||
      aiStatus === "failed" ||
      aiStatus === "rejected" ||
      (typeof row.ai_checked_at === "string" && row.ai_checked_at.trim().length > 0),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    };
  });
}
