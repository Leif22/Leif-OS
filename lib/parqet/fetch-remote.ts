import * as client from "openid-client";
import { getParqetOAuthConfiguration } from "./configuration";
import { PARQET_ISSUER_ORIGIN } from "./constants";
import { parqetOAuthResource } from "./oauth-resource";
import {
  extractPositionsDeepSearch,
  parseParqetPortfoliosPayload,
  positionsFromPortfolioDetail,
} from "./parse-portfolios";

/**
 * Reihenfolge: zuerst Endpunkte, die typischerweise **Zeilen** liefern.
 * Nicht zuerst GET /portfolios/{id} — der liefert oft nur Metadaten (200),
 * dann würden /holdings & Co. nie abgefragt.
 */
export const PORTFOLIO_SUPPLEMENT_PATHS: ((id: string) => string)[] = [
  (id) => `/portfolios/${encodeURIComponent(id)}/holdings`,
  (id) => `/portfolios/${encodeURIComponent(id)}/positions`,
  (id) => `/portfolios/${encodeURIComponent(id)}/lines`,
  (id) => `/portfolios/${encodeURIComponent(id)}/ledger-lines`,
  (id) => `/portfolios/${encodeURIComponent(id)}/summary`,
  (id) => `/portfolios/${encodeURIComponent(id)}/details`,
  (id) => `/me/portfolios/${encodeURIComponent(id)}/holdings`,
  (id) => `/user/portfolios/${encodeURIComponent(id)}`,
  (id) => `/user/portfolios/${encodeURIComponent(id)}/holdings`,
  (id) => `/portfolios/${encodeURIComponent(id)}`,
];

/** Gleicher Host wie die Liste, oft mit eingebetteten Positionen per Query. */
const PORTFOLIO_SUPPLEMENT_QUERY_PATHS: ((id: string) => string)[] = [
  (id) => `/portfolios/${encodeURIComponent(id)}?include=holdings`,
  (id) => `/portfolios/${encodeURIComponent(id)}?include=positions`,
  (id) => `/portfolios/${encodeURIComponent(id)}?include=holdings,positions`,
  (id) => `/portfolios/${encodeURIComponent(id)}?embed=holdings`,
  (id) => `/portfolios/${encodeURIComponent(id)}?expand=holdings`,
  (id) => `/portfolios/${encodeURIComponent(id)}?full=true`,
];

const LIST_BASE_PATHS = ["/portfolios", "/me/portfolios", "/users/me/portfolios"];

/** REST-Daten (öffentliche Parqet-API); Connect-Token ist dort oft ungültig ohne `resource`. */
function parqetDataApiOrigin(): string {
  return process.env.PARQET_API_ORIGIN?.trim() || "https://api.parqet.com";
}

/** `api.parqet.com` nur anfragen, wenn explizit gewünscht oder OAuth-`resource` gesetzt (Token-Ziel). */
function shouldTryParqetDataApi(): boolean {
  if (process.env.PARQET_TRY_DATA_API === "1") return true;
  return Boolean(parqetOAuthResource());
}

export type ParqetSupplementAttempt = { origin: string; pathFn: (id: string) => string };

/** Slug-Varianten (`scalable_capital` vs `scalable-capital`) — Parqet-URLs sind unbekannt. */
function parqetBrokerIdVariants(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  const dash = t.replace(/_/g, "-");
  const under = t.replace(/-/g, "_");
  return [...new Set([t, dash, under])];
}

/** Zuerst broker-spezifische Connect-Pfade (Parqet-Liste liefert oft `distinctBrokers`). */
function parqetBrokerSupplementAttempts(brokerIds: string[]): ParqetSupplementAttempt[] {
  const connect = PARQET_ISSUER_ORIGIN;
  const out: ParqetSupplementAttempt[] = [];
  const seenVariant = new Set<string>();
  for (const raw of brokerIds) {
    for (const bid of parqetBrokerIdVariants(raw)) {
      if (seenVariant.has(bid)) continue;
      seenVariant.add(bid);
      out.push(
        {
          origin: connect,
          pathFn: (id) =>
            `/portfolios/${encodeURIComponent(id)}/brokers/${encodeURIComponent(bid)}/holdings`,
        },
        {
          origin: connect,
          pathFn: (id) =>
            `/portfolios/${encodeURIComponent(id)}/brokers/${encodeURIComponent(bid)}/positions`,
        },
        {
          origin: connect,
          pathFn: (id) =>
            `/portfolios/${encodeURIComponent(id)}/brokers/${encodeURIComponent(bid)}/lines`,
        },
        {
          origin: connect,
          pathFn: (id) =>
            `/v1/portfolios/${encodeURIComponent(id)}/brokers/${encodeURIComponent(bid)}/holdings`,
        },
        {
          origin: connect,
          pathFn: (id) =>
            `/v1/portfolios/${encodeURIComponent(id)}/brokers/${encodeURIComponent(bid)}/lines`,
        },
        {
          origin: connect,
          pathFn: (id) =>
            `/brokers/${encodeURIComponent(bid)}/portfolios/${encodeURIComponent(id)}/holdings`,
        },
        {
          origin: connect,
          pathFn: (id) =>
            `/brokers/${encodeURIComponent(bid)}/portfolios/${encodeURIComponent(id)}/lines`,
        },
        {
          origin: connect,
          pathFn: (id) =>
            `/portfolios/${encodeURIComponent(id)}/lines?broker=${encodeURIComponent(bid)}`,
        },
        {
          origin: connect,
          pathFn: (id) =>
            `/portfolios/${encodeURIComponent(id)}/holdings?broker=${encodeURIComponent(bid)}`,
        },
        {
          origin: connect,
          pathFn: (id) =>
            `/portfolios/${encodeURIComponent(id)}/positions?broker=${encodeURIComponent(bid)}`,
        },
      );
    }
  }
  return out;
}

/** Zuerst brokerbezogene Pfade, dann Connect (Query + Pfade), optional Daten-API. */
export function parqetSupplementAttempts(brokerIds: string[] = []): ParqetSupplementAttempt[] {
  const connect = PARQET_ISSUER_ORIGIN;
  const connectAttempts: ParqetSupplementAttempt[] = [
    ...parqetBrokerSupplementAttempts(brokerIds),
    ...PORTFOLIO_SUPPLEMENT_QUERY_PATHS.map((pathFn) => ({ origin: connect, pathFn })),
    ...PORTFOLIO_SUPPLEMENT_PATHS.map((pathFn) => ({ origin: connect, pathFn })),
  ];

  if (!shouldTryParqetDataApi()) {
    return connectAttempts;
  }

  const data = parqetDataApiOrigin();
  return [
    ...connectAttempts,
    { origin: data, pathFn: (id) => `/v1/portfolios/${encodeURIComponent(id)}` },
    { origin: data, pathFn: (id) => `/v1/portfolios/${encodeURIComponent(id)}/holdings` },
  ];
}

const PORTFOLIO_LIST_QUERY_TRIES = [
  "",
  "?include=holdings",
  "?include=positions",
  "?include=holdings,positions",
  "?embed=holdings",
  "?full=true",
];

/**
 * Zusätzlicher Abruf pro Portfolio, falls die Listen-API keine Positionszeilen liefert.
 * Probiert mehrere Pfade; bevorzugt die erste **200**-Antwort, aus der sich Positionen ableiten lassen.
 */
export type ParqetPortfolioSupplementOptions = {
  brokerIds?: string[];
};

export type ParqetPerformanceRequestOptions = {
  /** z. B. `max`, `1y`, `3m` — siehe Parqet Connect POST /performance. */
  interval?: { type: "relative"; value: string };
};

/**
 * Parqet Connect: Performance inkl. Positionszeilen; optional Zeitreihen im JSON (interval).
 */
export async function fetchParqetPerformanceHoldings(
  accessToken: string,
  portfolioIds: string[],
  options?: ParqetPerformanceRequestOptions,
): Promise<{ ok: true; json: unknown } | { ok: false; error: string }> {
  const ids = [...new Set(portfolioIds.map((x) => x.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return { ok: true, json: { holdings: [] } };
  }
  try {
    const config = await getParqetOAuthConfiguration();
    const url = new URL("/performance", PARQET_ISSUER_ORIGIN);
    const interval = options?.interval ?? { type: "relative", value: "max" };
    const body = JSON.stringify({
      portfolioIds: ids,
      interval,
    });
    const res = await client.fetchProtectedResource(
      config,
      accessToken,
      url,
      "POST",
      body,
      new Headers({ "Content-Type": "application/json" }),
    );
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `Parqet POST /performance HTTP ${res.status}: ${text.slice(0, 360)}`,
      };
    }
    try {
      return { ok: true, json: JSON.parse(text) as unknown };
    } catch {
      return { ok: false, error: "Parqet /performance: Antwort ist kein JSON." };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function fetchParqetPortfolioSupplementJson(
  accessToken: string,
  portfolioId: string,
  alternateIds: string[] = [],
  options?: ParqetPortfolioSupplementOptions,
): Promise<{ ok: true; json: unknown } | { ok: false }> {
  try {
    const config = await getParqetOAuthConfiguration();
    const attempts = parqetSupplementAttempts(options?.brokerIds ?? []);
    let lastOk: unknown = null;
    const seen = new Set<string>();
    const idChain = [portfolioId, ...alternateIds].filter((id) => {
      const t = id.trim();
      if (!t || seen.has(t)) return false;
      seen.add(t);
      return true;
    });
    for (const id of idChain) {
      for (const { origin, pathFn } of attempts) {
        const url = new URL(pathFn(id), origin);
        const res = await client.fetchProtectedResource(config, accessToken, url, "GET");
        if (!res.ok) continue;
        const text = await res.text();
        let json: unknown;
        try {
          json = JSON.parse(text) as unknown;
        } catch {
          continue;
        }
        lastOk = json;
        const parsedLen = positionsFromPortfolioDetail(portfolioId, json).length;
        const deepLen = extractPositionsDeepSearch(json).length;
        if (parsedLen > 0 || deepLen > 0) {
          return { ok: true, json };
        }
      }
    }
    if (lastOk !== null) {
      return { ok: true, json: lastOk };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

export async function fetchParqetPortfoliosJson(
  accessToken: string,
): Promise<{ ok: true; json: unknown } | { ok: false; error: string }> {
  try {
    const config = await getParqetOAuthConfiguration();

    async function getList(
      basePath: string,
      pathWithQuery: string,
    ): Promise<{ ok: true; json: unknown } | { ok: false; status: number; body: string }> {
      const url = new URL(`${basePath}${pathWithQuery}`, PARQET_ISSUER_ORIGIN);
      const res = await client.fetchProtectedResource(config, accessToken, url, "GET");
      const text = await res.text();
      if (!res.ok) {
        return { ok: false, status: res.status, body: text };
      }
      try {
        return { ok: true, json: JSON.parse(text) as unknown };
      } catch {
        return { ok: false, status: res.status, body: text };
      }
    }

    let best: { json: unknown; positions: number } | null = null;

    outer: for (const basePath of LIST_BASE_PATHS) {
      for (const q of PORTFOLIO_LIST_QUERY_TRIES) {
        const got = await getList(basePath, q);
        if (!got.ok) {
          if (basePath === "/portfolios" && q === "") {
            return {
              ok: false,
              error: `Parqet API HTTP ${got.status}: ${got.body.slice(0, 240)}`,
            };
          }
          continue;
        }
        const parsed = parseParqetPortfoliosPayload(got.json);
        const n = parsed.reduce((s, p) => s + p.positions.length, 0);
        if (!best || n > best.positions) {
          best = { json: got.json, positions: n };
        }
        if (n > 0) {
          break outer;
        }
      }
    }

    if (!best) {
      return { ok: false, error: "Parqet API: Antwort ist kein JSON." };
    }
    return { ok: true, json: best.json };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
