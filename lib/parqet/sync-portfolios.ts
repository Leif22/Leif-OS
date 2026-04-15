import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchParqetPerformanceHoldings,
  fetchParqetPortfolioSupplementJson,
} from "./fetch-remote";
import {
  extractPositionsDeepSearch,
  groupPerformanceHoldingsByPortfolio,
  type ParsedParqetPosition,
  parseParqetPortfoliosPayload,
  positionsFromPortfolioDetail,
} from "./parse-portfolios";
import { syncParqetPortfolioValueSeries } from "./sync-parqet-series";

export async function syncParqetPortfoliosToDb(
  supabase: SupabaseClient,
  userId: string,
  portfoliosJson: unknown,
  accessToken: string,
): Promise<
  | { ok: true; portfolioCount: number; positionRowCount: number; parqetSeriesPoints: number }
  | { ok: false; error: string }
> {
  const baseParsed = parseParqetPortfoliosPayload(portfoliosJson);
  const needPositions = baseParsed.filter((p) => p.positions.length === 0);
  const needIds = needPositions.map((p) => p.parqet_portfolio_id);

  let perfMap = new Map<string, ParsedParqetPosition[]>();
  if (needIds.length > 0) {
    const perfRes = await fetchParqetPerformanceHoldings(accessToken, needIds);
    if (perfRes.ok) {
      perfMap = groupPerformanceHoldingsByPortfolio(perfRes.json, needIds);
      const total = [...perfMap.values()].reduce((s, a) => s + a.length, 0);
      if (total === 0) {
        for (const p of needPositions) {
          const one = await fetchParqetPerformanceHoldings(accessToken, [p.parqet_portfolio_id]);
          if (!one.ok) continue;
          const m = groupPerformanceHoldingsByPortfolio(one.json, [p.parqet_portfolio_id]);
          const arr = m.get(p.parqet_portfolio_id);
          if (arr && arr.length > 0) {
            perfMap.set(p.parqet_portfolio_id, arr);
          }
        }
      }
      if (process.env.PARQET_SYNC_DEBUG === "1") {
        const n = [...perfMap.values()].reduce((s, a) => s + a.length, 0);
        console.warn("[parqet sync] POST /performance Zeilen gesamt:", n);
      }
    } else if (process.env.PARQET_SYNC_DEBUG === "1") {
      console.warn("[parqet sync] POST /performance:", perfRes.error);
    }
  }

  const parsed = await Promise.all(
    baseParsed.map(async (p) => {
      if (p.positions.length > 0) return p;
      const fromPerf = perfMap.get(p.parqet_portfolio_id);
      if (fromPerf && fromPerf.length > 0) {
        const sumPositions = fromPerf.reduce(
          (s, x) => s + (Number.isFinite(x.current_value) ? x.current_value : 0),
          0,
        );
        const totalEffective =
          p.total_value > 0 ? p.total_value : sumPositions > 0 ? sumPositions : p.total_value;
        return { ...p, positions: fromPerf, total_value: totalEffective };
      }
      const sup = await fetchParqetPortfolioSupplementJson(
        accessToken,
        p.parqet_portfolio_id,
        p.supplement_ids ?? [],
        { brokerIds: p.broker_ids ?? [] },
      );
      if (!sup.ok) return p;
      let extra = positionsFromPortfolioDetail(p.parqet_portfolio_id, sup.json);
      if (extra.length === 0) {
        extra = extractPositionsDeepSearch(sup.json);
      }
      if (extra.length === 0 && process.env.PARQET_SYNC_DEBUG === "1") {
        const j = sup.json;
        console.warn(
          "[parqet sync] keine Positionen für Portfolio",
          p.parqet_portfolio_id,
          j && typeof j === "object" ? Object.keys(j as object) : typeof j,
        );
      }
      if (extra.length === 0) return p;
      const sumPositions = extra.reduce(
        (s, x) => s + (Number.isFinite(x.current_value) ? x.current_value : 0),
        0,
      );
      const totalEffective =
        p.total_value > 0 ? p.total_value : sumPositions > 0 ? sumPositions : p.total_value;
      return { ...p, positions: extra, total_value: totalEffective };
    }),
  );
  if (parsed.length === 0) {
    return {
      ok: false,
      error:
        "Parqet hat keine auslesbaren Portfolios geliefert (unerwartetes JSON-Format).",
    };
  }

  const incomingIds = new Set(parsed.map((p) => p.parqet_portfolio_id));

  const { data: existingRows, error: listErr } = await supabase
    .from("portfolio_snapshots")
    .select("id, parqet_portfolio_id")
    .eq("user_id", userId);

  if (listErr) {
    return { ok: false, error: listErr.message };
  }

  for (const row of existingRows ?? []) {
    const r = row as { id: string; parqet_portfolio_id: string };
    if (!incomingIds.has(r.parqet_portfolio_id)) {
      const { error: delErr } = await supabase.from("portfolio_snapshots").delete().eq("id", r.id);
      if (delErr) {
        return { ok: false, error: delErr.message };
      }
    }
  }

  const fetchedAt = new Date().toISOString();
  let positionRowCount = 0;

  for (const p of parsed) {
    const { data: snapRows, error: upErr } = await supabase
      .from("portfolio_snapshots")
      .upsert(
        {
          user_id: userId,
          parqet_portfolio_id: p.parqet_portfolio_id,
          name: p.name,
          total_value: p.total_value,
          currency: p.currency,
          total_gain_loss: p.total_gain_loss,
          total_gain_loss_pct: p.total_gain_loss_pct,
          ttwror: null,
          xirr: null,
          fetched_at: fetchedAt,
        },
        { onConflict: "user_id,parqet_portfolio_id" },
      )
      .select("id")
      .limit(1);

    if (upErr) {
      return { ok: false, error: upErr.message };
    }
    const snap = snapRows?.[0] as { id: string } | undefined;
    if (!snap?.id) {
      return { ok: false, error: "Snapshot-Upsert lieferte keine ID." };
    }

    const { error: delPosErr } = await supabase
      .from("portfolio_positions")
      .delete()
      .eq("snapshot_id", snap.id);
    if (delPosErr) {
      return { ok: false, error: delPosErr.message };
    }

    if (p.positions.length > 0) {
      positionRowCount += p.positions.length;
      const inserts = p.positions.map((pos) => ({
        snapshot_id: snap.id,
        name: pos.name,
        isin: pos.isin,
        ticker: pos.ticker,
        shares: pos.shares,
        current_value: pos.current_value,
        purchase_value: pos.purchase_value,
        gain_loss: pos.gain_loss,
        gain_loss_pct: pos.gain_loss_pct,
        weight_pct: pos.weight_pct,
      }));
      const { error: insErr } = await supabase.from("portfolio_positions").insert(inserts);
      if (insErr) {
        return { ok: false, error: insErr.message };
      }
    }
  }

  const mainCurrency = parsed[0]?.currency ?? "EUR";
  const totalWealth = parsed
    .filter((p) => p.currency === mainCurrency)
    .reduce((s, p) => s + (Number.isFinite(p.total_value) ? p.total_value : 0), 0);

  const { error: histInsErr } = await supabase.from("portfolio_total_history").insert({
    user_id: userId,
    total_value: totalWealth,
    currency: mainCurrency,
    recorded_at: fetchedAt,
  });
  if (histInsErr && process.env.PARQET_SYNC_DEBUG === "1") {
    console.warn("[parqet sync] portfolio_total_history:", histInsErr.message);
  }

  const seriesRes = await syncParqetPortfolioValueSeries(supabase, userId, accessToken, parsed);

  return {
    ok: true,
    portfolioCount: parsed.length,
    positionRowCount,
    parqetSeriesPoints: seriesRes.stored,
  };
}
