import type { SupabaseClient } from "@supabase/supabase-js";
import { PRODUCT_COPY } from "@/lib/product-labels";
import { fetchAssistantMessageForUser } from "@/lib/sparring/assistant-message";
import {
  tryGenerateTaskDraftFromAssistantMessage,
  tryGenerateTaskDraftFromTranscript,
} from "@/lib/sparring/openai-enrich";
import type { SparringMessageRow } from "./types";

import { formatSparringTranscript, formatSparringTranscriptTail } from "./transcript";
export { formatSparringTranscript };

export type SparringTaskDraft = {
  chat_id: string;
  title: string;
  description: string;
};

export type SparringTaskDraftResult =
  | { ok: true; draft: SparringTaskDraft }
  | { ok: false; error: string };

/** Task-Vorlage aus einer einzelnen KI-Antwort (Nachrichten-ID). */
export async function fetchSparringTaskDraftFromMessage(
  supabase: SupabaseClient,
  userId: string,
  messageId: string,
): Promise<SparringTaskDraftResult> {
  const ctx = await fetchAssistantMessageForUser(supabase, userId, messageId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const ai = await tryGenerateTaskDraftFromAssistantMessage(ctx.content);
  if (ai) {
    return {
      ok: true,
      draft: {
        chat_id: ctx.chat_id,
        title: ai.title,
        description: ai.description,
      },
    };
  }

  const title = PRODUCT_COPY.taskDraftTitleFromKi;
  const description = PRODUCT_COPY.taskDraftDescFromKi(ctx.content.slice(0, 8000));
  return {
    ok: true,
    draft: {
      chat_id: ctx.chat_id,
      title,
      description,
    },
  };
}

export async function fetchSparringTaskDraft(
  supabase: SupabaseClient,
  userId: string,
  chatId: string,
): Promise<SparringTaskDraftResult> {
  const { data: chat, error: chatErr } = await supabase
    .from("sparring_chats")
    .select("id, title, deleted_at")
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
  const transcript = formatSparringTranscript(visible);
  const focusTranscript = formatSparringTranscriptTail(visible, { maxChars: 8000 });

  const rawTitle = typeof chat.title === "string" ? chat.title.trim() : "";
  const aiDraft = focusTranscript.trim()
    ? await tryGenerateTaskDraftFromTranscript(focusTranscript)
    : null;

  if (aiDraft) {
    return {
      ok: true,
      draft: {
        chat_id: chatId,
        title: aiDraft.title,
        description: aiDraft.description,
      },
    };
  }

  const title = rawTitle || PRODUCT_COPY.taskDraftTitleFromKi;
  const description = transcript
    ? PRODUCT_COPY.taskDraftDescFromKi(transcript)
    : PRODUCT_COPY.taskDraftDescEmpty;

  return {
    ok: true,
    draft: {
      chat_id: chatId,
      title,
      description,
    },
  };
}
