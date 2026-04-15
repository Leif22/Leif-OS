"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { NoteType } from "@/lib/notes/types";

function revalidate() {
  revalidatePath("/notizen");
  revalidatePath("/bereiche", "layout");
}

export type NoteFormInput = {
  title?: string;
  description?: string | null;
  document_id?: string | null;
  content: string;
  type: NoteType;
  area_id: string | null;
  /** Optional: Herkunft aus KI-Sparring (Referenz in `notes`). */
  source_sparring_chat_id?: string | null;
};

function validate(input: NoteFormInput): string | null {
  if (!input.content.trim()) return "Inhalt darf nicht leer sein.";
  if (input.type !== "note" && input.type !== "draft") return "Ungültiger Typ.";
  return null;
}

export async function createNote(
  input: NoteFormInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const userId = userData.user.id;

  if (input.area_id) {
    const { data: area } = await supabase
      .from("areas")
      .select("id")
      .eq("id", input.area_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!area) return { ok: false, error: "Bereich nicht gefunden." };
  }

  const sparId = input.source_sparring_chat_id?.trim() || null;
  if (sparId) {
    const { data: sc } = await supabase
      .from("sparring_chats")
      .select("id")
      .eq("id", sparId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!sc) return { ok: false, error: "Sparring nicht gefunden." };
  }

  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      title: input.title?.trim() || input.content.trim().split("\n")[0] || "Notiz",
      description: input.description?.trim() || null,
      document_id: input.document_id?.trim() || null,
      content: input.content.trim(),
      type: input.type,
      area_id: input.area_id || null,
      source_sparring_chat_id: sparId,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Notiz konnte nicht angelegt werden." };
  revalidate();
  if (sparId) {
    revalidatePath("/sparring");
    revalidatePath(`/sparring/${sparId}`);
  }
  return { ok: true, id: data.id as string };
}

export async function updateNote(
  id: string,
  input: NoteFormInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const userId = userData.user.id;

  if (input.area_id) {
    const { data: area } = await supabase
      .from("areas")
      .select("id")
      .eq("id", input.area_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!area) return { ok: false, error: "Bereich nicht gefunden." };
  }

  const { error } = await supabase
    .from("notes")
    .update({
      title: input.title?.trim() || input.content.trim().split("\n")[0] || "Notiz",
      description: input.description?.trim() || null,
      document_id: input.document_id?.trim() || null,
      content: input.content.trim(),
      type: input.type,
      area_id: input.area_id || null,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function deleteNote(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { error } = await supabase.from("notes").delete().eq("id", id).eq("user_id", userData.user.id);

  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}
