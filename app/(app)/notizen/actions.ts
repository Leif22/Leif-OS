"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidate() {
  revalidatePath("/notizen");
  revalidatePath("/bereiche", "layout");
}

export type NoteFormInput = {
  title?: string;
  description?: string | null;
  document_id?: string | null;
  project_id?: string | null;
  content?: string;
  type?: string | null;
  area_id?: string | null;
  /** Optional: Herkunft aus KI-Sparring (Referenz in `notes`). */
  source_sparring_chat_id?: string | null;
};

function validate(input: NoteFormInput): string | null {
  if (!String(input.title ?? "").trim() && !String(input.content ?? "").trim()) return "Titel ist Pflichtfeld.";
  return null;
}

function normalize(input: NoteFormInput): {
  title: string;
  description: string | null;
  document_id: string | null;
  project_id: string | null;
  content: string;
  type: string;
  area_id: string | null;
} {
  const rawTitle = String(input.title ?? "").trim();
  const rawDescription = String(input.description ?? "").trim();
  const fallbackContent = String(input.content ?? "").trim();
  const title = rawTitle || fallbackContent.split("\n")[0] || "Notiz";
  const description = rawDescription || null;
  const content = description ? `${title}\n\n${description}` : title;
  const rawType = String(input.type ?? "").trim();
  const type = rawType || "note";
  return {
    title,
    description,
    document_id: input.document_id?.trim() || null,
    project_id: input.project_id?.trim() || null,
    content,
    type,
    area_id: input.area_id?.trim() || null,
  };
}

export async function createNote(
  input: NoteFormInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const err = validate(input);
  if (err) return { ok: false, error: err };
  const normalized = normalize(input);

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const userId = userData.user.id;

  if (normalized.area_id) {
    const { data: area } = await supabase
      .from("areas")
      .select("id")
      .eq("id", normalized.area_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!area) return { ok: false, error: "Bereich nicht gefunden." };
  }
  if (normalized.project_id) {
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", normalized.project_id)
      .eq("user_id", userId)
      .eq("is_archived", false)
      .maybeSingle();
    if (!project) return { ok: false, error: "Projekt nicht gefunden." };
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
      title: normalized.title,
      description: normalized.description,
      document_id: normalized.document_id,
      project_id: normalized.project_id,
      content: normalized.content,
      type: normalized.type,
      area_id: normalized.area_id,
      deleted_at: null,
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
  const normalized = normalize(input);

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const userId = userData.user.id;

  if (normalized.area_id) {
    const { data: area } = await supabase
      .from("areas")
      .select("id")
      .eq("id", normalized.area_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!area) return { ok: false, error: "Bereich nicht gefunden." };
  }
  if (normalized.project_id) {
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", normalized.project_id)
      .eq("user_id", userId)
      .eq("is_archived", false)
      .maybeSingle();
    if (!project) return { ok: false, error: "Projekt nicht gefunden." };
  }

  const { error } = await supabase
    .from("notes")
    .update({
      title: normalized.title,
      description: normalized.description,
      document_id: normalized.document_id,
      project_id: normalized.project_id,
      content: normalized.content,
      type: normalized.type,
      area_id: normalized.area_id,
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

  const { error } = await supabase
    .from("notes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userData.user.id);

  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function restoreNote(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("notes")
    .update({ deleted_at: null })
    .eq("id", id)
    .eq("user_id", userData.user.id);

  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}
