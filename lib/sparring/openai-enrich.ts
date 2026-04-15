import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_MODELS, validateAiModel } from "@/lib/ai/config";
import { fetchSparringChatById, fetchSparringMessages } from "@/lib/sparring/fetch-sparring";
import type { ResultType } from "@/lib/results/types";
import { formatSparringTranscript } from "@/lib/sparring/transcript";
import OpenAI from "openai";

const TRANSCRIPT_USER_MAX = 14_000;

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function strField(o: Record<string, unknown>, key: string, max: number): string | null {
  const v = o[key];
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

async function fastJsonCompletion(
  system: string,
  userTranscript: string,
  maxTokens: number,
): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const modelErr = validateAiModel("fast");
  if (modelErr) return null;

  const openai = new OpenAI({ apiKey });
  const user = userTranscript.length > TRANSCRIPT_USER_MAX
    ? `${userTranscript.slice(0, TRANSCRIPT_USER_MAX)}\n\n… (gekürzt)`
    : userTranscript;

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODELS.fast,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.35,
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return null;
    return extractJsonObject(raw);
  } catch {
    return null;
  }
}

/** Prägnanter Chat-Titel (nur Text, keine Anführungszeichen als Dekoration). */
export async function tryGenerateSparringTitleFromTranscript(transcript: string): Promise<string | null> {
  const system = [
    "Du erstellst einen kurzen deutschen Gesprächstitel.",
    "Antworte ausschließlich mit gültigem JSON: {\"title\": string}.",
    "title: höchstens 60 Zeichen, sachlich, ohne Emoji, ohne führende Bindestriche.",
  ].join(" ");
  const o = await fastJsonCompletion(system, transcript, 120);
  if (!o) return null;
  const title = strField(o, "title", 120);
  return title ?? null;
}

export async function tryGenerateTaskDraftFromTranscript(
  transcript: string,
): Promise<{ title: string; description: string } | null> {
  const system = [
    "Du erstellst EINE konkrete Aufgabe für ein Aufgaben-Tool (nicht: Zusammenfassung des Gesprächs).",
    "Der folgende Text ist nur das ENDE eines Sparrings (letzte Nachrichten). Leite die Aufgabe vor allem aus der letzten Assistenten-Antwort ab; nutze ältere Zeilen nur, wenn sie dieselbe nächste Handlung stützen.",
    "Antworte ausschließlich mit gültigem JSON: {\"title\": string, \"description\": string}.",
    "title: handlungsorientiert, oft mit Verb (max. 100 Zeichen), z. B. „Einarbeitungsplan für … erstellen“ — nicht der Sammeltitel des Themas.",
    "description: KEINE Prosa-Zusammenfassung des Falls. Stattdessen genau EINE umsetzbare Aufgabe: kurzer Fließtext oder 2–6 Stichpunkte (wer/was/bis wann nur wenn aus dem Text erkennbar). Max. 1800 Zeichen. Kein „Sie“-Anschreiben, keine Meta-Sätze wie „Hier ist die Aufgabe“.",
  ].join(" ");
  const o = await fastJsonCompletion(system, transcript, 900);
  if (!o) return null;
  const title = strField(o, "title", 160);
  const description = strField(o, "description", 2000);
  if (!title || !description) return null;
  return { title, description };
}

export async function tryGenerateGedaechtnisDraftFromTranscript(
  transcript: string,
): Promise<{ title: string; content: string } | null> {
  const system = [
    "Du erstellst einen Eintrag fürs persönliche Gedächtnis (Erkenntnis oder Entscheidung).",
    "Der Text ist nur das ENDE eines Sparrings (letzte Nachrichten). Fokus auf die letzte inhaltliche Wendung, nicht auf eine Chronik des ganzen Chats.",
    "Antworte ausschließlich mit gültigem JSON: {\"title\": string, \"content\": string}.",
    "title: prägnant, deutsch, max. 120 Zeichen.",
    "content: knapp strukturiert (Fließtext oder Stichpunkte), deutsch, max. 4000 Zeichen, ohne HTML, keine Wiederholung langer Chat-Zitate.",
  ].join(" ");
  const o = await fastJsonCompletion(system, transcript, 1200);
  if (!o) return null;
  const title = strField(o, "title", 160);
  const content = strField(o, "content", 4000);
  if (!title || !content) return null;
  return { title, content };
}

/** Notiz-Text aus dem fokussierten Sparring-Ende (kein Gesprächsprotokoll). */
export async function tryGenerateNoteDraftFromTranscript(
  transcript: string,
): Promise<{ content: string } | null> {
  const system = [
    "Du schlägst den Inhalt für eine persönliche Notiz vor (kein offizielles Schreiben, kein Chat-Protokoll).",
    "Der Text ist nur das ENDE eines Sparrings (letzte Nachrichten). Halte fest, was sich aus der LETZTEN Wendung ergibt: Gedanken, offene Punkte, nächste Schritte.",
    "Antworte ausschließlich mit gültigem JSON: {\"content\": string}.",
    "content: deutsch, max. 4000 Zeichen, Stichpunkte oder kurzer Fließtext erlaubt, keine Meta-Kommentare.",
  ].join(" ");
  const o = await fastJsonCompletion(system, transcript, 1000);
  if (!o) return null;
  const content = strField(o, "content", 4000);
  if (!content) return null;
  return { content };
}

function wrapSingleAssistantReply(assistantText: string): string {
  return [
    "Es folgt ausschließlich eine einzelne KI-Antwort. Es gibt keinen weiteren Chat-Kontext — leite alles nur aus diesem Text ab.",
    "",
    "---",
    assistantText.trim(),
    "---",
  ].join("\n");
}

/** Task aus genau einer KI-Antwort (kein Verlauf). */
export async function tryGenerateTaskDraftFromAssistantMessage(
  assistantText: string,
): Promise<{ title: string; description: string } | null> {
  const system = [
    "Du erstellst EINE konkrete, umsetzbare Aufgabe aus genau einer KI-Antwort (kein Gesprächsprotokoll).",
    "Antworte ausschließlich mit gültigem JSON: {\"title\": string, \"description\": string}.",
    "title: handlungsorientiert, max. 100 Zeichen.",
    "description: eine Aufgabe in Stichpunkten oder kurzem Absatz, max. 1500 Zeichen, keine Zusammenfassung des Themas in Prosa.",
  ].join(" ");
  const o = await fastJsonCompletion(system, wrapSingleAssistantReply(assistantText), 700);
  if (!o) return null;
  const title = strField(o, "title", 160);
  const description = strField(o, "description", 1600);
  if (!title || !description) return null;
  return { title, description };
}

/** Notiz aus genau einer KI-Antwort. */
export async function tryGenerateNoteDraftFromAssistantMessage(
  assistantText: string,
): Promise<{ content: string } | null> {
  const system = [
    "Du schlägst Notiz-Text aus genau einer KI-Antwort vor (persönlicher Merker, kein offizielles Schreiben).",
    "Antworte ausschließlich mit gültigem JSON: {\"content\": string}.",
    "content: deutsch, max. 3500 Zeichen.",
  ].join(" ");
  const o = await fastJsonCompletion(system, wrapSingleAssistantReply(assistantText), 900);
  if (!o) return null;
  const content = strField(o, "content", 3500);
  if (!content) return null;
  return { content };
}

export type MemoryCandidateExtract = {
  title: string;
  content: string;
  type: ResultType;
};

/** Vollständiger Chat: mehrere gedächtniswürdige Fakten/Erkenntnisse/Entscheidungen. */
export async function tryExtractMemoryCandidatesFromFullTranscript(
  fullTranscript: string,
): Promise<MemoryCandidateExtract[]> {
  const system = [
    "Du analysierst einen vollständigen Sparring-/Chat-Verlauf (Nutzer + Assistent).",
    "Finde getrennte, gedächtniswürdige Punkte: Erkenntnisse, Entscheidungen, feste Vereinbarungen, wichtige Fakten.",
    "Antworte ausschließlich mit gültigem JSON: {\"items\": array}.",
    "Jedes Element von items: {\"title\": string, \"content\": string, \"type\": \"insight\" | \"decision\"}.",
    "title: kurz, max. 120 Zeichen. content: prägnant, max. 1500 Zeichen.",
    "type insight = Erkenntnis/Lernpunkt; decision = getroffene oder empfohlene Entscheidung.",
    "Höchstens 12 Einträge; keine Duplikate; keine banalen Höflichkeitsfloskeln.",
  ].join(" ");
  const o = await fastJsonCompletion(system, fullTranscript.slice(0, TRANSCRIPT_USER_MAX), 2500);
  if (!o) return [];
  const items = o.items;
  if (!Array.isArray(items)) return [];
  const out: MemoryCandidateExtract[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const title = strField(row, "title", 160);
    const content = strField(row, "content", 1600) ?? "";
    const typeRaw = String(row.type ?? "insight").toLowerCase();
    const type: ResultType = typeRaw === "decision" ? "decision" : "insight";
    if (title) out.push({ title, content, type });
  }
  return out.slice(0, 12);
}

/** Setzt einen generierten Titel, wenn `title` noch leer ist (z. B. nach erster KI-Antwort). */
export async function tryRefreshSparringChatTitleIfEmpty(
  supabase: SupabaseClient,
  userId: string,
  chatId: string,
): Promise<void> {
  const { chat, error } = await fetchSparringChatById(supabase, userId, chatId);
  if (error || !chat || chat.deleted_at) return;
  if (String(chat.title ?? "").trim()) return;

  const { messages, error: mErr } = await fetchSparringMessages(supabase, userId, chatId);
  if (mErr || messages.length === 0) return;

  const transcript = formatSparringTranscript(messages);
  if (!transcript.trim()) return;

  const title = await tryGenerateSparringTitleFromTranscript(transcript);
  const next = title?.trim();
  if (!next) return;

  await supabase.from("sparring_chats").update({ title: next }).eq("id", chatId).eq("user_id", userId);
}
