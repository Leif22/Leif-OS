import type { SupabaseClient } from "@supabase/supabase-js";
import type { SparringListView } from "./list-view";
import { normalizeSparringAiModelFromDb } from "@/lib/sparring/sparring-ai-model";
import type { SparringChatRow, SparringMessageRow } from "./types";

export async function fetchSparringChats(
  supabase: SupabaseClient,
  userId: string,
  view: SparringListView,
): Promise<{ chats: SparringChatRow[]; error: string | null }> {
  let q = supabase.from("sparring_chats").select("*").eq("user_id", userId);

  switch (view) {
    case "offen":
      q = q.eq("is_open", true).is("deleted_at", null);
      break;
    case "alle_aktiven":
      q = q.is("deleted_at", null);
      break;
    case "geloescht":
      q = q.not("deleted_at", "is", null);
      break;
    case "alle":
      break;
  }

  const { data, error } = await q.order("updated_at", { ascending: false });

  if (error) return { chats: [], error: error.message };
  const rows = (data ?? []) as SparringChatRow[];
  const normalized = rows.map((r) => ({
    ...r,
    ai_model: normalizeSparringAiModelFromDb((r as { ai_model?: string }).ai_model),
    deleted_at: r.deleted_at ?? null,
  }));
  return { chats: normalized, error: null };
}

export async function fetchSparringChatById(
  supabase: SupabaseClient,
  userId: string,
  chatId: string,
): Promise<{ chat: SparringChatRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("sparring_chats")
    .select("*")
    .eq("id", chatId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { chat: null, error: error.message };
  if (!data) return { chat: null, error: null };
  const row = data as SparringChatRow;
  return {
    chat: {
      ...row,
      ai_model: normalizeSparringAiModelFromDb((row as { ai_model?: string }).ai_model),
      deleted_at: row.deleted_at ?? null,
    },
    error: null,
  };
}

export async function fetchSparringMessages(
  supabase: SupabaseClient,
  userId: string,
  chatId: string,
): Promise<{ messages: SparringMessageRow[]; error: string | null }> {
  const { data: chat } = await supabase
    .from("sparring_chats")
    .select("id")
    .eq("id", chatId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!chat) return { messages: [], error: "Chat nicht gefunden." };

  const { data, error } = await supabase
    .from("sparring_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) return { messages: [], error: error.message };
  const rows = (data ?? []) as SparringMessageRow[];
  const visible = rows.filter((m) => m.role !== "system");
  return { messages: visible, error: null };
}
