import * as client from "openid-client";
import { PARQET_OAUTH_METADATA_URL } from "./constants";

let cached: client.Configuration | null = null;
let cachedForClientId: string | null = null;

/**
 * Parqet Connect: Metadaten-URL direkt nutzen (kein OpenID
 * `/.well-known/openid-configuration` — dort liefert Parqet 404).
 * allowInsecureRequests: nötig, wenn redirect_uri http (localhost) ist.
 */
export async function getParqetOAuthConfiguration(): Promise<client.Configuration> {
  const clientId = process.env.PARQET_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("PARQET_CLIENT_ID ist nicht gesetzt.");
  }
  if (cached && cachedForClientId === clientId) {
    return cached;
  }

  const config = await client.discovery(
    PARQET_OAUTH_METADATA_URL,
    clientId,
    undefined,
    client.None(),
  );

  const allowHttpRedirect =
    process.env.NODE_ENV !== "production" ||
    process.env.PARQET_OAUTH_ALLOW_HTTP_REDIRECT === "1";
  if (allowHttpRedirect) {
    client.allowInsecureRequests(config);
  }

  cached = config;
  cachedForClientId = clientId;
  return config;
}
