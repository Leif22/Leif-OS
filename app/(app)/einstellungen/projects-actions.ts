"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidate() {
  revalidatePath("/einstellungen");
  revalidatePath("/tasks");
  revalidatePath("/notizen");
  revalidatePath("/inbox");
}

export async function createProject(
  name: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Projektname ist Pflichtfeld." };

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const userId = userData.user.id;

  const { data: maxRow } = await supabase
    .from("projects")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = typeof maxRow?.sort_order === "number" ? maxRow.sort_order + 1 : 0;

  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: userId, name: trimmed, sort_order: sortOrder, is_archived: false })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, id: String(data.id) };
}

export async function updateProject(
  id: string,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Projektname ist Pflichtfeld." };

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("projects")
    .update({ name: trimmed })
    .eq("id", id)
    .eq("user_id", userData.user.id);

  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function deleteProject(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const userId = userData.user.id;

  const { error: clearTasksErr } = await supabase
    .from("tasks")
    .update({ project_id: null })
    .eq("user_id", userId)
    .eq("project_id", id);
  if (clearTasksErr) return { ok: false, error: clearTasksErr.message };

  const { error: clearNotesErr } = await supabase
    .from("notes")
    .update({ project_id: null })
    .eq("user_id", userId)
    .eq("project_id", id);
  if (clearNotesErr) return { ok: false, error: clearNotesErr.message };

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function moveProject(
  id: string,
  direction: "up" | "down",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const userId = userData.user.id;

  const { data: rows, error } = await supabase
    .from("projects")
    .select("id, sort_order")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error || !rows?.length) return { ok: false, error: error?.message ?? "Keine Projekte vorhanden." };

  const idx = rows.findIndex((r) => String(r.id) === id);
  if (idx < 0) return { ok: false, error: "Projekt nicht gefunden." };
  const j = direction === "up" ? idx - 1 : idx + 1;
  if (j < 0 || j >= rows.length) return { ok: true };

  const a = rows[idx];
  const b = rows[j];
  const { error: e1 } = await supabase
    .from("projects")
    .update({ sort_order: Number(b.sort_order) })
    .eq("id", String(a.id))
    .eq("user_id", userId);
  if (e1) return { ok: false, error: e1.message };

  const { error: e2 } = await supabase
    .from("projects")
    .update({ sort_order: Number(a.sort_order) })
    .eq("id", String(b.id))
    .eq("user_id", userId);
  if (e2) return { ok: false, error: e2.message };

  revalidate();
  return { ok: true };
}
