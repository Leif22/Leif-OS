import * as client from "openid-client";

const ISSUER = new URL("https://login.microsoftonline.com/common/v2.0");

let cached: client.Configuration | null = null;
let cacheKey: string | null = null;

/**
 * Web-App-Registrierungen in Azure erwarten oft ein Client Secret am Token-Endpunkt.
 * Optional: `MICROSOFT_CLIENT_SECRET` in `.env.local` (Wert aus Zertifikate & Geheimnisse).
 * Alternativ: Umleitungs-URI unter Plattform **Single-Page application** anlegen und PKCE ohne Secret nutzen.
 */
export async function getMicrosoftOAuthConfiguration(): Promise<client.Configuration> {
  const clientId = process.env.MICROSOFT_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error(
      "MICROSOFT_CLIENT_ID fehlt. Lege die Anwendungs-ID (Azure App Registration) in den Umgebungsvariablen an.",
    );
  }
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET?.trim() ?? "";
  const key = `${clientId}\0${clientSecret ? "1" : "0"}`;
  if (cached && cacheKey === key) return cached;

  cached = await client.discovery(
    ISSUER,
    clientId,
    undefined,
    clientSecret ? client.ClientSecretPost(clientSecret) : undefined,
  );
  cacheKey = key;
  return cached;
}
