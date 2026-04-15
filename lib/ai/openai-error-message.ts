/**
 * Verständliche deutsche Kurzfassung für typische OpenAI-SDK-Fehler (UI-Banner).
 */
export function describeOpenAiClientError(error: unknown): string {
  const raw = (error instanceof Error ? error.message : String(error)).trim();
  if (!raw) return "OpenAI-Anfrage fehlgeschlagen.";
  if (
    /\b401\b/.test(raw) ||
    /insufficient permissions/i.test(raw) ||
    /missing scopes/i.test(raw)
  ) {
    return (
      "OpenAI hat die Anfrage abgelehnt: Der API-Schlüssel darf keine Chat-Anfragen ausführen (fehlender Umfang „model.request“ / Completions). " +
      "Unter https://platform.openai.com/api-keys einen Standard-Schlüssel verwenden oder bei einem eingeschränkten Schlüssel die Berechtigung für Modellanfragen aktivieren."
    );
  }
  if (/\b429\b/.test(raw) || /rate limit/i.test(raw)) {
    return "OpenAI: Zu viele Anfragen oder Kontingent erschöpft. Bitte kurz warten oder Nutzungslimits prüfen.";
  }
  if (/\b403\b/.test(raw) || /not allowed/i.test(raw)) {
    return "OpenAI: Zugriff verweigert. Organisation, Projektrolle oder regional verfügbare Modelle prüfen.";
  }
  return raw;
}
