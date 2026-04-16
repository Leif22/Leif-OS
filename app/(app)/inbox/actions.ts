"use server";

import { randomUUID } from "crypto";
import { createCalendarEvent } from "@/app/(app)/kalender/actions";
import { revalidatePath } from "next/cache";
import { sanitizeFilename } from "@/lib/documents/sanitize-filename";
import { isTelegramInboxAttachment } from "@/lib/telegram/attachment-types";
import { telegramDownloadFile } from "@/lib/telegram/download-file";
import { createClient } from "@/lib/supabase/server";
import { buildInboxSuggestion, parseInboxAiSuggestion } from "@/lib/inbox/ai-suggestions";
import type { CalendarEventFormPayload } from "@/lib/calendar/types";
import type { InboxAiSuggestion } from "@/lib/inbox/types";
import type { TaskPriority, TaskType } from "@/lib/tasks/types";
import { insertSparringChatFromInbox } from "@/lib/sparring/insert-chat";

export async function createInboxItemFromTaskDraft(input: {
  title: string;
  description?: string | null;
  /** UI-Herkunft für Metadaten (z. B. Header vs. „+ Neu“). */
  createdFrom?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const title = input.title.trim();
  const description = String(input.description ?? "").trim();
  if (!title) {
    return { ok: false, error: "Titel ist Pflichtfeld." };
  }

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const userId = userData.user.id;

  const content = description ? `${title}\n\n${description}` : title;
  const suggestion = await buildInboxSuggestion(supabase, userId, content);
  const { data, error } = await supabase
    .from("inbox_items")
    .insert({
      user_id: userId,
      content,
      source: "manual_task",
      source_ref: null,
      status: "pending",
      ai_status: suggestion.status,
      ai_suggestion: suggestion.suggestion,
      ai_checked_at: suggestion.checkedAt,
      ai_error: suggestion.error,
      metadata: {
        created_from: input.createdFrom?.trim() || "global_plus_menu",
        target_type: "task",
      },
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Inbox-Eintrag konnte nicht angelegt werden." };

  revalidatePath("/dashboard");
  revalidatePath("/inbox");
  return { ok: true, id: String(data.id) };
}

export async function ensureInboxAiSuggestion(
  inboxItemId: string,
): Promise<{ ok: true; suggestion: InboxAiSuggestion | null } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const userId = userData.user.id;

  const { data: item, error } = await supabase
    .from("inbox_items")
    .select("id, content, status, metadata, ai_status, ai_suggestion, ai_checked_at, ai_error")
    .eq("id", inboxItemId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !item) return { ok: false, error: error?.message ?? "Inbox-Eintrag nicht gefunden." };
  if (item.status !== "pending") return { ok: true, suggestion: null };

  const direct = parseInboxAiSuggestion(item.ai_suggestion);
  if (direct && item.ai_status === "ready") {
    return { ok: true, suggestion: direct };
  }

  const metadata =
    item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
      ? (item.metadata as Record<string, unknown>)
      : {};
  if (typeof metadata.ai_suggestion_rejected_at === "string" && metadata.ai_suggestion_rejected_at.trim()) {
    return { ok: true, suggestion: null };
  }

  const built = await buildInboxSuggestion(supabase, userId, String(item.content ?? ""));
  const nextMeta: Record<string, unknown> = {
    ...metadata,
    ai_suggestion_v1: built.suggestion ?? null,
    ai_suggestion_checked_at: built.checkedAt,
  };
  await supabase
    .from("inbox_items")
    .update({
      ai_status: built.status,
      ai_suggestion: built.suggestion,
      ai_checked_at: built.checkedAt,
      ai_error: built.error,
      metadata: nextMeta,
    })
    .eq("id", inboxItemId)
    .eq("user_id", userId)
    .eq("status", "pending");

  return { ok: true, suggestion: built.suggestion };
}

export async function rejectInboxAiSuggestion(
  inboxItemId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { data: item, error } = await supabase
    .from("inbox_items")
    .select("id, metadata, status")
    .eq("id", inboxItemId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (error || !item) return { ok: false, error: error?.message ?? "Inbox-Eintrag nicht gefunden." };
  if (item.status !== "pending") return { ok: true };

  const metadata =
    item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
      ? (item.metadata as Record<string, unknown>)
      : {};
  const nextMeta: Record<string, unknown> = { ...metadata };
  delete nextMeta.ai_suggestion_v1;
  nextMeta.ai_suggestion_rejected_at = new Date().toISOString();

  const { error: updErr } = await supabase
    .from("inbox_items")
    .update({
      ai_status: "rejected",
      ai_suggestion: null,
      ai_error: null,
      metadata: nextMeta,
    })
    .eq("id", inboxItemId)
    .eq("user_id", userData.user.id)
    .eq("status", "pending");
  if (updErr) return { ok: false, error: updErr.message };

  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function applyInboxAiSuggestion(
  inboxItemId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ensured = await ensureInboxAiSuggestion(inboxItemId);
  if (!ensured.ok) return ensured;
  const suggestion = ensured.suggestion;
  if (!suggestion) return { ok: false, error: "Kein KI-Vorschlag vorhanden." };

  if (suggestion.tool === "task") {
    const dueChoice = suggestion.task?.due_choice ?? "today";
    const today = new Date();
    const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const tomorrowDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 12, 0, 0);
    const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, "0")}-${String(tomorrowDate.getDate()).padStart(2, "0")}`;
    const plannedDate =
      dueChoice === "today"
        ? ymd
        : dueChoice === "tomorrow"
          ? tomorrow
          : suggestion.task?.due_choice === "date"
            ? (suggestion.task?.due_date ?? null)
            : null;
    const res = await createTaskFromInbox({
      inbox_item_id: inboxItemId,
      title: suggestion.title,
      description: suggestion.task?.description ?? "",
      priority: suggestion.task?.priority ?? "normal",
      task_type: (suggestion.task?.task_type ?? null) as TaskType | null,
      planned_date: plannedDate,
      estimated_minutes: suggestion.task?.duration_minutes ?? 30,
      document_id: suggestion.task?.document_id ?? null,
    });
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true };
  }

  if (suggestion.tool === "calendar") {
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setMinutes(0, 0, 0);
    defaultStart.setHours(defaultStart.getHours() + 1);
    const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);
    const startLocal = suggestion.calendar?.start_local?.trim() || defaultStart.toISOString().slice(0, 16);
    const endLocal = suggestion.calendar?.end_local?.trim() || defaultEnd.toISOString().slice(0, 16);
    const s = new Date(startLocal);
    const e = new Date(endLocal);
    if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime()) || e <= s) {
      return { ok: false, error: "Ungültiger Kalender-Vorschlag (Start/Ende)." };
    }
    const res = await createCalendarEventFromInboxItem(inboxItemId, {
      title: suggestion.title,
      description: suggestion.calendar?.description ?? "",
      location: suggestion.calendar?.location ?? "",
      is_private: Boolean(suggestion.calendar?.is_private),
      start_time: s.toISOString(),
      end_time: e.toISOString(),
      is_all_day: Boolean(suggestion.calendar?.is_all_day),
    });
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true };
  }

  const noteRes = await createNoteFromInboxItem({
    inbox_item_id: inboxItemId,
    title: suggestion.title,
    description: suggestion.note?.description ?? "",
    type: suggestion.note?.type === "draft" ? "draft" : "note",
    area_id: null,
    document_id: suggestion.note?.document_id ?? null,
  });
  if (!noteRes.ok) return { ok: false, error: noteRes.error };
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
  description?: string | null;
  priority?: TaskPriority;
  task_type?: TaskType | null;
  planned_date?: string | null;
  estimated_minutes?: number | null;
  document_id?: string | null;
};

const TASK_PRIORITIES: TaskPriority[] = ["high", "normal", "low"];

function coerceTaskPriority(v: unknown): TaskPriority {
  const s = String(v ?? "");
  const normalized = s === "medium" ? "normal" : s;
  return TASK_PRIORITIES.includes(normalized as TaskPriority) ? (normalized as TaskPriority) : "normal";
}

export async function createTaskFromInbox(
  input: CreateTaskFromInboxInput,
): Promise<{ ok: true; taskId: string } | { ok: false; error: string }> {
  const title = input.title.trim();
  const description = String(input.description ?? "").trim();
  const priority = coerceTaskPriority(input.priority);
  const taskTypeRaw = String(input.task_type ?? "").trim();
  const taskType = taskTypeRaw || null;
  const plannedDate = input.planned_date && input.planned_date.trim() ? input.planned_date.trim() : null;
  const estimatedMinutes =
    typeof input.estimated_minutes === "number" && Number.isFinite(input.estimated_minutes)
      ? Math.max(0, Math.round(input.estimated_minutes))
      : null;
  const documentId = input.document_id && input.document_id.trim() ? input.document_id.trim() : null;
  if (!title) {
    return { ok: false, error: "Titel ist Pflichtfeld." };
  }
  if (plannedDate && (!estimatedMinutes || estimatedMinutes <= 0)) {
    return { ok: false, error: "Für geplante Tasks ist die Dauer Pflicht." };
  }

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return { ok: false, error: "Nicht angemeldet." };
  }
  const user = userData.user;
  let resolvedTaskType: TaskType | null = null;
  if (taskType) {
    const { data: tt } = await supabase
      .from("user_task_types")
      .select("key")
      .eq("user_id", user.id)
      .eq("key", taskType)
      .maybeSingle();
    resolvedTaskType = tt ? (taskType as TaskType) : null;
  }

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
      area_id: null,
      title,
      description: description || String(item.content ?? ""),
      task_type: resolvedTaskType,
      priority,
      planned_date: plannedDate,
      estimated_minutes: estimatedMinutes,
      document_id: documentId,
      completed_at: null,
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

function subjectFromInboxContent(content: string): string {
  const line = content.split("\n")[0]?.trim() ?? "";
  const base = line || content.trim() || "Inbox";
  return base.length > 200 ? `${base.slice(0, 197)}…` : base;
}

export async function createSparringFromInboxItem(
  inboxItemId: string,
): Promise<{ ok: true; chatId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return { ok: false, error: "Nicht angemeldet." };
  }
  const user = userData.user;

  const { data: item, error: itemErr } = await supabase
    .from("inbox_items")
    .select("id, content, status")
    .eq("id", inboxItemId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (itemErr || !item) {
    return { ok: false, error: itemErr?.message ?? "Inbox-Eintrag nicht gefunden." };
  }
  if (item.status !== "pending") {
    return { ok: false, error: "Eintrag ist nicht mehr offen." };
  }

  const raw = String(item.content ?? "");
  const title = subjectFromInboxContent(raw);
  const row = await insertSparringChatFromInbox(supabase, user.id, {
    inboxItemId,
    title,
    firstUserMessage: raw.trim() || "(Kein Inhalt.)",
  });
  if ("error" in row) {
    return { ok: false, error: row.error };
  }

  const { error: updErr } = await supabase
    .from("inbox_items")
    .update({
      status: "processed",
      processed_as: "sparring",
      processed_ref_id: row.id,
    })
    .eq("id", inboxItemId)
    .eq("user_id", user.id);

  if (updErr) {
    return { ok: false, error: updErr.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/inbox");
  revalidatePath("/sparring");
  revalidatePath(`/sparring/${row.id}`);
  return { ok: true, chatId: row.id };
}

export type CreateNoteFromInboxInput = {
  inbox_item_id: string;
  title: string;
  description?: string | null;
  type: string;
  area_id: string | null;
  document_id?: string | null;
};

export async function createNoteFromInboxItem(
  input: CreateNoteFromInboxInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Titel ist Pflichtfeld." };
  const description = String(input.description ?? "").trim();
  const content = description ? `${title}\n\n${description}` : title;
  const noteType = String(input.type ?? "").trim();
  if (!noteType) return { ok: false, error: "Art ist ungültig." };

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const user = userData.user;

  const { data: item, error: itemErr } = await supabase
    .from("inbox_items")
    .select("id, status")
    .eq("id", input.inbox_item_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (itemErr || !item) return { ok: false, error: itemErr?.message ?? "Inbox-Eintrag nicht gefunden." };
  if (item.status !== "pending") return { ok: false, error: "Eintrag ist nicht mehr offen." };

  const areaId = input.area_id?.trim() || null;
  if (areaId) {
    const { data: area } = await supabase
      .from("areas")
      .select("id")
      .eq("id", areaId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!area) return { ok: false, error: "Bereich nicht gefunden." };
  }

  const { data: note, error: insErr } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      title,
      description: description || null,
      document_id: input.document_id?.trim() || null,
      content,
      type: noteType,
      area_id: areaId,
      source_inbox_item_id: input.inbox_item_id,
    })
    .select("id")
    .single();

  if (insErr || !note) return { ok: false, error: insErr?.message ?? "Notiz konnte nicht angelegt werden." };

  const { error: updErr } = await supabase
    .from("inbox_items")
    .update({
      status: "processed",
      processed_as: "note",
      processed_ref_id: note.id as string,
    })
    .eq("id", input.inbox_item_id)
    .eq("user_id", user.id);

  if (updErr) {
    await supabase.from("notes").delete().eq("id", note.id).eq("user_id", user.id);
    return { ok: false, error: updErr.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/inbox");
  revalidatePath("/notizen");
  return { ok: true, id: note.id as string };
}

export async function createCalendarEventFromInboxItem(
  inboxItemId: string,
  payload: CalendarEventFormPayload,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const user = userData.user;

  const { data: item, error: itemErr } = await supabase
    .from("inbox_items")
    .select("id, status")
    .eq("id", inboxItemId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (itemErr || !item) return { ok: false, error: itemErr?.message ?? "Inbox-Eintrag nicht gefunden." };
  if (item.status !== "pending") return { ok: false, error: "Eintrag ist nicht mehr offen." };

  const ev = await createCalendarEvent(payload);
  if (!ev.ok) return ev;

  const { error: updErr } = await supabase
    .from("inbox_items")
    .update({
      status: "processed",
      processed_as: "event",
      processed_ref_id: ev.id,
    })
    .eq("id", inboxItemId)
    .eq("user_id", user.id);

  if (updErr) {
    return { ok: false, error: updErr.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/inbox");
  revalidatePath("/kalender");
  return { ok: true, id: ev.id };
}

export type CreateDocumentFromInboxInput = {
  inbox_item_id: string;
  title: string;
};

export async function createDocumentFromInboxItem(
  input: CreateDocumentFromInboxInput,
): Promise<{ ok: true; documentId: string } | { ok: false; error: string }> {
  const title = input.title.trim();
  if (!title) {
    return { ok: false, error: "Titel ist Pflichtfeld." };
  }

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return { ok: false, error: "Nicht angemeldet." };
  }
  const user = userData.user;

  const { data: item, error: itemErr } = await supabase
    .from("inbox_items")
    .select("id, content, source, status, metadata")
    .eq("id", input.inbox_item_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (itemErr || !item) {
    return { ok: false, error: itemErr?.message ?? "Inbox-Eintrag nicht gefunden." };
  }
  if (item.status !== "pending") {
    return { ok: false, error: "Eintrag ist nicht mehr offen." };
  }

  const metadata =
    item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
      ? (item.metadata as Record<string, unknown>)
      : {};
  const tg = metadata.telegram;
  const rawAtt =
    tg && typeof tg === "object" && !Array.isArray(tg) ? (tg as Record<string, unknown>).attachment : null;
  const att = isTelegramInboxAttachment(rawAtt) ? rawAtt : null;

  let buffer: Buffer;
  let originalFilename: string;
  let mimeType: string;

  if (att) {
    const dl = await telegramDownloadFile(att.file_id);
    if (!dl.ok) {
      return { ok: false, error: dl.error };
    }
    buffer = dl.buffer;
    originalFilename = sanitizeFilename(dl.suggestedName, `telegram-${att.kind}`);
    mimeType =
      att.kind === "document"
        ? (att.mime_type?.trim() || "application/octet-stream")
        : att.kind === "photo"
          ? "image/jpeg"
          : att.mime_type?.trim() || "application/octet-stream";
    if (att.kind === "photo" && !/\.(jpe?g|png|webp)$/i.test(originalFilename)) {
      originalFilename = `${originalFilename.replace(/\.+$/g, "")}.jpg`;
    }
  } else {
    const text = String(item.content ?? "").trim() || "(leer)";
    buffer = Buffer.from(text, "utf-8");
    originalFilename = `inbox-${input.inbox_item_id.slice(0, 8)}.txt`;
    mimeType = "text/plain; charset=utf-8";
  }

  const documentId = randomUUID();
  const safeFile = sanitizeFilename(originalFilename, "datei");
  const storagePath = `${user.id}/${documentId}/${safeFile}`;
  const contentType = mimeType.split(";")[0]?.trim() || mimeType;

  const upload = await supabase.storage.from("documents").upload(storagePath, buffer, {
    contentType,
    upsert: false,
  });
  if (upload.error) {
    return { ok: false, error: upload.error.message };
  }

  const source: "inbox" | "telegram_inbox" =
    item.source === "telegram" && att ? "telegram_inbox" : "inbox";
  const description =
    att && String(item.content ?? "").trim() ? String(item.content).trim() : null;

  const { data: doc, error: insErr } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      user_id: user.id,
      title,
      description,
      storage_path: storagePath,
      original_filename: safeFile,
      mime_type: contentType,
      byte_size: buffer.length,
      source,
      source_inbox_item_id: item.id,
      metadata: { ...metadata, created_from: "inbox" },
    })
    .select("id")
    .single();

  if (insErr || !doc) {
    await supabase.storage.from("documents").remove([storagePath]);
    return { ok: false, error: insErr?.message ?? "Dokument konnte nicht gespeichert werden." };
  }

  const { error: updErr } = await supabase
    .from("inbox_items")
    .update({
      status: "processed",
      processed_as: "document",
      processed_ref_id: documentId,
    })
    .eq("id", input.inbox_item_id)
    .eq("user_id", user.id);

  if (updErr) {
    await supabase.from("documents").delete().eq("id", documentId).eq("user_id", user.id);
    await supabase.storage.from("documents").remove([storagePath]);
    return { ok: false, error: updErr.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/inbox");
  revalidatePath("/dokumente");
  return { ok: true, documentId };
}
