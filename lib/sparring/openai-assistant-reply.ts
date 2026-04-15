import type { SupabaseClient } from "@supabase/supabase-js";
import { describeOpenAiClientError } from "@/lib/ai/openai-error-message";
import { AI_MODELS, validateAiModel, type AiModelKey } from "@/lib/ai/config";
import { normalizeSparringAiModelFromDb } from "@/lib/sparring/sparring-ai-model";
import { tryRefreshSparringChatTitleIfEmpty } from "@/lib/sparring/openai-enrich";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const MAX_MESSAGES = 28;

const DEFAULT_SYSTEM: ChatCompletionMessageParam = {
  role: "system",
  content: [
    "Du bist eine strukturierte Denkpartnerin bzw. ein Denkpartner in Leif OS (KI-Bereich).",
    "Antworte auf Deutsch, knapp und klar, es sei denn, die Nutzernachricht ist in einer anderen Sprache.",
    "Hilf beim Ordnen von Gedanken, stelle Rückfragen, schlage nächste Schritte vor.",
    "Erwähne keine internen Systemnamen oder API-Details.",
    "Führe keine echten Aktionen in anderen Systemen aus (keine E-Mails versenden, keine Termine buchen).",
  ].join(" "),
};

function mapDbRole(r: string): "user" | "assistant" | "system" | null {
  if (r === "user" || r === "assistant" || r === "system") return r;
  return null;
}

function trimMessages(msgs: ChatCompletionMessageParam[]): ChatCompletionMessageParam[] {
  if (msgs.length <= MAX_MESSAGES) return msgs;
  const first = msgs[0];
  if (first?.role === "system") {
    const rest = msgs.slice(1);
    const tail = rest.slice(-(MAX_MESSAGES - 1));
    return [first, ...tail];
  }
  return msgs.slice(-MAX_MESSAGES);
}

export type OpenAiAssistantReplyResult =
  | { status: "skipped_no_key" }
  | { status: "replied" }
  | { status: "failed"; message: string };

/**
 * Liest den Verlauf, ruft OpenAI auf und speichert eine assistant-Nachricht.
 * Ohne OPENAI_API_KEY: sofort `skipped_no_key` (Nutzer-Nachricht bleibt unverändert).
 */
export type SparringLastUserVision = { base64: string; mime: string };

export async function tryAppendOpenAiAssistantReply(
  supabase: SupabaseClient,
  userId: string,
  chatId: string,
  options?: { lastUserVision?: SparringLastUserVision },
): Promise<OpenAiAssistantReplyResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return { status: "skipped_no_key" };

  const { data: chat, error: cErr } = await supabase
    .from("sparring_chats")
    .select("id, deleted_at, ai_model")
    .eq("id", chatId)
    .eq("user_id", userId)
    .maybeSingle();

  if (cErr || !chat || chat.deleted_at) {
    return { status: "failed", message: cErr?.message ?? "Chat nicht verfügbar." };
  }

  const modelKey: AiModelKey = normalizeSparringAiModelFromDb(
    (chat as { ai_model?: string }).ai_model,
  );
  const model = AI_MODELS[modelKey];
  const modelErr = validateAiModel(modelKey);
  if (modelErr) return { status: "failed", message: modelErr };

  const { data: rows, error: mErr } = await supabase
    .from("sparring_messages")
    .select("role, content")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (mErr) return { status: "failed", message: mErr.message };
  if (!rows?.length) return { status: "failed", message: "Kein Verlauf." };

  const history: ChatCompletionMessageParam[] = [];
  let hasSystem = false;
  for (const row of rows) {
    const role = mapDbRole(String(row.role));
    if (!role) continue;
    const content = String(row.content ?? "").trim();
    if (!content) continue;
    if (role === "system") hasSystem = true;
    history.push({ role, content });
  }

  if (history.length === 0) return { status: "failed", message: "Kein verwertbarer Verlauf." };

  const vision = options?.lastUserVision;
  if (vision) {
    const last = history[history.length - 1];
    if (last?.role === "user" && typeof last.content === "string") {
      const text = last.content;
      history[history.length - 1] = {
        role: "user",
        content: [
          { type: "text", text },
          {
            type: "image_url",
            image_url: { url: `data:${vision.mime};base64,${vision.base64}` },
          },
        ],
      };
    }
  }

  const messages = trimMessages(hasSystem ? history : [DEFAULT_SYSTEM, ...history]);

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: 2048,
      temperature: 0.7,
    });
    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      return { status: "failed", message: "Leere Modellantwort." };
    }

    const { error: insErr } = await supabase.from("sparring_messages").insert({
      chat_id: chatId,
      role: "assistant",
      content: text,
    });
    if (insErr) return { status: "failed", message: insErr.message };
    await tryRefreshSparringChatTitleIfEmpty(supabase, userId, chatId);
    return { status: "replied" };
  } catch (e) {
    return { status: "failed", message: describeOpenAiClientError(e) };
  }
}
