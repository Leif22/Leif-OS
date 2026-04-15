import type { SupabaseClient } from "@supabase/supabase-js";
import type { AreaRow, TaskRow } from "./types";
import { mergeTasksWithAreasAndTags } from "./fetch-tasks";
import { pickRecommendedTask, todayYmdInRecommendationTz, type RecommendationBreakdown } from "./recommended";
import type { TaskWithRelations } from "./types";

export type RecommendedTaskResult = {
  task: TaskWithRelations | null;
  breakdown: RecommendationBreakdown | null;
  areas: AreaRow[];
  error: string | null;
};

export async function fetchRecommendedTask(
  supabase: SupabaseClient,
  userId: string,
  areasPrefetch?: AreaRow[],
): Promise<RecommendedTaskResult> {
  let areas = areasPrefetch;
  if (!areas) {
    const { data: areaRows, error: areaErr } = await supabase
      .from("areas")
      .select("id, name, sort_order")
      .order("sort_order");
    if (areaErr) {
      return { task: null, breakdown: null, areas: [], error: areaErr.message };
    }
    areas = (areaRows ?? []) as AreaRow[];
  }

  const { data: taskRows, error: taskErr } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .is("completed_at", null)
    .order("updated_at", { ascending: false });

  if (taskErr) {
    return { task: null, breakdown: null, areas: areas ?? [], error: taskErr.message };
  }

  const tasks = (taskRows ?? []) as TaskRow[];
  if (tasks.length === 0) {
    return { task: null, breakdown: null, areas: areas ?? [], error: null };
  }

  const merged = mergeTasksWithAreasAndTags(tasks, areas ?? [], {});
  const todayYmd = todayYmdInRecommendationTz();
  const picked = pickRecommendedTask(merged, todayYmd);

  if (!picked) {
    return { task: null, breakdown: null, areas: areas ?? [], error: null };
  }

  return {
    task: picked.task,
    breakdown: picked.breakdown,
    areas: areas ?? [],
    error: null,
  };
}
