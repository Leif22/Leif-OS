import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentListItem } from "./types";

export async function fetchDocumentsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ items: DocumentListItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, description, original_filename, mime_type, byte_size, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { items: [], error: error.message };
  return { items: (data ?? []) as DocumentListItem[], error: null };
}
