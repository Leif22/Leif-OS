import type { SupabaseClient } from "@supabase/supabase-js";
import type { AreaRow, TaskPriority, TaskRow, TaskStatus, TaskWithRelations } from "./types";

export function isTaskStatus(s: string): s is TaskStatus {
  return (
    s === "inbox" ||
    s === "open" ||
    s === "planned" ||
    s === "done" ||
    s === "canceled"
  );
}

export function isTaskPriority(s: string): s is TaskPriority {
  return s === "high" || s === "medium" || s === "low";
}

export async function fetchTasksPageData(supabase: SupabaseClient): Promise<{
  user: { id: string } | null;
  tasks: TaskWithRelations[];
  areas: AreaRow[];
  loadError: string | null;
}> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return { user: null, tasks: [], areas: [], loadError: null };
  }

  const [tasksRes, areasRes] = await Promise.all([
    supabase.from("tasks").select("*").order("updated_at", { ascending: false }),
    supabase.from("areas").select("id, name, sort_order").order("sort_order"),
  ]);

  if (tasksRes.error) {
    return {
      user: { id: user.id },
      tasks: [],
      areas: [],
      loadError: tasksRes.error.message,
    };
  }
  if (areasRes.error) {
    return {
      user: { id: user.id },
      tasks: [],
      areas: [],
      loadError: areasRes.error.message,
    };
  }

  const tasks = (tasksRes.data ?? []) as TaskRow[];
  const areas = (areasRes.data ?? []) as AreaRow[];
  const areaNameById = Object.fromEntries(areas.map((a) => [a.id, a.name]));

  const taskIds = tasks.map((t) => t.id);
  const tagsByTask: Record<string, string[]> = {};
  if (taskIds.length > 0) {
    const { data: tagRows, error: tagErr } = await supabase
      .from("task_tags")
      .select("task_id, tag")
      .in("task_id", taskIds);
    if (tagErr) {
      return {
        user: { id: user.id },
        tasks: [],
        areas,
        loadError: tagErr.message,
      };
    }
    for (const row of tagRows ?? []) {
      const tid = row.task_id as string;
      const tag = row.tag as string;
      tagsByTask[tid] ??= [];
      tagsByTask[tid].push(tag);
    }
  }

  const merged = mergeTasksWithAreasAndTags(tasks, areas, tagsByTask);

  return { user: { id: user.id }, tasks: merged, areas, loadError: null };
}

export function mergeTasksWithAreasAndTags(
  tasks: TaskRow[],
  areas: AreaRow[],
  tagsByTask: Record<string, string[]>,
): TaskWithRelations[] {
  const areaNameById = Object.fromEntries(areas.map((a) => [a.id, a.name]));
  return tasks.map((t) => {
    const status = isTaskStatus(t.status) ? t.status : "open";
    const priority = isTaskPriority(t.priority) ? t.priority : "medium";
    return {
      ...t,
      status,
      priority,
      area_name: areaNameById[t.area_id] ?? "—",
      tags: (tagsByTask[t.id] ?? []).slice().sort((a, b) => a.localeCompare(b)),
    };
  });
}
