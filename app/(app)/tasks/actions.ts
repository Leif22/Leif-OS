"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { PRODUCT_COPY } from "@/lib/product-labels";
import { createClient } from "@/lib/supabase/server";
import { addBerlinCalendarDays } from "@/lib/calendar/berlin-ymd";
import { todayYmdInRecommendationTz } from "@/lib/tasks/recommended";
import type { TaskPriority, TaskType } from "@/lib/tasks/types";

export type RecommendationFeedbackInput = {
  recommended_task_id: string;
  score: number;
  score_priority: number;
  score_due: number;
  score_today: number;
  score_age: number;
  action: "accepted" | "skipped" | "other_chosen";
  chosen_task_id?: string | null;
};

async function insertRecommendationLog(
  supabase: SupabaseClient,
  userId: string,
  input: RecommendationFeedbackInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("recommendation_log").insert({
    user_id: userId,
    recommended_task_id: input.recommended_task_id,
    score: input.score,
    score_priority: input.score_priority,
    score_due: input.score_due,
    score_today: input.score_today,
    score_age: input.score_age,
    action: input.action,
    chosen_task_id: input.chosen_task_id ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

const PRIORITIES: TaskPriority[] = ["high", "normal", "low"];

function isMissingProjectsTableError(message: string): boolean {
  return message.includes("Could not find the table 'public.projects'") || message.includes("schema cache");
}

function coercePriority(s: string): TaskPriority {
  return PRIORITIES.includes(s as TaskPriority) ? (s as TaskPriority) : "normal";
}

export type TaskFormPayload = {
  title: string;
  description: string;
  task_type: TaskType | null;
  priority: TaskPriority;
  planned_date: string | null;
  estimated_minutes: number | null;
  document_id: string | null;
  project_id: string | null;
};

async function assertSparringChatForTask(
  supabase: SupabaseClient,
  userId: string,
  chatId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("sparring_chats")
    .select("id")
    .eq("id", chatId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: PRODUCT_COPY.errorKiChatMissing };
  return { ok: true };
}

function validatePayload(p: TaskFormPayload): string | null {
  if (!p.title.trim()) return "Titel ist Pflichtfeld.";
  if (p.planned_date && (!p.estimated_minutes || p.estimated_minutes <= 0)) {
    return "Für geplante Tasks ist die Dauer Pflicht.";
  }
  return null;
}

function sanitizePayload(payload: TaskFormPayload): TaskFormPayload {
  const rawPriority = String(payload.priority);
  const normalizedPriority = rawPriority === "medium" ? "normal" : rawPriority;
  return {
    ...payload,
    task_type: payload.task_type ? String(payload.task_type).trim() : null,
    priority: coercePriority(normalizedPriority),
    document_id: payload.document_id?.trim() || null,
    project_id: payload.project_id?.trim() || null,
  };
}

async function resolveTaskTypeForUser(
  supabase: SupabaseClient,
  userId: string,
  taskType: string | null,
): Promise<string | null> {
  if (!taskType) return null;
  const { data } = await supabase
    .from("user_task_types")
    .select("key")
    .eq("user_id", userId)
    .eq("key", taskType)
    .maybeSingle();
  return data ? taskType : null;
}

async function resolveProjectForUser(
  supabase: SupabaseClient,
  userId: string,
  projectId: string | null,
): Promise<string | null> {
  if (!projectId) return null;
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .eq("id", projectId)
    .eq("is_archived", false)
    .maybeSingle();
  if (error && isMissingProjectsTableError(error.message)) return null;
  return data ? projectId : null;
}

export type CreateTaskOptions = {
  source_sparring_chat_id?: string | null;
};

export async function createTask(
  payload: TaskFormPayload,
  options?: CreateTaskOptions,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = sanitizePayload(payload);
  const err = validatePayload(p);
  if (err) return { ok: false, error: err };

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return { ok: false, error: "Nicht angemeldet." };
  }
  const user = userData.user;
  const taskType = await resolveTaskTypeForUser(supabase, user.id, p.task_type);
  const projectId = await resolveProjectForUser(supabase, user.id, p.project_id);

  const sparId = options?.source_sparring_chat_id?.trim() || null;
  if (sparId) {
    const okSpar = await assertSparringChatForTask(supabase, user.id, sparId);
    if (!okSpar.ok) return { ok: false, error: okSpar.error };
  }

  const { data: task, error: insertErr } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      area_id: null,
      title: p.title.trim(),
      description: p.description.trim() || null,
      task_type: taskType,
      priority: p.priority,
      planned_date: p.planned_date || null,
      estimated_minutes: p.estimated_minutes,
      document_id: p.document_id,
      project_id: projectId,
      completed_at: null,
      source_sparring_chat_id: sparId,
    })
    .select("id")
    .single();

  if (insertErr || !task) {
    return { ok: false, error: insertErr?.message ?? "Task konnte nicht angelegt werden." };
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  if (sparId) revalidatePath(`/sparring/${sparId}`);
  return { ok: true };
}

export async function logRecommendationFeedback(
  input: RecommendationFeedbackInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return { ok: false, error: "Nicht angemeldet." };
  }
  const logRes = await insertRecommendationLog(supabase, userData.user.id, input);
  if (!logRes.ok) return logRes;
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  return { ok: true };
}

export async function updateTaskStatus(
  taskId: string,
  newStatus: "done" | "open",
  feedback?: RecommendationFeedbackInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return { ok: false, error: "Nicht angemeldet." };
  }
  const user = userData.user;

  const { data: row, error: fetchErr } = await supabase
    .from("tasks")
    .select("completed_at")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr || !row) {
    return { ok: false, error: fetchErr?.message ?? "Task nicht gefunden." };
  }

  const { error: updErr } = await supabase
    .from("tasks")
    .update({ completed_at: newStatus === "done" ? new Date().toISOString() : null })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (updErr) {
    return { ok: false, error: updErr.message };
  }

  if (feedback) {
    if (feedback.action === "accepted" && feedback.recommended_task_id !== taskId) {
      return { ok: false, error: "Ungültiges Empfehlungs-Feedback." };
    }
    const logRes = await insertRecommendationLog(supabase, user.id, feedback);
    if (!logRes.ok) return logRes;
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateTask(
  taskId: string,
  payload: TaskFormPayload,
  options?: { recommendationFeedback?: RecommendationFeedbackInput },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = sanitizePayload(payload);
  const err = validatePayload(p);
  if (err) return { ok: false, error: err };

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return { ok: false, error: "Nicht angemeldet." };
  }
  const user = userData.user;
  const taskType = await resolveTaskTypeForUser(supabase, user.id, p.task_type);
  const projectId = await resolveProjectForUser(supabase, user.id, p.project_id);

  const { error: updErr } = await supabase
    .from("tasks")
    .update({
      area_id: null,
      title: p.title.trim(),
      description: p.description.trim() || null,
      task_type: taskType,
      priority: p.priority,
      planned_date: p.planned_date || null,
      estimated_minutes: p.estimated_minutes,
      document_id: p.document_id,
      project_id: projectId,
    })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (updErr) {
    return { ok: false, error: updErr.message };
  }

  if (options?.recommendationFeedback) {
    const fb = options.recommendationFeedback;
    if (fb.action !== "accepted" || fb.recommended_task_id !== taskId) {
      return { ok: false, error: "Ungültiges Empfehlungs-Feedback." };
    }
    const logRes = await insertRecommendationLog(supabase, user.id, fb);
    if (!logRes.ok) return logRes;
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true };
}

type QuickActionResult = { ok: true } | { ok: false; error: string };

function revalidateTaskSurfaces() {
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/planer");
}

/** Schnellaktion Liste / Review: als erledigt markieren. */
export async function quickTaskMarkDone(taskId: string): Promise<QuickActionResult> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const { error } = await supabase
    .from("tasks")
    .update({ completed_at: new Date().toISOString(), status: "done" })
    .eq("id", taskId)
    .eq("user_id", userData.user.id)
    .is("completed_at", null);
  if (error) return { ok: false, error: error.message };
  revalidateTaskSurfaces();
  return { ok: true };
}

/** Planung + Fälligkeit auf heute (Berlin-Kalendertag). */
export async function quickTaskMoveToToday(taskId: string): Promise<QuickActionResult> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const today = todayYmdInRecommendationTz();
  const { error } = await supabase
    .from("tasks")
    .update({
      completed_at: null,
      planned_date: today,
      due_date: today,
      status: "planned",
    })
    .eq("id", taskId)
    .eq("user_id", userData.user.id);
  if (error) return { ok: false, error: error.message };
  revalidateTaskSurfaces();
  return { ok: true };
}

/** Planung + Fälligkeit auf morgen; optional Wiedereröffnen aus Erledigt. */
export async function quickTaskMoveToTomorrow(taskId: string): Promise<QuickActionResult> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const tomorrow = addBerlinCalendarDays(todayYmdInRecommendationTz(), 1);
  const { error } = await supabase
    .from("tasks")
    .update({
      completed_at: null,
      planned_date: tomorrow,
      due_date: tomorrow,
      status: "planned",
    })
    .eq("id", taskId)
    .eq("user_id", userData.user.id);
  if (error) return { ok: false, error: error.message };
  revalidateTaskSurfaces();
  return { ok: true };
}

/** Planung entfernen, in Inbox; Task wieder offen. */
export async function quickTaskToInbox(taskId: string): Promise<QuickActionResult> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const { error } = await supabase
    .from("tasks")
    .update({
      planned_date: null,
      due_date: null,
      status: "inbox",
      completed_at: null,
    })
    .eq("id", taskId)
    .eq("user_id", userData.user.id);
  if (error) return { ok: false, error: error.message };
  revalidateTaskSurfaces();
  return { ok: true };
}

/** Neu planen: konkretes Datum setzen (Kalendertag Berlin). */
export async function quickTaskReplan(
  taskId: string,
  plannedYmd: string,
  dueYmd?: string | null,
): Promise<QuickActionResult> {
  const planned = String(plannedYmd ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(planned)) {
    return { ok: false, error: "Bitte ein gültiges Datum wählen." };
  }
  const dueRaw = String(dueYmd ?? "").trim();
  const due = dueRaw && /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : planned;

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const { error } = await supabase
    .from("tasks")
    .update({
      completed_at: null,
      planned_date: planned,
      due_date: due,
      status: "planned",
    })
    .eq("id", taskId)
    .eq("user_id", userData.user.id);
  if (error) return { ok: false, error: error.message };
  revalidateTaskSurfaces();
  return { ok: true };
}

export async function listCreateAreas(): Promise<
  { ok: true; areas: { id: string; name: string }[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { data, error } = await supabase
    .from("areas")
    .select("id,name")
    .eq("user_id", userData.user.id)
    .order("name", { ascending: true });

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    areas: (data ?? []).map((r) => ({ id: String(r.id), name: String(r.name) })),
  };
}

export async function listTaskDocuments(): Promise<
  { ok: true; documents: { id: string; title: string }[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { data, error } = await supabase
    .from("documents")
    .select("id, title")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    documents: (data ?? []).map((d) => ({ id: String(d.id), title: String(d.title ?? "") })),
  };
}

export async function listProjects(): Promise<
  { ok: true; projects: { id: string; name: string }[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .eq("user_id", userData.user.id)
    .eq("is_archived", false)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) {
    if (isMissingProjectsTableError(error.message)) {
      return { ok: true, projects: [] };
    }
    return { ok: false, error: error.message };
  }
  return {
    ok: true,
    projects: (data ?? []).map((p) => ({ id: String(p.id), name: String(p.name ?? "") })),
  };
}
