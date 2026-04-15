import type { SupabaseClient } from "@supabase/supabase-js";
import type { NoteListItem, NoteType } from "./types";

function isNoteType(s: string): s is NoteType {
  return s === "note" || s === "draft";
}

export async function fetchNotesForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ notes: NoteListItem[]; deletedNotes: NoteListItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from("notes")
    .select("id, user_id, content, type, area_id, source_sparring_chat_id, source_inbox_item_id, deleted_at, created_at, updated_at, areas(name)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) return { notes: [], deletedNotes: [], error: error.message };

  const allNotes: NoteListItem[] = (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const areas = r.areas as { name?: string } | { name?: string }[] | null;
    const areaName = Array.isArray(areas)
      ? areas[0]?.name ?? null
      : typeof areas === "object" && areas && "name" in areas
        ? String((areas as { name: string }).name)
        : null;
    return {
      id: String(r.id),
      user_id: String(r.user_id),
      content: String(r.content ?? ""),
      type: isNoteType(String(r.type)) ? String(r.type) as NoteType : "note",
      area_id: r.area_id == null ? null : String(r.area_id),
      source_sparring_chat_id: r.source_sparring_chat_id == null ? null : String(r.source_sparring_chat_id),
      source_inbox_item_id: r.source_inbox_item_id == null ? null : String(r.source_inbox_item_id),
      deleted_at: r.deleted_at == null ? null : String(r.deleted_at),
      created_at: String(r.created_at ?? ""),
      updated_at: String(r.updated_at ?? ""),
      area_name: areaName,
    };
  });

  const notes = allNotes.filter((note) => !note.deleted_at);
  const deletedNotes = allNotes.filter((note) => Boolean(note.deleted_at));
  return { notes, deletedNotes, error: null };
}
