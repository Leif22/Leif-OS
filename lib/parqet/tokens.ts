import type { SupabaseClient } from "@supabase/supabase-js";
import * as client from "openid-client";
import { getParqetOAuthConfiguration } from "./configuration";
import { parqetOAuthResourceParams } from "./oauth-resource";

const TOKEN_BUFFER_SEC = 90;

function expiresAtFromTokenResponse(
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
): string | null {
  const raw = tokens as { expires_in?: unknown };
  const sec =
    typeof raw.expires_in === "number" && Number.isFinite(raw.expires_in)
      ? raw.expires_in
      : null;
  if (sec == null) return null;
  return new Date(Date.now() + sec * 1000).toISOString();
}

export async function saveParqetTokens(
  supabase: SupabaseClient,
  userId: string,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
): Promise<void> {
  const expiresAt = expiresAtFromTokenResponse(tokens);
  let refreshToken: string | null =
    typeof tokens.refresh_token === "string" && tokens.refresh_token.length > 0
      ? tokens.refresh_token
      : null;
  if (!refreshToken) {
    const { data: prev } = await supabase
      .from("parqet_oauth_tokens")
      .select("refresh_token")
      .eq("user_id", userId)
      .maybeSingle();
    const p = prev as { refresh_token: string | null } | null;
    refreshToken = p?.refresh_token ?? null;
  }

  const { error } = await supabase.from("parqet_oauth_tokens").upsert(
    {
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    throw new Error(error.message);
  }
}

export async function getValidParqetAccessToken(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ accessToken: string } | { error: string }> {
  const { data: row, error } = await supabase
    .from("parqet_oauth_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }
  if (!row?.access_token) {
    return {
      error:
        "Parqet ist nicht verbunden. Öffne „Mit Parqet verbinden“ im Dashboard (eingeloggt).",
    };
  }

  const r = row as {
    access_token: string;
    refresh_token: string | null;
    expires_at: string | null;
  };

  const now = Date.now();
  const expMs = r.expires_at ? new Date(r.expires_at).getTime() : 0;
  const stillValid = expMs > now + TOKEN_BUFFER_SEC * 1000;
  if (stillValid) {
    return { accessToken: r.access_token };
  }

  if (!r.refresh_token) {
    return {
      error:
        "Parqet-Zugang ist abgelaufen. Bitte erneut unter „Mit Parqet verbinden“ autorisieren.",
    };
  }

  try {
    const config = await getParqetOAuthConfiguration();
    const refreshed = await client.refreshTokenGrant(
      config,
      r.refresh_token,
      parqetOAuthResourceParams(),
    );
    await saveParqetTokens(supabase, userId, refreshed);
    return { accessToken: refreshed.access_token };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Refresh fehlgeschlagen";
    return { error: `Parqet-Session ungültig: ${msg}` };
  }
}
