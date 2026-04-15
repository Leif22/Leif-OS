"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sanitizeFilename } from "@/lib/documents/sanitize-filename";

function parseIdListJson(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const j = JSON.parse(raw) as unknown;
    if (!Array.isArray(j)) return [];
    return j.map((x) => String(x)).filter((x) => /^[0-9a-f-]{36}$/i.test(x));
  } catch {
    return [];
  }
}

export async function createDocumentUpload(
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Bitte eine Datei wählen." };
  }
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "Titel ist Pflichtfeld." };
  const descriptionRaw = String(formData.get("description") ?? "").trim();
  const description = descriptionRaw || null;

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const user = userData.user;

  /** Obergrenze pro Upload in der App (Bucket hat kein file_size_limit mehr). Tarif-Limits von Supabase gelten weiter. */
  const maxBytes = 250 * 1024 * 1024;
  if (file.size > maxBytes) return { ok: false, error: "Datei zu groß (max. 250 MB pro Upload)." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const documentId = randomUUID();
  const origName = sanitizeFilename(file.name, "dokument");
  const storagePath = `${user.id}/${documentId}/${origName}`;
  const mimeType = file.type?.trim() || "application/octet-stream";

  const up = await supabase.storage.from("documents").upload(storagePath, buffer, {
    contentType: mimeType,
    upsert: false,
  });
  if (up.error) return { ok: false, error: up.error.message };

  const { data: doc, error: insErr } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      user_id: user.id,
      title,
      description,
      storage_path: storagePath,
      original_filename: origName,
      mime_type: mimeType,
      byte_size: buffer.length,
      source: "manual",
      metadata: {},
    })
    .select("id")
    .single();

  if (insErr || !doc) {
    await supabase.storage.from("documents").remove([storagePath]);
    return { ok: false, error: insErr?.message ?? "Dokument konnte nicht gespeichert werden." };
  }

  const areaIds = parseIdListJson(formData.get("area_ids"));
  const personIds = parseIdListJson(formData.get("person_ids"));
  const noteIds = parseIdListJson(formData.get("note_ids"));
  const resultIds = parseIdListJson(formData.get("result_ids"));

  if (areaIds.length) {
    const { error } = await supabase.from("document_area_links").insert(
      areaIds.map((area_id) => ({ document_id: documentId, area_id })),
    );
    if (error) {
      await supabase.from("documents").delete().eq("id", documentId).eq("user_id", user.id);
      await supabase.storage.from("documents").remove([storagePath]);
      return { ok: false, error: error.message };
    }
  }
  if (personIds.length) {
    const { error } = await supabase.from("document_person_links").insert(
      personIds.map((person_id) => ({ document_id: documentId, person_id })),
    );
    if (error) {
      await supabase.from("documents").delete().eq("id", documentId).eq("user_id", user.id);
      await supabase.storage.from("documents").remove([storagePath]);
      return { ok: false, error: error.message };
    }
  }
  if (noteIds.length) {
    const { error } = await supabase.from("document_note_links").insert(
      noteIds.map((note_id) => ({ document_id: documentId, note_id })),
    );
    if (error) {
      await supabase.from("documents").delete().eq("id", documentId).eq("user_id", user.id);
      await supabase.storage.from("documents").remove([storagePath]);
      return { ok: false, error: error.message };
    }
  }
  if (resultIds.length) {
    const { error } = await supabase.from("document_result_links").insert(
      resultIds.map((result_id) => ({ document_id: documentId, result_id })),
    );
    if (error) {
      await supabase.from("documents").delete().eq("id", documentId).eq("user_id", user.id);
      await supabase.storage.from("documents").remove([storagePath]);
      return { ok: false, error: error.message };
    }
  }

  revalidatePath("/dokumente");
  revalidatePath(`/dokumente/${documentId}`);
  return { ok: true, id: documentId };
}

export async function updateDocumentMeta(
  documentId: string,
  input: { title: string; description: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Titel ist Pflichtfeld." };
  const description = input.description?.trim() ? input.description.trim() : null;

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("documents")
    .update({ title, description })
    .eq("id", documentId)
    .eq("user_id", userData.user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dokumente");
  revalidatePath(`/dokumente/${documentId}`);
  return { ok: true };
}

export async function getDocumentDownloadUrl(
  documentId: string,
  options?: { download?: boolean },
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { data: row, error } = await supabase
    .from("documents")
    .select("storage_path, original_filename")
    .eq("id", documentId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (error || !row) return { ok: false, error: error?.message ?? "Nicht gefunden." };

  const signOpts = options?.download
    ? { download: sanitizeFilename(row.original_filename, "Dokument") }
    : undefined;

  const { data: signed, error: sErr } = await supabase.storage
    .from("documents")
    .createSignedUrl(row.storage_path, 3600, signOpts);
  if (sErr || !signed?.signedUrl) return { ok: false, error: sErr?.message ?? "Download-URL fehlgeschlagen." };
  return { ok: true, url: signed.signedUrl };
}

export async function deleteDocument(
  documentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { data: row } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Nicht gefunden." };

  const { error: delErr } = await supabase.from("documents").delete().eq("id", documentId).eq("user_id", userData.user.id);
  if (delErr) return { ok: false, error: delErr.message };

  await supabase.storage.from("documents").remove([row.storage_path]);

  revalidatePath("/dokumente");
  revalidatePath(`/dokumente/${documentId}`);
  return { ok: true };
}

export async function addDocumentAreaLink(
  documentId: string,
  areaId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { error } = await supabase.from("document_area_links").insert({ document_id: documentId, area_id: areaId });
  if (error) {
    if (error.code === "23505") return { ok: true };
    return { ok: false, error: error.message };
  }
  revalidatePath("/dokumente");
  revalidatePath(`/dokumente/${documentId}`);
  return { ok: true };
}

export async function removeDocumentAreaLink(
  documentId: string,
  areaId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("document_area_links")
    .delete()
    .eq("document_id", documentId)
    .eq("area_id", areaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dokumente");
  revalidatePath(`/dokumente/${documentId}`);
  return { ok: true };
}

export async function addDocumentPersonLink(
  documentId: string,
  personId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { error } = await supabase.from("document_person_links").insert({ document_id: documentId, person_id: personId });
  if (error) {
    if (error.code === "23505") return { ok: true };
    return { ok: false, error: error.message };
  }
  revalidatePath("/dokumente");
  revalidatePath(`/dokumente/${documentId}`);
  return { ok: true };
}

export async function removeDocumentPersonLink(
  documentId: string,
  personId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("document_person_links")
    .delete()
    .eq("document_id", documentId)
    .eq("person_id", personId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dokumente");
  revalidatePath(`/dokumente/${documentId}`);
  return { ok: true };
}

export async function addDocumentNoteLink(
  documentId: string,
  noteId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { error } = await supabase.from("document_note_links").insert({ document_id: documentId, note_id: noteId });
  if (error) {
    if (error.code === "23505") return { ok: true };
    return { ok: false, error: error.message };
  }
  revalidatePath("/dokumente");
  revalidatePath(`/dokumente/${documentId}`);
  return { ok: true };
}

export async function removeDocumentNoteLink(
  documentId: string,
  noteId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("document_note_links")
    .delete()
    .eq("document_id", documentId)
    .eq("note_id", noteId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dokumente");
  revalidatePath(`/dokumente/${documentId}`);
  return { ok: true };
}

export async function addDocumentResultLink(
  documentId: string,
  resultId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("document_result_links")
    .insert({ document_id: documentId, result_id: resultId });
  if (error) {
    if (error.code === "23505") return { ok: true };
    return { ok: false, error: error.message };
  }
  revalidatePath("/dokumente");
  revalidatePath(`/dokumente/${documentId}`);
  return { ok: true };
}

export async function removeDocumentResultLink(
  documentId: string,
  resultId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("document_result_links")
    .delete()
    .eq("document_id", documentId)
    .eq("result_id", resultId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dokumente");
  revalidatePath(`/dokumente/${documentId}`);
  return { ok: true };
}
