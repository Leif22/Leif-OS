import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResultRow, ResultType } from "@/lib/results/types";
import { normalizeSparringAiModelFromDb } from "@/lib/sparring/sparring-ai-model";
import type { SparringChatRow, SparringChatType } from "@/lib/sparring/types";
import { mergeTasksWithAreasAndTags } from "@/lib/tasks/fetch-tasks";
import type { AreaRow, TaskRow, TaskWithRelations } from "@/lib/tasks/types";
import type { AreaDetailArea, AreaDetailNote, AreaDetailPerson } from "./types";

function isResultType(s: string): s is ResultType {
  return s === "insight" || s === "decision";
}

function isSparringType(s: string): s is SparringChatType {
  return s === "free" || s === "context" || s === "project";
}

export async function fetchAreaDetail(
  supabase: SupabaseClient,
  userId: string,
  areaId: string,
): Promise<{
  area: AreaDetailArea | null;
  tasks: TaskWithRelations[];
  results: ResultRow[];
  sparring: SparringChatRow[];
  persons: AreaDetailPerson[];
  notes: AreaDetailNote[];
  errors: string[];
}> {
  const errors: string[] = [];

  const { data: areaRaw, error: areaErr } = await supabase
    .from("areas")
    .select("id, name, slug, description, sort_order")
    .eq("id", areaId)
    .eq("user_id", userId)
    .maybeSingle();

  if (areaErr) {
    return {
      area: null,
      tasks: [],
      results: [],
      sparring: [],
      persons: [],
      notes: [],
      errors: [areaErr.message],
    };
  }
  if (!areaRaw) {
    return { area: null, tasks: [], results: [], sparring: [], persons: [], notes: [], errors: [] };
  }

  const area = areaRaw as AreaDetailArea;
  const areaRows: AreaRow[] = [{ id: area.id, name: area.name, sort_order: area.sort_order }];

  const tasksRes = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("area_id", areaId)
    .order("updated_at", { ascending: false });

  if (tasksRes.error) {
    errors.push(tasksRes.error.message);
  }

  const taskRows = (tasksRes.data ?? []) as TaskRow[];
  const tagsByTask: Record<string, string[]> = {};
  const taskIds = taskRows.map((t) => t.id);
  if (taskIds.length > 0) {
    const { data: tagRows, error: tagErr } = await supabase
      .from("task_tags")
      .select("task_id, tag")
      .in("task_id", taskIds);
    if (tagErr) {
      errors.push(tagErr.message);
    } else {
      for (const row of tagRows ?? []) {
        const tid = row.task_id as string;
        const tag = row.tag as string;
        tagsByTask[tid] ??= [];
        tagsByTask[tid].push(tag);
      }
    }
  }

  const tasks = mergeTasksWithAreasAndTags(taskRows, areaRows, tagsByTask);

  const { data: raRows, error: raErr } = await supabase
    .from("result_areas")
    .select("result_id")
    .eq("area_id", areaId);

  if (raErr) {
    errors.push(raErr.message);
  }

  const resultIds = [...new Set((raRows ?? []).map((r) => (r as { result_id: string }).result_id))];
  let results: ResultRow[] = [];
  if (resultIds.length > 0) {
    const { data: resData, error: resErr } = await supabase
      .from("results")
      .select("*")
      .eq("user_id", userId)
      .in("id", resultIds)
      .order("updated_at", { ascending: false });

    if (resErr) {
      errors.push(resErr.message);
    } else {
      results = ((resData ?? []) as ResultRow[]).map((r) => ({
        ...r,
        type: isResultType(String(r.type)) ? r.type : "insight",
        content: r.content ?? null,
        source_sparring_chat_id: r.source_sparring_chat_id ?? null,
        source_inbox_item_id: r.source_inbox_item_id ?? null,
        project_id: r.project_id ?? null,
      }));
    }
  }

  const { data: spData, error: spErr } = await supabase
    .from("sparring_chats")
    .select("*")
    .eq("user_id", userId)
    .eq("area_id", areaId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (spErr) {
    errors.push(spErr.message);
  }

  const sparring: SparringChatRow[] = ((spData ?? []) as SparringChatRow[]).map((r) => ({
    ...r,
    type: isSparringType(String(r.type)) ? r.type : "free",
    ai_model: normalizeSparringAiModelFromDb((r as { ai_model?: string }).ai_model),
    deleted_at: r.deleted_at ?? null,
  }));

  const { data: paData, error: paErr } = await supabase
    .from("person_areas")
    .select("persons (id, first_name, last_name)")
    .eq("area_id", areaId);

  if (paErr) {
    errors.push(paErr.message);
  }

  const persons: AreaDetailPerson[] = [];
  for (const row of paData ?? []) {
    const p = (row as { persons: AreaDetailPerson | AreaDetailPerson[] | null }).persons;
    if (!p) continue;
    const one = Array.isArray(p) ? p[0] : p;
    if (one?.id) {
      persons.push({
        id: String(one.id),
        first_name: String(one.first_name ?? ""),
        last_name: String(one.last_name ?? ""),
      });
    }
  }
  persons.sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name));

  const { data: noteData, error: noteErr } = await supabase
    .from("notes")
    .select("id, content, type, updated_at")
    .eq("user_id", userId)
    .eq("area_id", areaId)
    .order("updated_at", { ascending: false });

  if (noteErr) {
    errors.push(noteErr.message);
  }

  const notes: AreaDetailNote[] = (noteData ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const t = String(r.type);
    return {
      id: String(r.id),
      content: String(r.content ?? ""),
      type: t === "draft" ? "draft" : "note",
      updated_at: String(r.updated_at ?? ""),
    };
  });

  return { area, tasks, results, sparring, persons, notes, errors };
}
