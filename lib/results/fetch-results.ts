import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResultRow, ResultType } from "./types";

function isResultType(s: string): s is ResultType {
  return s === "insight" || s === "decision";
}

export async function fetchResultsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ results: ResultRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("results")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) return { results: [], error: error.message };
  const rows = (data ?? []) as ResultRow[];
  return {
    results: rows.map((r) => ({
      ...r,
      type: isResultType(r.type) ? r.type : "insight",
      content: r.content ?? null,
      source_sparring_chat_id: r.source_sparring_chat_id ?? null,
      source_inbox_item_id: r.source_inbox_item_id ?? null,
      project_id: r.project_id ?? null,
    })),
    error: null,
  };
}
