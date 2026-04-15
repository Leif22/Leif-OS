import type { AiModelKey } from "@/lib/ai/config";

export type SparringChatType = "free" | "context" | "project";

export type SparringChatRow = {
  id: string;
  user_id: string;
  title: string;
  type: SparringChatType;
  /** OpenAI-Rolle: `default` / `fast` → `AI_MODELS` in `lib/ai/config`. */
  ai_model: AiModelKey;
  area_id: string | null;
  context_task_id: string | null;
  context_inbox_item_id: string | null;
  is_open: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SparringMessageRole = "user" | "assistant" | "system";

export type SparringMessageRow = {
  id: string;
  chat_id: string;
  role: SparringMessageRole;
  content: string;
  created_at: string;
};
