import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DocumentAreaLink,
  DocumentNoteLink,
  DocumentPersonLink,
  DocumentResultLink,
  DocumentRow,
  DocumentWithLinks,
} from "./types";

function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function normalizeAreaLinks(raw: unknown): DocumentAreaLink[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as { area_id: string; areas?: unknown };
    return {
      area_id: String(r.area_id),
      areas: one(r.areas as { id: string; name: string } | null),
    };
  });
}

function normalizePersonLinks(raw: unknown): DocumentPersonLink[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as { person_id: string; persons?: unknown };
    return {
      person_id: String(r.person_id),
      persons: one(r.persons as { id: string; first_name: string; last_name: string } | null),
    };
  });
}

function normalizeNoteLinks(raw: unknown): DocumentNoteLink[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as { note_id: string; notes?: unknown };
    return {
      note_id: String(r.note_id),
      notes: one(r.notes as { id: string; content: string } | null),
    };
  });
}

function normalizeResultLinks(raw: unknown): DocumentResultLink[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as { result_id: string; results?: unknown };
    return {
      result_id: String(r.result_id),
      results: one(r.results as { id: string; title: string } | null),
    };
  });
}

function asDocRow(row: Record<string, unknown>): DocumentRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    title: String(row.title ?? ""),
    description: row.description == null ? null : String(row.description),
    storage_path: String(row.storage_path ?? ""),
    original_filename: String(row.original_filename ?? ""),
    mime_type: String(row.mime_type ?? ""),
    byte_size: Number(row.byte_size ?? 0),
    source: row.source === "telegram_inbox" || row.source === "inbox" || row.source === "manual" ? row.source : "manual",
    source_inbox_item_id: row.source_inbox_item_id == null ? null : String(row.source_inbox_item_id),
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function fetchDocumentDetail(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
): Promise<{ doc: DocumentWithLinks | null; error: string | null }> {
  const { data: row, error: dErr } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (dErr) return { doc: null, error: dErr.message };
  if (!row) return { doc: null, error: null };

  const base = asDocRow(row as Record<string, unknown>);

  const [areas, persons, notes, results] = await Promise.all([
    supabase
      .from("document_area_links")
      .select("area_id, areas ( id, name )")
      .eq("document_id", documentId),
    supabase
      .from("document_person_links")
      .select("person_id, persons ( id, first_name, last_name )")
      .eq("document_id", documentId),
    supabase
      .from("document_note_links")
      .select("note_id, notes ( id, content )")
      .eq("document_id", documentId),
    supabase
      .from("document_result_links")
      .select("result_id, results ( id, title )")
      .eq("document_id", documentId),
  ]);

  const err =
    areas.error?.message ??
    persons.error?.message ??
    notes.error?.message ??
    results.error?.message ??
    null;
  if (err) return { doc: null, error: err };

  return {
    doc: {
      ...base,
      document_area_links: normalizeAreaLinks(areas.data),
      document_person_links: normalizePersonLinks(persons.data),
      document_note_links: normalizeNoteLinks(notes.data),
      document_result_links: normalizeResultLinks(results.data),
    },
    error: null,
  };
}
