import * as client from "openid-client";
import { NextResponse } from "next/server";
import { getParqetOAuthConfiguration } from "@/lib/parqet/configuration";
import { extractParqetPerformanceTotalSeries } from "@/lib/parqet/extract-performance-series";
import {
  fetchParqetPerformanceHoldings,
  fetchParqetPortfoliosJson,
  parqetSupplementAttempts,
} from "@/lib/parqet/fetch-remote";
import { parqetOAuthResource } from "@/lib/parqet/oauth-resource";
import {
  extractPositionsDeepSearch,
  parseParqetPortfoliosPayload,
  positionsFromPortfolioDetail,
} from "@/lib/parqet/parse-portfolios";
import { getValidParqetAccessToken } from "@/lib/parqet/tokens";
import { createClient } from "@/lib/supabase/server";

function topKeys(v: unknown): string[] {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return Object.keys(v as object).slice(0, 40);
  }
  return [];
}

function firstListItem(body: unknown): unknown {
  const o =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  if (!o) return null;
  for (const k of ["items", "data", "portfolios", "results"]) {
    const a = o[k];
    if (Array.isArray(a) && a[0]) return a[0];
  }
  return null;
}

/** Nur Struktur (Schlüssel, Array-Längen), keine Werte — zum Abgleich mit der Parqet-Doku. */
function outlineValue(v: unknown, depth: number): unknown {
  if (depth <= 0) return "…";
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) {
    if (v.length === 0) return { _array: 0 };
    const first = v[0];
    const ft = typeof first;
    if (ft === "object" && first !== null && !Array.isArray(first)) {
      return { _array: v.length, _first: outlineValue(first, depth - 1) };
    }
    return { _array: v.length, _firstType: ft };
  }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o).slice(0, 35);
    const out: Record<string, unknown> = {};
    for (const k of keys) {
      const x = o[k];
      if (Array.isArray(x)) {
        out[k] = { array: x.length };
      } else if (x && typeof x === "object") {
        out[k] = { object: Object.keys(x as object).slice(0, 28) };
      } else {
        out[k] = typeof x;
      }
    }
    return out;
  }
  return typeof v;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const tok = await getValidParqetAccessToken(supabase, user.id);
  if ("error" in tok) {
    return NextResponse.json({ error: tok.error }, { status: 400 });
  }

  const api = await fetchParqetPortfoliosJson(tok.accessToken);
  if (!api.ok) {
    return NextResponse.json({ error: api.error }, { status: 502 });
  }

  const parsed = parseParqetPortfoliosPayload(api.json);
  const firstId = parsed[0]?.parqet_portfolio_id ?? "";
  const config = await getParqetOAuthConfiguration();

  const supplements: Array<{
    origin: string;
    path: string;
    status: number;
    topKeys: string[];
    positionsFromDetail: number;
    deepSearchMatches: number;
  }> = [];

  const firstBrokers = parsed[0]?.broker_ids ?? [];

  if (firstId) {
    for (const { origin, pathFn } of parqetSupplementAttempts(firstBrokers)) {
      const path = pathFn(firstId);
      const url = new URL(path, origin);
      const res = await client.fetchProtectedResource(config, tok.accessToken, url, "GET");
      const text = await res.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        json = null;
      }
      supplements.push({
        origin,
        path,
        status: res.status,
        topKeys: json ? topKeys(json) : [],
        positionsFromDetail: json
          ? positionsFromPortfolioDetail(firstId, json).length
          : 0,
        deepSearchMatches: json ? extractPositionsDeepSearch(json).length : 0,
      });
    }
  }

  const resource = parqetOAuthResource();
  const dataApiTried =
    process.env.PARQET_TRY_DATA_API === "1" || Boolean(resource?.length);

  const firstRaw = firstListItem(api.json);
  const firstListItemTopKeys = firstRaw ? topKeys(firstRaw) : [];
  const firstListItemShape = firstRaw ? outlineValue(firstRaw, 4) : null;
  const firstRawRec =
    firstRaw && typeof firstRaw === "object" && !Array.isArray(firstRaw)
      ? (firstRaw as Record<string, unknown>)
      : null;
  const dbArr = firstRawRec?.distinctBrokers;
  const firstBrokerEl = Array.isArray(dbArr) ? dbArr[0] : undefined;
  const firstDistinctBrokerShape =
    firstBrokerEl != null
      ? typeof firstBrokerEl === "object" && !Array.isArray(firstBrokerEl)
        ? outlineValue(firstBrokerEl, 5)
        : { primitive: true, kind: typeof firstBrokerEl }
      : null;

  const perfIds = parsed.map((p) => p.parqet_portfolio_id).filter(Boolean);
  let postPerformance:
    | {
        ok: true;
        seriesPointCount: number;
        intervalTried: string;
        bodyOutline: unknown;
      }
    | { ok: false; error: string }
    | null = null;
  if (perfIds.length > 0) {
    const perfRes = await fetchParqetPerformanceHoldings(tok.accessToken, perfIds, {
      interval: { type: "relative", value: "max" },
    });
    if (perfRes.ok) {
      const series = extractParqetPerformanceTotalSeries(perfRes.json);
      postPerformance = {
        ok: true,
        seriesPointCount: series.length,
        intervalTried: "max",
        bodyOutline: outlineValue(perfRes.json, 5),
      };
    } else {
      postPerformance = { ok: false, error: perfRes.error };
    }
  }

  return NextResponse.json({
    meta: {
      oauthResourceConfigured: Boolean(resource),
      dataApiSupplementTried: dataApiTried,
      hint:
        "Connect-Token gilt oft nur für connect.parqet.com. Wenn api.parqet.com 401 liefert: optional " +
        "`PARQET_OAUTH_RESOURCE=https://api.parqet.com` in .env.local, Server neu starten, „Parqet erneut verbinden“. " +
        "Zum Testen der Daten-API ohne resource: `PARQET_TRY_DATA_API=1`. " +
        "`firstListItemShape` / `firstDistinctBrokerShape`: Struktur ohne Werte. " +
        "Mit `distinctBrokers` werden brokerbezogene Supplement-URLs mitprobiert (`brokerIdsFirstPortfolio`, inkl. Slug-Varianten). " +
        "Positionen: Sync nutzt **`POST /performance`** (developer.parqet.com/docs/api), nicht GET /holdings. " +
        "Die `supplements`-Liste zeigt nur ältere GET-Fallbacks. " +
        "`postPerformance.seriesPointCount`: Punkte aus POST /performance (primär OpenAPI-Feld `charts[].values.history`).",
    },
    postPerformance,
    firstPortfolioId: firstId || null,
    brokerIdsFirstPortfolio: firstBrokers,
    supplementIdsFirstPortfolio: parsed[0]?.supplement_ids ?? [],
    portfoliosParsed: parsed.length,
    positionsPerPortfolio: parsed.map((p) => ({
      id: p.parqet_portfolio_id,
      positions: p.positions.length,
    })),
    listResponseTopKeys: topKeys(api.json),
    firstListItemTopKeys,
    firstListItemShape,
    firstDistinctBrokerShape,
    supplements,
  });
}
