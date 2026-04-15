import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectRow } from "./types";

function isMissingProjectsTableError(message: string): boolean {
  return message.includes("Could not find the table 'public.projects'") || message.includes("schema cache");
}

export async function fetchProjectsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ projects: ProjectRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, user_id, name, sort_order, is_archived, created_at, updated_at")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    if (isMissingProjectsTableError(error.message)) {
      // Graceful fallback when migration has not been applied yet.
      return { projects: [], error: null };
    }
    return { projects: [], error: error.message };
  }
  return { projects: (data ?? []) as ProjectRow[], error: null };
}
