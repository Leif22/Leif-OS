/**
 * Zentrale OpenAI-Modell-IDs: nur hier Defaults + Einlesen aus `process.env`.
 * In `.env.local`: `OPENAI_MODEL_DEFAULT`, `OPENAI_MODEL_FAST`.
 */

function envModel(name: string): string | undefined {
  const raw = process.env[name];
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  return t.length > 0 ? t : undefined;
}

/** Nur in dieser Datei — produktiver Code importiert `AI_MODELS`. */
const FALLBACK_DEFAULT = "gpt-4o";
const FALLBACK_FAST = "gpt-4o-mini";

function resolveDefault(): string {
  return (
    envModel("OPENAI_MODEL_DEFAULT") ??
    envModel("OPENAI_MODEL") /* @deprecated — bitte OPENAI_MODEL_DEFAULT nutzen */ ??
    FALLBACK_DEFAULT
  );
}

function resolveFast(): string {
  return envModel("OPENAI_MODEL_FAST") ?? FALLBACK_FAST;
}

export const AI_MODELS = Object.freeze({
  /** Standard-Chat / KI-Workspace (z. B. Sparring). */
  default: resolveDefault(),
  /** Schnelle Klassifizierung / einfache Vorverarbeitung — vor API: `validateAiModel("fast")`. */
  fast: resolveFast(),
});

export type AiModelKey = keyof typeof AI_MODELS;

const MODEL_ID_MAX_LEN = 128;
/** OpenAI-kompatible Modell-IDs: alphanumerisch plus `._:-` (z. B. Fine-Tunes mit `:`). */
const MODEL_ID_PATTERN = /^[a-zA-Z0-9._:\-]+$/;

/** Kurzbezeichnung für Fehlermeldungen: welche Umgebungsvariable den Default-Chat steuert. */
export function describeDefaultOpenAiModelSource(): string {
  if (envModel("OPENAI_MODEL_DEFAULT")) return "OPENAI_MODEL_DEFAULT";
  if (envModel("OPENAI_MODEL")) return "OPENAI_MODEL (veraltet; bitte OPENAI_MODEL_DEFAULT nutzen)";
  return "OPENAI_MODEL_DEFAULT (interner Standard, kein Eintrag in .env.local)";
}

/** Kurzbezeichnung für Fehlermeldungen: welche Umgebungsvariable das schnelle Modell steuert. */
export function describeFastOpenAiModelSource(): string {
  if (envModel("OPENAI_MODEL_FAST")) return "OPENAI_MODEL_FAST";
  return "OPENAI_MODEL_FAST (interner Standard, kein Eintrag in .env.local)";
}

/**
 * Prüft eine bereits aufgelöste Modell-ID vor API-Aufrufen.
 *
 * @returns `null` wenn nutzbar, sonst eine kurze deutsche Fehlermeldung.
 */
export function validateOpenAiModelId(
  modelId: string,
  envVariableLabel: string,
): string | null {
  const id = modelId.trim();
  if (!id) {
    return `Kein gültiges OpenAI-Modell: ${envVariableLabel} ist leer oder nur Leerzeichen. Bitte in .env.local setzen.`;
  }
  if (id.length > MODEL_ID_MAX_LEN) {
    return `Modellname zu lang (${envVariableLabel}): maximal ${MODEL_ID_MAX_LEN} Zeichen.`;
  }
  if (!MODEL_ID_PATTERN.test(id)) {
    return `Ungültiger Modellname für ${envVariableLabel}: nur Buchstaben, Ziffern und die Zeichen ._:- (keine Leerzeichen).`;
  }
  return null;
}

/**
 * Validiert `AI_MODELS[role]` mit passender Quellen-Beschriftung.
 * Vor Aufrufen mit `AI_MODELS.fast` z. B. `validateAiModel("fast")` nutzen.
 */
export function validateAiModel(role: AiModelKey): string | null {
  const label =
    role === "default" ? describeDefaultOpenAiModelSource() : describeFastOpenAiModelSource();
  return validateOpenAiModelId(AI_MODELS[role], label);
}
