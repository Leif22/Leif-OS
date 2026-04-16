"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PlannerRecurrenceRule } from "@/lib/planer/recurrence";
import { normalizeRecurrenceRule } from "@/lib/planer/recurrence";

function revalidatePlannerSurfaces() {
  revalidatePath("/einstellungen");
  revalidatePath("/planer");
  revalidatePath("/kalender");
}

export async function createPlannerStandardBlock(
  title: string,
  description: string | null,
  durationMinutes: number,
  recurrenceRule: PlannerRecurrenceRule,
  priority: number,
  relevance: number,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Titel ist Pflichtfeld." };
  const duration = Math.max(15, Math.floor(durationMinutes || 45));
  const p = Math.min(3, Math.max(1, Math.floor(priority || 2)));
  const r = Math.min(10, Math.max(1, Math.floor(relevance || 7)));
  const rule = normalizeRecurrenceRule(recurrenceRule, undefined);

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const userId = userData.user.id;

  const { data: maxRow } = await supabase
    .from("user_planner_standard_blocks")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = typeof maxRow?.sort_order === "number" ? maxRow.sort_order + 1 : 0;

  const { data, error } = await supabase
    .from("user_planner_standard_blocks")
    .insert({
      user_id: userId,
      title: trimmed,
      description: description?.trim() ? description.trim() : null,
      duration_minutes: duration,
      priority: p,
      relevance: r,
      recurrence_rule: rule as unknown as Record<string, unknown>,
      sort_order: sortOrder,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePlannerSurfaces();
  return { ok: true, id: String(data.id) };
}

export async function updatePlannerStandardBlock(
  id: string,
  title: string,
  description: string | null,
  durationMinutes: number,
  recurrenceRule: PlannerRecurrenceRule,
  priority: number,
  relevance: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Titel ist Pflichtfeld." };
  const duration = Math.max(15, Math.floor(durationMinutes || 45));
  const p = Math.min(3, Math.max(1, Math.floor(priority || 2)));
  const r = Math.min(10, Math.max(1, Math.floor(relevance || 7)));
  const rule = normalizeRecurrenceRule(recurrenceRule, undefined);

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("user_planner_standard_blocks")
    .update({
      title: trimmed,
      description: description?.trim() ? description.trim() : null,
      duration_minutes: duration,
      priority: p,
      relevance: r,
      recurrence_rule: rule as unknown as Record<string, unknown>,
    })
    .eq("id", id)
    .eq("user_id", userData.user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePlannerSurfaces();
  return { ok: true };
}

export async function deletePlannerStandardBlock(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("user_planner_standard_blocks")
    .delete()
    .eq("id", id)
    .eq("user_id", userData.user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePlannerSurfaces();
  return { ok: true };
}

export async function movePlannerStandardBlock(
  id: string,
  direction: "up" | "down",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const userId = userData.user.id;

  const { data: rows, error } = await supabase
    .from("user_planner_standard_blocks")
    .select("id,sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return { ok: false, error: error.message };
  const list = rows ?? [];
  const idx = list.findIndex((row) => String(row.id) === id);
  if (idx < 0) return { ok: false, error: "Eintrag nicht gefunden." };
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= list.length) return { ok: true };
  const a = list[idx];
  const b = list[swapWith];
  const sa = Number(a.sort_order ?? 0);
  const sb = Number(b.sort_order ?? 0);
  const { error: e1 } = await supabase.from("user_planner_standard_blocks").update({ sort_order: sb }).eq("id", a.id);
  if (e1) return { ok: false, error: e1.message };
  const { error: e2 } = await supabase.from("user_planner_standard_blocks").update({ sort_order: sa }).eq("id", b.id);
  if (e2) return { ok: false, error: e2.message };
  revalidatePlannerSurfaces();
  return { ok: true };
}
