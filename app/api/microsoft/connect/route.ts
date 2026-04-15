import {
  COOKIE_MICROSOFT_OAUTH_STATE,
  COOKIE_MICROSOFT_OAUTH_VERIFIER,
  MICROSOFT_GRAPH_SCOPE,
  MICROSOFT_OAUTH_COOKIE_MAX_AGE,
} from "@/lib/microsoft/constants";
import { getMicrosoftOAuthConfiguration } from "@/lib/microsoft/configuration";
import { getMicrosoftRedirectUri } from "@/lib/microsoft/redirect-uri";
import { createClient } from "@/lib/supabase/server";
import * as client from "openid-client";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL("/login", request.nextUrl.origin);
    login.searchParams.set("next", "/api/microsoft/connect");
    return NextResponse.redirect(login);
  }

  try {
    const oauthConfig = await getMicrosoftOAuthConfiguration();
    const redirectUri = getMicrosoftRedirectUri(request);
    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const state = client.randomState();

    const cookieStore = await cookies();
    const cookieOpts = {
      httpOnly: true as const,
      path: "/" as const,
      sameSite: "lax" as const,
      maxAge: MICROSOFT_OAUTH_COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    };
    cookieStore.set(COOKIE_MICROSOFT_OAUTH_STATE, state, cookieOpts);
    cookieStore.set(COOKIE_MICROSOFT_OAUTH_VERIFIER, codeVerifier, cookieOpts);

    const url = client.buildAuthorizationUrl(oauthConfig, {
      redirect_uri: redirectUri,
      scope: MICROSOFT_GRAPH_SCOPE,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
    });

    return NextResponse.redirect(url.toString());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Outlook-Anmeldung konnte nicht gestartet werden.";
    const cal = new URL("/kalender", request.nextUrl.origin);
    cal.searchParams.set("outlook_error", msg);
    return NextResponse.redirect(cal);
  }
}
