import type { NextRequest } from "next/server";

/**
 * Muss exakt in der Azure-App unter „Redirect URIs“ eingetragen sein.
 * Optional: MICROSOFT_REDIRECT_URI; sonst {origin}/api/microsoft/callback
 */
export function getMicrosoftRedirectUri(request: NextRequest): string {
  const fromEnv = process.env.MICROSOFT_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv;
  const { origin } = request.nextUrl;
  return `${origin}/api/microsoft/callback`;
}
