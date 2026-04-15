/** Sicherer Dateiname für Storage (ohne Pfad). */
export function sanitizeFilename(name: string, fallback: string): string {
  const base = name.split(/[/\\]/).pop()?.trim() ?? "";
  const cleaned = base
    .replace(/[^\w.\-\u00C0-\u024F ]+/gu, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || fallback;
}
