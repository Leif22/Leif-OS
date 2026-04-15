import type { SupabaseClient } from "@supabase/supabase-js";
import type { AreaListRow } from "./types";

export async function fetchAreasForPage(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ areas: AreaListRow[]; error: string | null }> {
  const { data: areas, error: aErr } = await supabase
    .from("areas")
    .select("id, name, slug, description, sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (aErr) return { areas: [], error: aErr.message };

  const { data: tasks, error: tErr } = await supabase
    .from("tasks")
    .select("area_id")
    .eq("user_id", userId);

  if (tErr) return { areas: [], error: tErr.message };

  const countByArea: Record<string, number> = {};
  for (const row of tasks ?? []) {
    const aid = (row as { area_id: string }).area_id;
    countByArea[aid] = (countByArea[aid] ?? 0) + 1;
  }

  const areasTyped = (areas ?? []) as Omit<AreaListRow, "task_count">[];
  return {
    areas: areasTyped.map((a) => ({
      ...a,
      task_count: countByArea[a.id] ?? 0,
    })),
    error: null,
  };
}
