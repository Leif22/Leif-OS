import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_MODELS, validateAiModel } from "@/lib/ai/config";
import { describeOpenAiClientError } from "@/lib/ai/openai-error-message";
import type { InboxAiSuggestion } from "@/lib/inbox/types";

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function parseInboxAiSuggestion(input: unknown): InboxAiSuggestion | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const row = input as Record<string, unknown>;
  const tool = String(row.tool ?? "");
  if (tool !== "task" && tool !== "calendar" && tool !== "note") return null;
  const title = String(row.title ?? "").trim();
  if (!title) return null;
  const confidence = Number(row.confidence ?? 0);
  return {
    tool,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
    title,
    task: row.task && typeof row.task === "object" && !Array.isArray(row.task)
      ? (row.task as InboxAiSuggestion["task"])
      : undefined,
    calendar: row.calendar && typeof row.calendar === "object" && !Array.isArray(row.calendar)
      ? (row.calendar as InboxAiSuggestion["calendar"])
      : undefined,
    note: row.note && typeof row.note === "object" && !Array.isArray(row.note)
      ? (row.note as InboxAiSuggestion["note"])
      : undefined,
  };
}

function firstTitleFromContent(content: string): string {
  const line = content
    .split("\n")
    .map((entry) => entry.trim())
    .find(Boolean);
  const title = line ?? content.trim() ?? "Inbox";
  return title.slice(0, 120);
}

export function fallbackInboxSuggestion(content: string): InboxAiSuggestion {
  return {
    tool: "task",
    confidence: 0.25,
    title: firstTitleFromContent(content),
    task: {
      due_choice: "today",
      duration_minutes: 30,
      priority: "normal",
    },
  };
}

export async function classifyInboxContentWithAi(
  content: string,
  taskTypeHints: string[],
  userRulesText: string,
): Promise<InboxAiSuggestion | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const modelErr = validateAiModel("fast");
  if (modelErr) return null;
  const openai = new OpenAI({ apiKey });
  const system = [
    "Du klassifizierst Inbox-Notizen für ein persönliches Produktivitätssystem.",
    "Wähle das passendste Tool: task, calendar oder note.",
    "Antworte ausschließlich als JSON-Objekt mit Struktur:",
    "{tool, confidence, title, task?, calendar?, note?}.",
    "task-Felder: due_choice(today|tomorrow|date), due_date(YYYY-MM-DD|null), duration_minutes, priority(high|normal|low), description, task_type, document_id.",
    "calendar-Felder: start_local(YYYY-MM-DDTHH:mm), end_local(YYYY-MM-DDTHH:mm), is_all_day, date(YYYY-MM-DD|null), description, location, is_private.",
    "note-Felder: type, description, document_id.",
    "title ist immer kurz und konkret (max 120 Zeichen).",
    `Erlaubte task_type Hinweise: ${taskTypeHints.join(", ") || "keine Vorgabe"}.`,
    userRulesText.trim()
      ? `Benutzerregeln (hoch priorisiert, sofern nicht im Widerspruch zum Inhalt): ${userRulesText.trim()}`
      : "Keine benutzerdefinierten Regeln hinterlegt.",
    "Wenn unklar: tool=task, confidence<=0.45 und konservative Defaults.",
  ].join(" ");
  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODELS.fast,
      messages: [
        { role: "system", content: system },
        { role: "user", content: content.slice(0, 5000) },
      ],
      temperature: 0.2,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return null;
    const parsed = extractJsonObject(raw);
    if (!parsed) return null;
    return parseInboxAiSuggestion(parsed);
  } catch (error) {
    console.error("[inbox-ai] classify failed", describeOpenAiClientError(error));
    return null;
  }
}

export async function buildInboxSuggestion(
  supabase: SupabaseClient,
  userId: string,
  content: string,
): Promise<{ status: "ready" | "failed"; suggestion: InboxAiSuggestion | null; error: string | null; checkedAt: string }> {
  const checkedAt = new Date().toISOString();
  try {
    const [taskTypesRes, rulesRes] = await Promise.all([
      supabase
        .from("user_task_types")
        .select("key,label")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true }),
      supabase.from("user_inbox_ai_rules").select("rules_text").eq("user_id", userId).maybeSingle(),
    ]);
    const taskTypes = taskTypesRes.data;
    const userRulesText = String(rulesRes.data?.rules_text ?? "");
    const taskTypeHints = (taskTypes ?? []).map((r) => `${String(r.key)}:${String(r.label ?? "")}`);
    const suggestion =
      (await classifyInboxContentWithAi(content, taskTypeHints, userRulesText)) ?? fallbackInboxSuggestion(content);
    return { status: "ready", suggestion, error: null, checkedAt };
  } catch (error) {
    return {
      status: "failed",
      suggestion: fallbackInboxSuggestion(content),
      error: error instanceof Error ? error.message : "AI suggestion failed",
      checkedAt,
    };
  }
}
