import {
  COOKIE_MICROSOFT_OAUTH_STATE,
  COOKIE_MICROSOFT_OAUTH_VERIFIER,
} from "@/lib/microsoft/constants";
import { getMicrosoftOAuthConfiguration } from "@/lib/microsoft/configuration";
import { formatMicrosoftOAuthCallbackError } from "@/lib/microsoft/oauth-error";
import { saveMicrosoftTokens } from "@/lib/microsoft/tokens";
import { createClient } from "@/lib/supabase/server";
import * as client from "openid-client";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();

  const clearPkceCookies = () => {
    cookieStore.delete(COOKIE_MICROSOFT_OAUTH_STATE);
    cookieStore.delete(COOKIE_MICROSOFT_OAUTH_VERIFIER);
  };

  const failRedirect = (message: string) => {
    clearPkceCookies();
    const cal = new URL("/kalender", request.nextUrl.origin);
    cal.searchParams.set("outlook_error", message);
    return NextResponse.redirect(cal);
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
    login.searchParams.set("next", "/api/microsoft/connect");
    login.searchParams.set("outlook_oauth", "session");
    return NextResponse.redirect(login);
  }

  const stateCookie = cookieStore.get(COOKIE_MICROSOFT_OAUTH_STATE)?.value;
  const verifier = cookieStore.get(COOKIE_MICROSOFT_OAUTH_VERIFIER)?.value;
  clearPkceCookies();

  if (!stateCookie || !verifier) {
    return failRedirect(
      "Outlook-OAuth abgelaufen (Cookies). Bitte „Mit Outlook verbinden“ erneut starten.",
    );
  }

  try {
    const oauthConfig = await getMicrosoftOAuthConfiguration();
    const tokens = await client.authorizationCodeGrant(oauthConfig, request, {
      pkceCodeVerifier: verifier,
      expectedState: stateCookie,
    });
    await saveMicrosoftTokens(supabase, user.id, tokens);
    const cal = new URL("/kalender", request.nextUrl.origin);
    cal.searchParams.set("outlook_connected", "1");
    return NextResponse.redirect(cal);
  } catch (e) {
    return failRedirect(formatMicrosoftOAuthCallbackError(e));
  }
}
