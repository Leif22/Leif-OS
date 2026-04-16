"use server";

import { revalidatePath } from "next/cache";
import { addBerlinCalendarDays } from "@/lib/calendar/berlin-ymd";
import { todayYmdInRecommendationTz } from "@/lib/dashboard/berlin-date";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

async function getAuthContext() {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false as const, error: "Nicht angemeldet." };
  return { ok: true as const, supabase, userId: userData.user.id };
}

function done(): ActionResult {
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/planer");
  return { ok: true };
}

export async function markTaskReviewDone(taskId: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase
    .from("tasks")
    .update({ completed_at: new Date().toISOString(), status: "done" })
    .eq("id", taskId)
    .eq("user_id", ctx.userId)
    .is("completed_at", null);
  if (error) return { ok: false, error: error.message };
  return done();
}

export async function moveTaskReviewToTomorrow(taskId: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx.ok) return ctx;

  const tomorrow = addBerlinCalendarDays(todayYmdInRecommendationTz(), 1);
  const { error } = await ctx.supabase
    .from("tasks")
    .update({ planned_date: tomorrow, due_date: tomorrow })
    .eq("id", taskId)
    .eq("user_id", ctx.userId)
    .is("completed_at", null);
  if (error) return { ok: false, error: error.message };
  return done();
}

export async function replanTaskFromReview(
  taskId: string,
  plannedDate: string,
  dueDate?: string | null,
): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx.ok) return ctx;
  const nextPlanned = String(plannedDate ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextPlanned)) {
    return { ok: false, error: "Bitte einen gueltigen Planungstag waehlen." };
  }
  const nextDueRaw = String(dueDate ?? "").trim();
  const nextDue = nextDueRaw ? nextDueRaw : nextPlanned;
  if (nextDue && !/^\d{4}-\d{2}-\d{2}$/.test(nextDue)) {
    return { ok: false, error: "Bitte ein gueltiges Faelligkeitsdatum waehlen." };
  }

  const { error } = await ctx.supabase
    .from("tasks")
    .update({
      planned_date: nextPlanned,
      due_date: nextDue,
    })
    .eq("id", taskId)
    .eq("user_id", ctx.userId)
    .is("completed_at", null);
  if (error) return { ok: false, error: error.message };
  return done();
}

export async function sendTaskReviewBackToInbox(taskId: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase
    .from("tasks")
    .update({ planned_date: null, due_date: null, status: "inbox" })
    .eq("id", taskId)
    .eq("user_id", ctx.userId)
    .is("completed_at", null);
  if (error) return { ok: false, error: error.message };
  return done();
}
