/**
 * RFC 8707 Resource Indicator für Token-Endpoint und Authorize-URL.
 * Wenn Parqet die Daten-API unter anderem Host führt: z. B.
 * `PARQET_OAUTH_RESOURCE=https://api.parqet.com` setzen und Parqet **erneut verbinden**.
 */
export function parqetOAuthResource(): string | undefined {
  const r = process.env.PARQET_OAUTH_RESOURCE?.trim();
  return r || undefined;
}

export function parqetOAuthResourceParams(): Record<string, string> | undefined {
  const r = parqetOAuthResource();
  return r ? { resource: r } : undefined;
}
