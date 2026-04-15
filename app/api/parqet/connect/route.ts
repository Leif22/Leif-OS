import {
  COOKIE_PARQET_OAUTH_STATE,
  COOKIE_PARQET_OAUTH_VERIFIER,
  PARQET_OAUTH_COOKIE_MAX_AGE,
  PARQET_SCOPE_READ,
} from "@/lib/parqet/constants";
import { getParqetOAuthConfiguration } from "@/lib/parqet/configuration";
import { parqetOAuthResourceParams } from "@/lib/parqet/oauth-resource";
import { getParqetRedirectUri } from "@/lib/parqet/redirect-uri";
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
    login.searchParams.set("next", "/api/parqet/connect");
    return NextResponse.redirect(login);
  }

  try {
    const oauthConfig = await getParqetOAuthConfiguration();
    const redirectUri = getParqetRedirectUri(request);
    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const state = client.randomState();

    const cookieStore = await cookies();
    const cookieOpts = {
      httpOnly: true as const,
      path: "/",
      sameSite: "lax" as const,
      maxAge: PARQET_OAUTH_COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    };
    cookieStore.set(COOKIE_PARQET_OAUTH_STATE, state, cookieOpts);
    cookieStore.set(COOKIE_PARQET_OAUTH_VERIFIER, codeVerifier, cookieOpts);

    const resource = parqetOAuthResourceParams();
    const url = client.buildAuthorizationUrl(oauthConfig, {
      redirect_uri: redirectUri,
      scope: PARQET_SCOPE_READ,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
      ...(resource ?? {}),
    });

    return NextResponse.redirect(url.toString());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OAuth-Start fehlgeschlagen";
    const dash = new URL("/dashboard", request.nextUrl.origin);
    dash.searchParams.set("parqet_error", msg);
    return NextResponse.redirect(dash);
  }
}
