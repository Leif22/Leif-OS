import type { SparringMessageRow } from "./types";

/** Letzte Nachrichten für KI-Übernahmen (Task, Notiz, Gedächtnis). */
export const SPARRING_AI_FOCUS_MAX_MESSAGES = 5;

/** Letzte `max` Nachrichten, Reihenfolge unverändert (älteste der Auswahl zuerst). */
export function tailSparringMessages(
  messages: SparringMessageRow[],
  max: number = SPARRING_AI_FOCUS_MAX_MESSAGES,
): SparringMessageRow[] {
  if (messages.length <= max) return messages;
  return messages.slice(-max);
}

/** Transkript nur aus dem fokussierten Ende des Verlaufs (für Tasks, Notiz, Gedächtnis). */
export function formatSparringTranscriptTail(
  messages: SparringMessageRow[],
  options?: { maxMessages?: number; maxChars?: number },
): string {
  const tailed = tailSparringMessages(messages, options?.maxMessages ?? SPARRING_AI_FOCUS_MAX_MESSAGES);
  return formatSparringTranscript(tailed, { maxChars: options?.maxChars ?? 8000 });
}

function roleLabel(role: string): string {
  if (role === "assistant") return "Assistent";
  return "Du";
}

/** Fließtext aus Nachrichten für Task-Beschreibung / Ergebnis / KI-Kontext. */
export function formatSparringTranscript(
  messages: SparringMessageRow[],
  options?: { maxChars?: number },
): string {
  const max = options?.maxChars ?? 12000;
  const lines: string[] = [];
  let len = 0;
  for (const m of messages) {
    const block = `${roleLabel(m.role)} (${m.created_at}):\n${m.content.trim()}\n`;
    if (len + block.length > max) {
      lines.push("… (gekürzt)");
      break;
    }
    lines.push(block);
    len += block.length;
  }
  return lines.join("\n").trim();
}
