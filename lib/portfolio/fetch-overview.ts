import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PortfolioHistoryPoint,
  PortfolioOverviewData,
  PortfolioPositionBrief,
  PortfolioSnapshotOverview,
} from "./types";

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function fetchPortfolioOverview(
  supabase: SupabaseClient,
  userId: string,
): Promise<PortfolioOverviewData> {
  const { data: snaps, error: snapErr } = await supabase
    .from("portfolio_snapshots")
    .select(
      "id, parqet_portfolio_id, name, total_value, currency, total_gain_loss, total_gain_loss_pct, fetched_at",
    )
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (snapErr) {
    return {
      snapshots: [],
      positionsBySnapshot: {},
      totalWealth: 0,
      currency: "EUR",
      history: [],
      parqetSeries: [],
      error: snapErr.message,
    };
  }

  const snapshots: PortfolioSnapshotOverview[] = (snaps ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      parqet_portfolio_id: String(r.parqet_portfolio_id ?? ""),
      name: String(r.name ?? ""),
      total_value: Number(r.total_value ?? 0),
      currency: String(r.currency ?? "EUR"),
      total_gain_loss: num(r.total_gain_loss),
      total_gain_loss_pct: num(r.total_gain_loss_pct),
      fetched_at: String(r.fetched_at ?? ""),
    };
  });

  let totalWealth = 0;
  const currency = snapshots[0]?.currency ?? "EUR";
  for (const s of snapshots) {
    if (s.currency === currency) totalWealth += s.total_value;
  }

  const snapshotIds = snapshots.map((s) => s.id);
  const positionsBySnapshot: Record<string, PortfolioPositionBrief[]> = {};
  for (const id of snapshotIds) positionsBySnapshot[id] = [];

  if (snapshotIds.length > 0) {
    const { data: posRows, error: posErr } = await supabase
      .from("portfolio_positions")
      .select("id, snapshot_id, name, ticker, current_value, weight_pct")
      .in("snapshot_id", snapshotIds)
      .order("current_value", { ascending: false });

    if (!posErr && posRows) {
      for (const row of posRows) {
        const r = row as Record<string, unknown>;
        const sid = String(r.snapshot_id);
        const brief: PortfolioPositionBrief = {
          id: String(r.id),
          snapshot_id: sid,
          name: String(r.name ?? ""),
          ticker: r.ticker == null ? null : String(r.ticker),
          current_value: Number(r.current_value ?? 0),
          weight_pct: num(r.weight_pct),
        };
        positionsBySnapshot[sid] ??= [];
        positionsBySnapshot[sid].push(brief);
      }
    }
  }

  let history: PortfolioHistoryPoint[] = [];
  const { data: histRows, error: histErr } = await supabase
    .from("portfolio_total_history")
    .select("total_value, currency, recorded_at")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: true })
    .limit(4000);

  if (!histErr && histRows) {
    history = histRows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        recorded_at: String(r.recorded_at ?? ""),
        total_value: Number(r.total_value ?? 0),
        currency: String(r.currency ?? "EUR"),
      };
    });
  }

  let parqetSeries: PortfolioHistoryPoint[] = [];
  const { data: pqRows, error: pqErr } = await supabase
    .from("portfolio_parqet_series_points")
    .select("total_value, currency, as_of")
    .eq("user_id", userId)
    .order("as_of", { ascending: true })
    .limit(8000);

  if (!pqErr && pqRows) {
    parqetSeries = pqRows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        recorded_at: String(r.as_of ?? ""),
        total_value: Number(r.total_value ?? 0),
        currency: String(r.currency ?? "EUR"),
      };
    });
  }

  return {
    snapshots,
    positionsBySnapshot,
    totalWealth,
    currency,
    history,
    parqetSeries,
    error: null,
  };
}
