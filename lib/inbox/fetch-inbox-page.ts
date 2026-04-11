import type { SupabaseClient } from "@supabase/supabase-js";
import type { InboxListItem } from "./types";

export async function fetchPendingInboxItems(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ items: InboxListItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from("inbox_items")
    .select(
      "id, content, source, source_ref, is_read, status, processed_as, processed_ref_id, metadata, created_at, updated_at",
    )
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return { items: [], error: error.message };
  }
  return { items: normalizeRows(data), error: null };
}

export async function fetchClosedInboxItems(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ items: InboxListItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from("inbox_items")
    .select(
      "id, content, source, source_ref, is_read, status, processed_as, processed_ref_id, metadata, created_at, updated_at",
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
    return {
    id: String(row.id),
    content: String(row.content ?? ""),
    source: String(row.source ?? ""),
    source_ref: row.source_ref == null ? null : String(row.source_ref),
    is_read: Boolean(row.is_read),
    status,
    processed_as:
      row.processed_as == null || row.processed_as === ""
        ? null
        : String(row.processed_as),
    processed_ref_id:
      row.processed_ref_id == null ? null : String(row.processed_ref_id),
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    };
  });
}
