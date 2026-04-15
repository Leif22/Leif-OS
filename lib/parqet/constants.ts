export const PARQET_ISSUER_ORIGIN = "https://connect.parqet.com";

/** OAuth-AS-Metadaten (Parqet nutzt nicht openid-configuration). */
export const PARQET_OAUTH_METADATA_URL = new URL(
  "https://connect.parqet.com/.well-known/oauth-authorization-server",
);

export const PARQET_SCOPE_READ = "portfolio:read";

export const COOKIE_PARQET_OAUTH_STATE = "parqet_oauth_state";

export const COOKIE_PARQET_OAUTH_VERIFIER = "parqet_oauth_verifier";

export const PARQET_OAUTH_COOKIE_MAX_AGE = 600;
