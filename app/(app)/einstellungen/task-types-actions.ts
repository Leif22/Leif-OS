"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureDefaultTaskTypes } from "@/lib/task-types/fetch-task-types";

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function revalidate() {
  revalidatePath("/einstellungen");
  revalidatePath("/tasks");
  revalidatePath("/inbox");
}

export async function createTaskType(
  label: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const trimmed = label.trim();
  if (!trimmed) return { ok: false, error: "Name ist Pflichtfeld." };
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const userId = userData.user.id;
  await ensureDefaultTaskTypes(supabase, userId);

  const keyBase = normalizeKey(trimmed);
  if (!keyBase) return { ok: false, error: "Ungültiger Name." };
  const { data: maxRow } = await supabase
    .from("user_task_types")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = typeof maxRow?.sort_order === "number" ? maxRow.sort_order + 1 : 0;

  let key = keyBase;
  for (let i = 0; i < 30; i++) {
    const { data } = await supabase
      .from("user_task_types")
      .select("id")
      .eq("user_id", userId)
      .eq("key", key)
      .maybeSingle();
    if (!data) break;
    key = `${keyBase}-${i + 2}`;
  }

  const { data, error } = await supabase
    .from("user_task_types")
    .insert({ user_id: userId, key, label: trimmed, sort_order: sortOrder })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, id: String(data.id) };
}

export async function updateTaskType(
  id: string,
  label: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = label.trim();
  if (!trimmed) return { ok: false, error: "Name ist Pflichtfeld." };
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const { error } = await supabase
    .from("user_task_types")
    .update({ label: trimmed })
    .eq("id", id)
    .eq("user_id", userData.user.id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function deleteTaskType(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const userId = userData.user.id;

  const { data: row, error: rowErr } = await supabase
    .from("user_task_types")
    .select("key")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (rowErr || !row) return { ok: false, error: rowErr?.message ?? "Art nicht gefunden." };

  const { error: clearErr } = await supabase
    .from("tasks")
    .update({ task_type: null })
    .eq("user_id", userId)
    .eq("task_type", String(row.key));
  if (clearErr) return { ok: false, error: clearErr.message };

  const { error } = await supabase.from("user_task_types").delete().eq("id", id).eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function moveTaskType(
  id: string,
  direction: "up" | "down",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const userId = userData.user.id;
  const { data: rows, error } = await supabase
    .from("user_task_types")
    .select("id,sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  if (error || !rows?.length) return { ok: false, error: error?.message ?? "Keine Arten vorhanden." };
  const idx = rows.findIndex((r) => String(r.id) === id);
  if (idx < 0) return { ok: false, error: "Art nicht gefunden." };
  const j = direction === "up" ? idx - 1 : idx + 1;
  if (j < 0 || j >= rows.length) return { ok: true };
  const a = rows[idx];
  const b = rows[j];
  const { error: e1 } = await supabase
    .from("user_task_types")
    .update({ sort_order: Number(b.sort_order) })
    .eq("id", String(a.id))
    .eq("user_id", userId);
  if (e1) return { ok: false, error: e1.message };
  const { error: e2 } = await supabase
    .from("user_task_types")
    .update({ sort_order: Number(a.sort_order) })
    .eq("id", String(b.id))
    .eq("user_id", userId);
  if (e2) return { ok: false, error: e2.message };
  revalidate();
  return { ok: true };
}
