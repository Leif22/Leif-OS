import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_TASK_TYPES, type TaskTypeRow } from "@/lib/task-types/defaults";

export async function ensureDefaultTaskTypes(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("user_task_types")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  if (error) return;
  if ((data ?? []).length > 0) return;
  await supabase.from("user_task_types").insert(
    DEFAULT_TASK_TYPES.map((t) => ({
      user_id: userId,
      key: t.key,
      label: t.label,
      sort_order: t.sort_order,
    })),
  );
}

export async function fetchTaskTypesForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ taskTypes: TaskTypeRow[]; error: string | null }> {
  await ensureDefaultTaskTypes(supabase, userId);
  const { data, error } = await supabase
    .from("user_task_types")
    .select("id,key,label,sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return { taskTypes: [], error: error.message };
  return {
    taskTypes: (data ?? []).map((r) => ({
      id: String(r.id),
      key: String(r.key),
      label: String(r.label),
      sort_order: Number(r.sort_order ?? 0),
    })),
    error: null,
  };
}
