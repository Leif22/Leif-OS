import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAssistantMessageForUser } from "@/lib/sparring/assistant-message";
import {
  tryGenerateNoteDraftFromAssistantMessage,
  tryGenerateNoteDraftFromTranscript,
} from "@/lib/sparring/openai-enrich";
import { formatSparringTranscript, formatSparringTranscriptTail } from "@/lib/sparring/transcript";
import type { SparringMessageRow } from "@/lib/sparring/types";

export type SparringNotizPrefill = {
  chat_id: string;
  content: string;
};

export type SparringNotizPrefillResult =
  | { ok: true; prefill: SparringNotizPrefill }
  | { ok: false; error: string };

/** Notiz-Vorschlag aus einer einzelnen KI-Antwort. */
export async function fetchSparringNotizPrefillFromMessage(
  supabase: SupabaseClient,
  userId: string,
  messageId: string,
): Promise<SparringNotizPrefillResult> {
  const ctx = await fetchAssistantMessageForUser(supabase, userId, messageId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const ai = await tryGenerateNoteDraftFromAssistantMessage(ctx.content);
  if (ai?.content.trim()) {
    return { ok: true, prefill: { chat_id: ctx.chat_id, content: ai.content.trim() } };
  }

  return { ok: true, prefill: { chat_id: ctx.chat_id, content: ctx.content } };
}

export async function fetchSparringNotizPrefill(
  supabase: SupabaseClient,
  userId: string,
  chatId: string,
): Promise<SparringNotizPrefillResult> {
  const { data: chat, error: chatErr } = await supabase
    .from("sparring_chats")
    .select("id, deleted_at")
    .eq("id", chatId)
    .eq("user_id", userId)
    .maybeSingle();

  if (chatErr) return { ok: false, error: chatErr.message };
  if (!chat) return { ok: false, error: "Sparring nicht gefunden." };
  if (chat.deleted_at) return { ok: false, error: "Gelöschtes Sparring kann nicht übernommen werden." };

  const { data: msgRows, error: msgErr } = await supabase
    .from("sparring_messages")
    .select("id, chat_id, role, content, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (msgErr) return { ok: false, error: msgErr.message };

  const messages = (msgRows ?? []) as SparringMessageRow[];
  const visible = messages.filter((m) => m.role !== "system");
  const focusTranscript = formatSparringTranscriptTail(visible, { maxChars: 8000 });

  const ai = focusTranscript.trim() ? await tryGenerateNoteDraftFromTranscript(focusTranscript) : null;
  if (ai?.content.trim()) {
    return { ok: true, prefill: { chat_id: chatId, content: ai.content.trim() } };
  }

  const fallback = formatSparringTranscript(visible, { maxChars: 6000 });
  return { ok: true, prefill: { chat_id: chatId, content: fallback } };
}
