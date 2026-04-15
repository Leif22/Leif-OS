import type { SupabaseClient } from "@supabase/supabase-js";
import { buildInboxSuggestion } from "@/lib/inbox/ai-suggestions";
import { sendTelegramChatMessage } from "@/lib/telegram/send-message";
import type { TelegramInboxAttachment } from "@/lib/telegram/attachment-types";

type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
};

type TelegramPhotoSize = {
  file_id: string;
  width: number;
  height: number;
  file_size?: number;
};

type TelegramMessage = {
  message_id: number;
  date: number;
  chat: { id: number; type: string };
  from?: TelegramUser;
  text?: string;
  caption?: string;
  document?: {
    file_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
  photo?: TelegramPhotoSize[];
  video?: { file_id: string; mime_type?: string; file_size?: number; file_name?: string };
  voice?: { file_id: string; mime_type?: string; file_size?: number; duration?: number };
  audio?: { file_id: string; mime_type?: string; file_size?: number; file_name?: string };
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
};

const TELEGRAM_SOURCE = "telegram" as const;

function messageFromUpdate(u: TelegramUpdate): TelegramMessage | null {
  return u.message ?? u.edited_message ?? null;
}

function sourceRef(chatId: number, messageId: number): string {
  return `${chatId}:${messageId}`;
}

function extractAttachment(msg: TelegramMessage): TelegramInboxAttachment | null {
  const d = msg.document;
  if (d?.file_id) {
    return {
      kind: "document",
      file_id: d.file_id,
      mime_type: d.mime_type ?? null,
      file_name: d.file_name ?? null,
      file_size: d.file_size ?? null,
    };
  }
  const v = msg.video;
  if (v?.file_id) {
    return {
      kind: "video",
      file_id: v.file_id,
      mime_type: v.mime_type ?? null,
      file_name: v.file_name ?? null,
      file_size: v.file_size ?? null,
    };
  }
  const photos = msg.photo;
  if (photos && photos.length > 0) {
    const best = photos.reduce((a, b) => (a.width * a.height >= b.width * b.height ? a : b));
    return {
      kind: "photo",
      file_id: best.file_id,
      width: best.width,
      height: best.height,
      file_size: best.file_size ?? null,
    };
  }
  const voice = msg.voice;
  if (voice?.file_id) {
    return {
      kind: "voice",
      file_id: voice.file_id,
      mime_type: voice.mime_type ?? null,
      file_size: voice.file_size ?? null,
    };
  }
  const audio = msg.audio;
  if (audio?.file_id) {
    return {
      kind: "audio",
      file_id: audio.file_id,
      mime_type: audio.mime_type ?? null,
      file_name: audio.file_name ?? null,
      file_size: audio.file_size ?? null,
    };
  }
  return null;
}

function fallbackLabelForAttachment(att: TelegramInboxAttachment): string {
  switch (att.kind) {
    case "document":
      return att.file_name?.trim() || "Datei aus Telegram";
    case "photo":
      return "Foto aus Telegram";
    case "video":
      return "Video aus Telegram";
    case "voice":
      return "Sprachnachricht aus Telegram";
    case "audio":
      return att.file_name?.trim() || "Audio aus Telegram";
    default:
      return "Anhang aus Telegram";
  }
}

async function peekValidLinkToken(
  admin: SupabaseClient,
  token: string,
): Promise<{ id: string; user_id: string } | null> {
  const now = new Date().toISOString();
  const { data: row, error: selErr } = await admin
    .from("telegram_link_tokens")
    .select("id, user_id, expires_at, consumed_at")
    .eq("token", token)
    .maybeSingle();

  if (selErr || !row || row.consumed_at != null) return null;
  if (row.expires_at < now) return null;
  return { id: row.id, user_id: row.user_id };
}

async function finalizeConsumeToken(admin: SupabaseClient, tokenRowId: string): Promise<void> {
  const now = new Date().toISOString();
  await admin
    .from("telegram_link_tokens")
    .update({ consumed_at: now })
    .eq("id", tokenRowId)
    .is("consumed_at", null);
}

async function linkTelegramUser(
  admin: SupabaseClient,
  userId: string,
  telegramUserId: number,
  telegramUsername: string | null,
): Promise<boolean> {
  const { data: existing } = await admin
    .from("telegram_account_links")
    .select("user_id")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();

  if (existing && existing.user_id !== userId) {
    return false;
  }

  const { error } = await admin.from("telegram_account_links").upsert(
    {
      user_id: userId,
      telegram_user_id: telegramUserId,
      telegram_username: telegramUsername,
      linked_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    if (error.code === "23505") return false;
    console.error("[telegram] link upsert", error.message);
    return false;
  }
  return true;
}

async function insertInboxFromTelegram(
  admin: SupabaseClient,
  userId: string,
  content: string,
  sourceRef: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const suggestion = await buildInboxSuggestion(admin, userId, content);
  const { error } = await admin.from("inbox_items").insert({
    user_id: userId,
    content,
    source: TELEGRAM_SOURCE,
    source_ref: sourceRef,
    status: "pending",
    ai_status: suggestion.status,
    ai_suggestion: suggestion.suggestion,
    ai_checked_at: suggestion.checkedAt,
    ai_error: suggestion.error,
    metadata,
  });

  if (error) {
    if (error.code === "23505") return;
    console.error("[telegram] inbox insert", error.message);
  }
}

/**
 * Verarbeitet ein Telegram-Update (Webhook-Body). Wirkt idempotent über `source_ref`.
 */
export async function processTelegramUpdate(admin: SupabaseClient, update: TelegramUpdate): Promise<void> {
  const msg = messageFromUpdate(update);
  if (!msg || msg.chat.type !== "private") return;

  const from = msg.from;
  if (!from) return;

  const telegramUserId = from.id;
  const telegramUsername = from.username ?? null;
  const plainText = typeof msg.text === "string" ? msg.text.trim() : "";
  const caption = typeof msg.caption === "string" ? msg.caption.trim() : "";

  if (plainText.startsWith("/start")) {
    const parts = plainText.split(/\s+/);
    let payload = parts.length >= 2 ? parts[1]!.trim() : "";
    try {
      payload = decodeURIComponent(payload);
    } catch {
      /* bleibt unverändert */
    }

    if (!payload) {
      await sendTelegramChatMessage(
        msg.chat.id,
        "Nur „/start“ reicht nicht: In Leif OS unter Einstellungen „Verknüpfungs-Code erzeugen“ klicken, dann den grünen Link „In Telegram öffnen“ — oder hier genau so senden:\n/start DEIN_LANGER_CODE",
      );
      return;
    }

    const tokenRow = await peekValidLinkToken(admin, payload);
    if (!tokenRow) {
      await sendTelegramChatMessage(
        msg.chat.id,
        "Dieser Verknüpfungs-Code ist ungültig oder abgelaufen (ca. 15 Min.). Bitte in Leif OS einen neuen Code erzeugen.",
      );
      return;
    }

    const linked = await linkTelegramUser(admin, tokenRow.user_id, telegramUserId, telegramUsername);
    if (linked) {
      await finalizeConsumeToken(admin, tokenRow.id);
      await sendTelegramChatMessage(
        msg.chat.id,
        "Mit Leif OS verbunden. Ab jetzt landen Nachrichten (Text und Anhänge) in deiner Inbox. Im Browser unter Inbox prüfen.",
      );
    } else {
      await sendTelegramChatMessage(
        msg.chat.id,
        "Verknüpfung nicht möglich (z. B. Telegram-Account schon anderem Nutzer zugeordnet). In Leif OS Hilfe prüfen oder Support.",
      );
    }
    return;
  }

  if (plainText.startsWith("/")) return;

  const att = extractAttachment(msg);
  if (!plainText && !caption && !att) return;

  const { data: link } = await admin
    .from("telegram_account_links")
    .select("user_id")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();

  if (!link) return;

  const ref = sourceRef(msg.chat.id, msg.message_id);
  const displayContent = plainText || caption || (att ? fallbackLabelForAttachment(att) : "");
  const metadata: Record<string, unknown> = {
    telegram: {
      update_id: update.update_id,
      message_id: msg.message_id,
      chat_id: msg.chat.id,
      date: msg.date,
      from_username: from.username ?? null,
      from_first_name: from.first_name ?? null,
      attachment: att,
    },
  };

  await insertInboxFromTelegram(admin, link.user_id, displayContent, ref, metadata);
}
