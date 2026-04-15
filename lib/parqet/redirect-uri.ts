import type { NextRequest } from "next/server";

/**
 * Muss exakt mit der Redirect-URI im Parqet Developer Hub übereinstimmen.
 * Optional: PARQET_REDIRECT_URI setzen; sonst {origin}/api/parqet/callback vom Request.
 */
export function getParqetRedirectUri(request: NextRequest): string {
  const fromEnv = process.env.PARQET_REDIRECT_URI?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  const { origin } = request.nextUrl;
  return `${origin}/api/parqet/callback`;
}
