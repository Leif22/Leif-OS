import type { AiModelKey } from "@/lib/ai/config";

/** Formular- / URL-Wert → gültige Modellrolle. */
export function parseSparringAiModelKey(raw: unknown): AiModelKey {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "fast") return "fast";
  return "default";
}

/** DB-Wert (auch ältere/fehlende Spalten) → Modellrolle. */
export function normalizeSparringAiModelFromDb(raw: string | null | undefined): AiModelKey {
  if (raw === "fast") return "fast";
  return "default";
}
