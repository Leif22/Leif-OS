const storageKey = (chatId: string) => `sparring_assistant_warning:${chatId}`;

/** Client-only: vor Navigation aus „Neues Sparring“ eine KI-Warnung für die Zielseite merken. */
export function stashPendingAssistantWarning(chatId: string, message: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(chatId), message);
  } catch {
    /* quota / private mode */
  }
}

/** Client-only: einmalig lesen und entfernen (z. B. in SparringChatClient mount). */
export function takePendingAssistantWarning(chatId: string): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const k = storageKey(chatId);
    const v = sessionStorage.getItem(k);
    if (v) sessionStorage.removeItem(k);
    return v;
  } catch {
    return null;
  }
}
