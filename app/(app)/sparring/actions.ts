"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { insertSparringChatRow } from "@/lib/sparring/insert-chat";
import { parseSparringAiModelKey } from "@/lib/sparring/sparring-ai-model";
import { tryAppendOpenAiAssistantReply } from "@/lib/sparring/openai-assistant-reply";
import { resolveSparringAttachmentForAi } from "@/lib/sparring/resolve-sparring-attachment";
import { fetchSparringNotizPrefillFromMessage } from "@/lib/sparring/note-prefill";
import { fetchSparringTaskDraftFromMessage } from "@/lib/sparring/task-draft";

export type SparringMessageWriteResult =
  | { ok: true; assistantWarning?: string }
  | { ok: false; error: string };

export async function createSparringChat(
  title: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const row = await insertSparringChatRow(supabase, userData.user.id, title);
  if ("error" in row) return { ok: false, error: row.error };
  revalidatePath("/sparring");
  return { ok: true, id: row.id };
}

/** Legt einen Chat erst an, wenn die erste Nutzernachricht gespeichert wird (kein Leer-Sparring). */
export async function createSparringChatWithFirstMessage(
  formData: FormData,
): Promise<{ ok: true; id: string; assistantWarning?: string } | { ok: false; error: string }> {
  const content = String(formData.get("content") ?? "");
  const documentId = String(formData.get("documentId") ?? "").trim() || null;
  const rawFile = formData.get("attachment");
  const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const resolved = await resolveSparringAttachmentForAi(supabase, userData.user.id, {
    file,
    documentId,
  });
  if (!resolved.ok) return { ok: false, error: resolved.error };

  const combined = `${content.trim()}${resolved.suffix}`.trim();
  if (!combined) return { ok: false, error: "Nachricht ist leer (oder Anhang fehlt)." };

  const modelKey = parseSparringAiModelKey(formData.get("modelKey"));
  const row = await insertSparringChatRow(supabase, userData.user.id, "", { ai_model: modelKey });
  if ("error" in row) return { ok: false, error: row.error };

  const { error: msgErr } = await supabase.from("sparring_messages").insert({
    chat_id: row.id,
    role: "user",
    content: combined,
  });

  if (msgErr) {
    await supabase
      .from("sparring_chats")
      .delete()
      .eq("id", row.id)
      .eq("user_id", userData.user.id);
    return { ok: false, error: msgErr.message };
  }

  const ai = await tryAppendOpenAiAssistantReply(supabase, userData.user.id, row.id, {
    lastUserVision: resolved.vision,
  });
  const assistantWarning =
    ai.status === "failed"
      ? `KI-Antwort konnte nicht gespeichert werden: ${ai.message}`
      : undefined;

  revalidatePath("/sparring");
  revalidatePath(`/sparring/${row.id}`);
  return { ok: true, id: row.id, assistantWarning };
}

/** Markiert das Sparring als gelöscht (soft); sichtbar nur mit Filter „Gelöschte“. */
export async function deleteSparringChat(
  chatId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("sparring_chats")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", chatId)
    .eq("user_id", userData.user.id)
    .is("deleted_at", null);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/sparring");
  revalidatePath(`/sparring/${chatId}`);
  return { ok: true };
}

export async function appendSparringUserMessage(formData: FormData): Promise<SparringMessageWriteResult> {
  const chatId = String(formData.get("chatId") ?? "").trim();
  if (!chatId) return { ok: false, error: "Chat fehlt." };

  const content = String(formData.get("content") ?? "");
  const documentId = String(formData.get("documentId") ?? "").trim() || null;
  const rawFile = formData.get("attachment");
  const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const resolved = await resolveSparringAttachmentForAi(supabase, userData.user.id, {
    file,
    documentId,
  });
  if (!resolved.ok) return { ok: false, error: resolved.error };

  const combined = `${content.trim()}${resolved.suffix}`.trim();
  if (!combined) return { ok: false, error: "Nachricht ist leer (oder Anhang fehlt)." };

  const { data: chat } = await supabase
    .from("sparring_chats")
    .select("id, deleted_at")
    .eq("id", chatId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!chat) return { ok: false, error: "Chat nicht gefunden." };
  if (chat.deleted_at) return { ok: false, error: "Dieses Sparring wurde gelöscht." };

  const { error } = await supabase.from("sparring_messages").insert({
    chat_id: chatId,
    role: "user",
    content: combined,
  });

  if (error) return { ok: false, error: error.message };

  const ai = await tryAppendOpenAiAssistantReply(supabase, userData.user.id, chatId, {
    lastUserVision: resolved.vision,
  });
  const assistantWarning =
    ai.status === "failed"
      ? `KI-Antwort konnte nicht gespeichert werden: ${ai.message}`
      : undefined;

  revalidatePath("/sparring");
  revalidatePath(`/sparring/${chatId}`);
  return { ok: true, assistantWarning };
}

export async function setSparringChatAiModel(
  chatId: string,
  modelKeyRaw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = parseSparringAiModelKey(modelKeyRaw);
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("sparring_chats")
    .update({ ai_model: key })
    .eq("id", chatId)
    .eq("user_id", userData.user.id)
    .is("deleted_at", null);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/sparring");
  revalidatePath(`/sparring/${chatId}`);
  return { ok: true };
}

export async function loadSparringTaskDraftForMessage(messageId: string) {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false as const, error: "Nicht angemeldet." };
  return fetchSparringTaskDraftFromMessage(supabase, userData.user.id, messageId);
}

export async function loadSparringNotizPrefillForMessage(messageId: string) {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false as const, error: "Nicht angemeldet." };
  return fetchSparringNotizPrefillFromMessage(supabase, userData.user.id, messageId);
}

export async function closeSparringChat(
  chatId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("sparring_chats")
    .update({ is_open: false })
    .eq("id", chatId)
    .eq("user_id", userData.user.id)
    .is("deleted_at", null);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/sparring");
  revalidatePath(`/sparring/${chatId}`);
  return { ok: true };
}
