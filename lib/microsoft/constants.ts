/**
 * Delegierte Microsoft-Graph-Berechtigungen (OAuth-Scope).
 * Nur Kalender (Sync, Termine, Geburtstags-Serien) — kein Mail-API-Zugriff.
 * Nach Umstellung: Outlook unter Kalender ggf. einmal trennen und neu verbinden.
 */
export const MICROSOFT_GRAPH_SCOPE =
  "openid profile offline_access https://graph.microsoft.com/Calendars.ReadWrite";

export const COOKIE_MICROSOFT_OAUTH_STATE = "microsoft_oauth_state";

export const COOKIE_MICROSOFT_OAUTH_VERIFIER = "microsoft_oauth_verifier";

export const MICROSOFT_OAUTH_COOKIE_MAX_AGE = 600;
