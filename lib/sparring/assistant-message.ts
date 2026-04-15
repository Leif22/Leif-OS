import type { SupabaseClient } from "@supabase/supabase-js";

export type AssistantMessageContext =
  | { ok: true; chat_id: string; content: string }
  | { ok: false; error: string };

/** Lädt eine Assistenten-Nachricht, wenn Chat dem Nutzer gehört und nicht gelöscht. */
export async function fetchAssistantMessageForUser(
  supabase: SupabaseClient,
  userId: string,
  messageId: string,
): Promise<AssistantMessageContext> {
  const { data: msg, error } = await supabase
    .from("sparring_messages")
    .select("id, chat_id, role, content")
    .eq("id", messageId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!msg || msg.role !== "assistant") {
    return { ok: false, error: "Keine KI-Antwort mit dieser ID." };
  }

  const { data: chat, error: cErr } = await supabase
    .from("sparring_chats")
    .select("id, deleted_at")
    .eq("id", msg.chat_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (cErr) return { ok: false, error: cErr.message };
  if (!chat || chat.deleted_at) {
    return { ok: false, error: "Sparring nicht verfügbar." };
  }

  const content = String((msg as { content: string }).content ?? "").trim();
  if (!content) return { ok: false, error: "Leere KI-Antwort." };

  return { ok: true, chat_id: String(msg.chat_id), content };
}
