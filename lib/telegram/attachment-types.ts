/** Aus Telegram-Webhook-Metadaten (metadata.telegram.attachment) */
export type TelegramInboxAttachment =
  | {
      kind: "document";
      file_id: string;
      mime_type?: string | null;
      file_name?: string | null;
      file_size?: number | null;
    }
  | {
      kind: "photo";
      file_id: string;
      width?: number | null;
      height?: number | null;
      file_size?: number | null;
    }
  | {
      kind: "video" | "voice" | "audio";
      file_id: string;
      mime_type?: string | null;
      file_name?: string | null;
      file_size?: number | null;
    };

export function isTelegramInboxAttachment(v: unknown): v is TelegramInboxAttachment {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const k = o.kind;
  if (k === "document" || k === "photo" || k === "video" || k === "voice" || k === "audio") {
    return typeof o.file_id === "string" && o.file_id.length > 0;
  }
  return false;
}
