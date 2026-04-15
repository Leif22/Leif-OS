"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugifyAreaName } from "@/lib/areas/slug";

async function uniqueSlugForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  base: string,
  excludeAreaId?: string,
): Promise<string> {
  let slug = base;
  for (let n = 0; n < 24; n++) {
    let q = supabase.from("areas").select("id").eq("user_id", userId).eq("slug", slug);
    if (excludeAreaId) q = q.neq("id", excludeAreaId);
    const { data, error } = await q.maybeSingle();
    if (error) return `${base}-${crypto.randomUUID().slice(0, 8)}`;
    if (!data) return slug;
    slug = `${base}-${n + 2}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function revalidate() {
  revalidatePath("/bereiche");
  revalidatePath("/einstellungen");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/inbox");
}

export async function createArea(
  name: string,
  description: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name ist Pflichtfeld." };

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const user = userData.user;

  const { data: maxRow } = await supabase
    .from("areas")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder =
    maxRow && typeof maxRow.sort_order === "number" ? maxRow.sort_order + 1 : 0;

  const baseSlug = slugifyAreaName(trimmed);
  const slug = await uniqueSlugForUser(supabase, user.id, baseSlug);

  const { data: row, error } = await supabase
    .from("areas")
    .insert({
      user_id: user.id,
      name: trimmed,
      slug,
      description: description.trim() || null,
      sort_order: nextOrder,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Name oder Slug bereits vergeben." };
    return { ok: false, error: error.message };
  }
  revalidate();
  return { ok: true, id: row.id as string };
}

export async function updateArea(
  id: string,
  name: string,
  description: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name ist Pflichtfeld." };

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const baseSlug = slugifyAreaName(trimmed);
  const slug = await uniqueSlugForUser(supabase, userData.user.id, baseSlug, id);

  const { error } = await supabase
    .from("areas")
    .update({
      name: trimmed,
      slug,
      description: description.trim() || null,
    })
    .eq("id", id)
    .eq("user_id", userData.user.id);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Name bereits vergeben." };
    return { ok: false, error: error.message };
  }
  revalidate();
  return { ok: true };
}

export async function deleteArea(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { count, error: cErr } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("area_id", id)
    .eq("user_id", userData.user.id);

  if (cErr) return { ok: false, error: cErr.message };
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: "Bereich kann nicht gelöscht werden: Es gibt noch Tasks in diesem Bereich.",
    };
  }

  const { error } = await supabase.from("areas").delete().eq("id", id).eq("user_id", userData.user.id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function moveArea(
  id: string,
  direction: "up" | "down",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const userId = userData.user.id;

  const { data: rows, error: listErr } = await supabase
    .from("areas")
    .select("id, sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (listErr || !rows?.length) return { ok: false, error: listErr?.message ?? "Keine Bereiche." };

  const list = rows as { id: string; sort_order: number }[];
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return { ok: false, error: "Bereich nicht gefunden." };
  const j = direction === "up" ? idx - 1 : idx + 1;
  if (j < 0 || j >= list.length) return { ok: true };

  const a = list[idx];
  const b = list[j];
  const { error: e1 } = await supabase.from("areas").update({ sort_order: b.sort_order }).eq("id", a.id);
  if (e1) return { ok: false, error: e1.message };
  const { error: e2 } = await supabase.from("areas").update({ sort_order: a.sort_order }).eq("id", b.id);
  if (e2) return { ok: false, error: e2.message };

  revalidate();
  return { ok: true };
}
