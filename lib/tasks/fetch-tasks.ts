import type { SupabaseClient } from "@supabase/supabase-js";
import type { AreaRow, TaskPriority, TaskRow, TaskType, TaskWithRelations } from "./types";
import { deriveTaskStatus } from "./types";

export function isTaskPriority(s: string): s is TaskPriority {
  return s === "high" || s === "normal" || s === "low" || s === "medium";
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

  const merged = mergeTasksWithAreasAndTags(tasks, areas, {});

  return { user: { id: user.id }, tasks: merged, areas, loadError: null };
}

export function mergeTasksWithAreasAndTags(
  tasks: TaskRow[],
  areas: AreaRow[],
  _tagsByTask: Record<string, string[]>,
): TaskWithRelations[] {
  const areaNameById = Object.fromEntries(areas.map((a) => [a.id, a.name]));
  return tasks.map((t) => {
    const priority = t.priority === "medium" ? "normal" : t.priority;
    const safePriority = isTaskPriority(priority) ? (priority as TaskPriority) : "normal";
    const safeType = t.task_type ? String(t.task_type) : null;
    const status = deriveTaskStatus(t);
    return {
      ...t,
      status,
      raw_status: t.status,
      priority: safePriority,
      task_type: safeType,
      source_sparring_chat_id: t.source_sparring_chat_id ?? null,
      area_name: t.area_id ? (areaNameById[t.area_id] ?? "—") : "—",
      document_title: null,
    };
  });
}
