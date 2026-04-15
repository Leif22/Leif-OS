import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiModelKey } from "@/lib/ai/config";

export function defaultSparringTitle(): string {
  const d = new Date();
  return `Sparring ${d.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}`;
}

/** Shared insert used by the server action and the Sparring list page (?new=1). */
export async function insertSparringChatRow(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  options?: { ai_model?: AiModelKey },
): Promise<{ id: string } | { error: string }> {
  const t = title.trim() || defaultSparringTitle();
  const ai_model: AiModelKey = options?.ai_model ?? "default";
  const { data, error } = await supabase
    .from("sparring_chats")
    .insert({
      user_id: userId,
      title: t,
      type: "free",
      ai_model,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: data.id as string };
}

/** Kontext-Sparring aus einem Inbox-Eintrag (type=context, erste Nutzernachricht). */
export async function insertSparringChatFromInbox(
  supabase: SupabaseClient,
  userId: string,
  params: { inboxItemId: string; title: string; firstUserMessage: string },
): Promise<{ id: string } | { error: string }> {
  const t = params.title.trim() || defaultSparringTitle();
  const msg = params.firstUserMessage.trim() || "(Kein Inhalt.)";

  const { data: chat, error: chatErr } = await supabase
    .from("sparring_chats")
    .insert({
      user_id: userId,
      title: t,
      type: "context",
      ai_model: "default",
      context_inbox_item_id: params.inboxItemId,
    })
    .select("id")
    .single();

  if (chatErr || !chat) {
    return { error: chatErr?.message ?? "Sparring konnte nicht angelegt werden." };
  }

  const { error: msgErr } = await supabase.from("sparring_messages").insert({
    chat_id: chat.id as string,
    role: "user",
    content: msg,
  });

  if (msgErr) {
    await supabase.from("sparring_chats").delete().eq("id", chat.id).eq("user_id", userId);
    return { error: msgErr.message };
  }

  return { id: chat.id as string };
}
