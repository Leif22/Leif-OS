import {
  COOKIE_PARQET_OAUTH_STATE,
  COOKIE_PARQET_OAUTH_VERIFIER,
} from "@/lib/parqet/constants";
import { getParqetOAuthConfiguration } from "@/lib/parqet/configuration";
import { parqetOAuthResourceParams } from "@/lib/parqet/oauth-resource";
import { saveParqetTokens } from "@/lib/parqet/tokens";
import { createClient } from "@/lib/supabase/server";
import * as client from "openid-client";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();

  const clearPkceCookies = () => {
    cookieStore.delete(COOKIE_PARQET_OAUTH_STATE);
    cookieStore.delete(COOKIE_PARQET_OAUTH_VERIFIER);
  };

  const failRedirect = (message: string) => {
    clearPkceCookies();
    const dash = new URL("/dashboard", request.nextUrl.origin);
    dash.searchParams.set("parqet_error", message);
    return NextResponse.redirect(dash);
  };

  const err = request.nextUrl.searchParams.get("error");
  const errDesc = request.nextUrl.searchParams.get("error_description");
  if (err) {
    return failRedirect(errDesc ?? err);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    clearPkceCookies();
    const login = new URL("/login", request.nextUrl.origin);
    login.searchParams.set("next", "/api/parqet/connect");
    login.searchParams.set("parqet_oauth", "session");
    return NextResponse.redirect(login);
  }

  const stateCookie = cookieStore.get(COOKIE_PARQET_OAUTH_STATE)?.value;
  const verifier = cookieStore.get(COOKIE_PARQET_OAUTH_VERIFIER)?.value;
  clearPkceCookies();

  if (!stateCookie || !verifier) {
    return failRedirect(
      "OAuth-Session abgelaufen (Cookies). Bitte „Mit Parqet verbinden“ erneut starten.",
    );
  }

  try {
    const oauthConfig = await getParqetOAuthConfiguration();
    const tokens = await client.authorizationCodeGrant(
      oauthConfig,
      request,
      {
        pkceCodeVerifier: verifier,
        expectedState: stateCookie,
      },
      parqetOAuthResourceParams(),
    );
    await saveParqetTokens(supabase, user.id, tokens);
    const dash = new URL("/dashboard", request.nextUrl.origin);
    dash.searchParams.set("parqet_connected", "1");
    return NextResponse.redirect(dash);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Token-Austausch fehlgeschlagen";
    return failRedirect(msg);
  }
}
