"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TaskPriority, TaskStatus } from "@/lib/tasks/types";

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

const STATUS_TRANSITIONS: Partial<Record<TaskStatus, TaskStatus[]>> = {
  inbox: ["open", "planned", "canceled"],
  open: ["planned", "done", "canceled"],
  planned: ["done", "canceled"],
};

function canChangeStatus(from: TaskStatus, to: TaskStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

const STATUSES: TaskStatus[] = ["inbox", "open", "planned", "done", "canceled"];
const PRIORITIES: TaskPriority[] = ["high", "medium", "low"];

function coerceStatus(s: string): TaskStatus {
  return STATUSES.includes(s as TaskStatus) ? (s as TaskStatus) : "open";
}

function coercePriority(s: string): TaskPriority {
  return PRIORITIES.includes(s as TaskPriority) ? (s as TaskPriority) : "medium";
}

export type TaskFormPayload = {
  title: string;
  description: string;
  area_id: string;
  status: TaskStatus;
  priority: TaskPriority;
  tagsRaw: string;
  due_date: string | null;
  planned_date: string | null;
  estimated_minutes: number | null;
};

function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const t = part.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function validatePayload(p: TaskFormPayload): string | null {
  if (!p.title.trim()) return "Titel ist Pflichtfeld.";
  if (!p.area_id) return "Bereich ist Pflichtfeld.";
  return null;
}

function sanitizePayload(payload: TaskFormPayload): TaskFormPayload {
  return {
    ...payload,
    status: coerceStatus(String(payload.status)),
    priority: coercePriority(String(payload.priority)),
  };
}

export async function createTask(
  payload: TaskFormPayload,
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
  const tags = parseTags(p.tagsRaw);

  const { data: task, error: insertErr } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      area_id: p.area_id,
      title: p.title.trim(),
      description: p.description.trim() || null,
      status: p.status,
      priority: p.priority,
      due_date: p.due_date || null,
      planned_date: p.planned_date || null,
      estimated_minutes: p.estimated_minutes,
    })
    .select("id")
    .single();

  if (insertErr || !task) {
    return { ok: false, error: insertErr?.message ?? "Task konnte nicht angelegt werden." };
  }

  if (tags.length > 0) {
    const { error: tagErr } = await supabase.from("task_tags").insert(
      tags.map((tag) => ({
        user_id: user.id,
        task_id: task.id,
        tag,
      })),
    );
    if (tagErr) {
      return { ok: false, error: tagErr.message };
    }
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
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
  newStatus: TaskStatus,
  feedback?: RecommendationFeedbackInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const status = coerceStatus(String(newStatus));
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return { ok: false, error: "Nicht angemeldet." };
  }
  const user = userData.user;

  const { data: row, error: fetchErr } = await supabase
    .from("tasks")
    .select("status")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr || !row) {
    return { ok: false, error: fetchErr?.message ?? "Task nicht gefunden." };
  }

  const current = coerceStatus(String(row.status));
  if (!canChangeStatus(current, status)) {
    return { ok: false, error: "Statuswechsel ist nicht erlaubt." };
  }

  const { error: updErr } = await supabase
    .from("tasks")
    .update({ status })
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
  const tags = parseTags(p.tagsRaw);

  const { error: updErr } = await supabase
    .from("tasks")
    .update({
      area_id: p.area_id,
      title: p.title.trim(),
      description: p.description.trim() || null,
      status: p.status,
      priority: p.priority,
      due_date: p.due_date || null,
      planned_date: p.planned_date || null,
      estimated_minutes: p.estimated_minutes,
    })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (updErr) {
    return { ok: false, error: updErr.message };
  }

  const { error: delErr } = await supabase.from("task_tags").delete().eq("task_id", taskId);
  if (delErr) {
    return { ok: false, error: delErr.message };
  }

  if (tags.length > 0) {
    const { error: tagErr } = await supabase.from("task_tags").insert(
      tags.map((tag) => ({
        user_id: user.id,
        task_id: taskId,
        tag,
      })),
    );
    if (tagErr) {
      return { ok: false, error: tagErr.message };
    }
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
