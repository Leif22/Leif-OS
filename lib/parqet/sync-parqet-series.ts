import type { SupabaseClient } from "@supabase/supabase-js";
import {
  extractParqetPerformanceTotalSeries,
  type ParqetSeriesPoint,
} from "./extract-performance-series";
import { fetchParqetPerformanceHoldings } from "./fetch-remote";
import type { ParsedParqetPortfolio } from "./parse-portfolios";

/** Siehe OpenAPI PortfolioPerformanceBodyDto — relative enum (parqet-cli kompatibel). */
const INTERVAL_TRIES = ["max", "1y", "6m", "3m", "1m", "ytd", "1w", "1d"] as const;

/**
 * Liest nach einem erfolgreichen Sync eine mögliche Gesamtvermögens-Zeitreihe aus
 * POST /performance und legt sie in `portfolio_parqet_series_points` ab (ersetzt je User).
 */
export type SyncParqetSeriesResult = { stored: number };

export async function syncParqetPortfolioValueSeries(
  supabase: SupabaseClient,
  userId: string,
  accessToken: string,
  parsed: ParsedParqetPortfolio[],
): Promise<SyncParqetSeriesResult> {
  const ids = [...new Set(parsed.map((p) => p.parqet_portfolio_id.trim()).filter(Boolean))];
  if (ids.length === 0) return { stored: 0 };

  const mainCurrency = parsed[0]?.currency ?? "EUR";
  let best: ParqetSeriesPoint[] = [];

  for (const value of INTERVAL_TRIES) {
    const res = await fetchParqetPerformanceHoldings(accessToken, ids, {
      interval: { type: "relative", value },
    });
    if (!res.ok) {
      if (process.env.PARQET_SYNC_DEBUG === "1") {
        console.warn("[parqet series]", value, res.error);
      }
      continue;
    }
    const pts = extractParqetPerformanceTotalSeries(res.json);
    if (pts.length > best.length) best = pts;
    if (pts.length >= 12) break;
  }

  if (best.length < 2) {
    if (process.env.PARQET_SYNC_DEBUG === "1") {
      console.warn(
        "[parqet series] keine auslesbare Zeitreihe in /performance (typisch: nur aktuelle Holdings, keine Kurve im JSON).",
      );
    }
    return { stored: 0 };
  }

  const rows = best.map((p) => ({
    user_id: userId,
    as_of: p.asOf,
    total_value: Math.round(p.value * 100) / 100,
    currency: mainCurrency,
  }));

  const { error: delErr } = await supabase
    .from("portfolio_parqet_series_points")
    .delete()
    .eq("user_id", userId);

  if (delErr) {
    console.warn("[parqet series] delete portfolio_parqet_series_points:", delErr.message);
    return { stored: 0 };
  }

  const batch = 400;
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    const { error: insErr } = await supabase.from("portfolio_parqet_series_points").insert(chunk);
    if (insErr) {
      console.warn("[parqet series] insert portfolio_parqet_series_points:", insErr.message);
      return { stored: 0 };
    }
  }

  return { stored: rows.length };
}
