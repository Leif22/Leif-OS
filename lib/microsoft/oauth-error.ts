import { ResponseBodyError } from "openid-client";

/** Lesbare Meldung aus OAuth-Token-Fehlern (z. B. Microsoft `invalid_client`). */
export function formatMicrosoftOAuthCallbackError(error: unknown): string {
  if (error instanceof ResponseBodyError) {
    const desc = error.error_description?.trim();
    const code = error.error?.trim();
    if (code && desc) return `${code}: ${desc}`;
    if (desc) return desc;
    if (code) return code;
    const c = error.cause as { error?: string; error_description?: string } | undefined;
    if (c?.error_description) return `${c.error ?? "Fehler"}: ${c.error_description}`;
    if (c?.error) return c.error;
  }
  if (error instanceof Error) return error.message;
  return "Outlook-Token-Austausch fehlgeschlagen.";
}
