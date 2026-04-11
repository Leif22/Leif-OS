"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markInboxItemRead(
  itemId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return { ok: false, error: "Nicht angemeldet." };
  }

  const { error } = await supabase
    .from("inbox_items")
    .update({ is_read: true })
    .eq("id", itemId)
    .eq("user_id", userData.user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/inbox");
  return { ok: true };
}

export async function discardInboxItem(
  itemId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return { ok: false, error: "Nicht angemeldet." };
  }

  const { error } = await supabase
    .from("inbox_items")
    .update({
      status: "discarded",
      processed_as: "discarded",
    })
    .eq("id", itemId)
    .eq("user_id", userData.user.id)
    .eq("status", "pending");

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/inbox");
  return { ok: true };
}

export type CreateTaskFromInboxInput = {
  inbox_item_id: string;
  title: string;
  area_id: string;
};

export async function createTaskFromInbox(
  input: CreateTaskFromInboxInput,
): Promise<{ ok: true; taskId: string } | { ok: false; error: string }> {
  const title = input.title.trim();
  if (!title) {
    return { ok: false, error: "Titel ist Pflichtfeld." };
  }
  if (!input.area_id) {
    return { ok: false, error: "Bereich ist Pflichtfeld." };
  }

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return { ok: false, error: "Nicht angemeldet." };
  }
  const user = userData.user;

  const { data: item, error: itemErr } = await supabase
    .from("inbox_items")
    .select("id, content, status")
    .eq("id", input.inbox_item_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (itemErr || !item) {
    return { ok: false, error: itemErr?.message ?? "Inbox-Eintrag nicht gefunden." };
  }
  if (item.status !== "pending") {
    return { ok: false, error: "Eintrag ist nicht mehr offen." };
  }

  const { data: task, error: insErr } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      area_id: input.area_id,
      title,
      description: String(item.content ?? ""),
      status: "inbox",
      priority: "medium",
      source_inbox_item_id: input.inbox_item_id,
    })
    .select("id")
    .single();

  if (insErr || !task) {
    return { ok: false, error: insErr?.message ?? "Task konnte nicht angelegt werden." };
  }

  const { error: updErr } = await supabase
    .from("inbox_items")
    .update({
      status: "processed",
      processed_as: "task",
      processed_ref_id: task.id,
      is_read: true,
    })
    .eq("id", input.inbox_item_id)
    .eq("user_id", user.id);

  if (updErr) {
    return { ok: false, error: updErr.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/inbox");
  revalidatePath("/tasks");
  return { ok: true, taskId: task.id };
}
