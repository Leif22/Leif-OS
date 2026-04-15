import type { PortfolioHistoryPoint, PortfolioSnapshotOverview } from "@/lib/portfolio/types";

export type PortfolioRangeKey = "1d" | "1w" | "1m" | "3m" | "1y" | "max";

export const PORTFOLIO_RANGE_OPTIONS: { key: PortfolioRangeKey; label: string }[] = [
  { key: "1d", label: "1T" },
  { key: "1w", label: "1W" },
  { key: "1m", label: "1M" },
  { key: "3m", label: "3M" },
  { key: "1y", label: "1J" },
  { key: "max", label: "MAX" },
];

/** Parqet-Summenkennzahlen aus den aktuellen Snapshots (gewichteter %-Durchschnitt, Summe absolut). */
export function aggregateParqetSnapshotPerformance(snapshots: PortfolioSnapshotOverview[]): {
  abs: number | null;
  pct: number | null;
} {
  if (snapshots.length === 0) return { abs: null, pct: null };
  let sumGain = 0;
  let anyGain = false;
  let sumValue = 0;
  let wNum = 0;
  let wDen = 0;
  for (const s of snapshots) {
    sumValue += s.total_value;
    if (s.total_gain_loss != null) {
      anyGain = true;
      sumGain += s.total_gain_loss;
    }
    if (s.total_gain_loss_pct != null && s.total_value > 0) {
      wNum += s.total_value * s.total_gain_loss_pct;
      wDen += s.total_value;
    }
  }
  const pct =
    wDen > 0
      ? wNum / wDen
      : anyGain && sumValue !== sumGain
        ? (sumGain / (sumValue - sumGain)) * 100
        : null;
  return { abs: anyGain ? sumGain : null, pct };
}

export function topPortfolioBuckets(
  snapshots: PortfolioSnapshotOverview[],
  totalWealth: number,
  n: number,
): { name: string; pct: number }[] {
  if (totalWealth <= 0 || snapshots.length === 0) return [];
  const sorted = [...snapshots].sort((a, b) => b.total_value - a.total_value);
  return sorted.slice(0, n).map((s) => ({
    name: (s.name || "Portfolio").trim() || "Portfolio",
    pct: (s.total_value / totalWealth) * 100,
  }));
}

export function filterHistoryByRange(
  points: PortfolioHistoryPoint[],
  currency: string,
  range: PortfolioRangeKey,
): PortfolioHistoryPoint[] {
  const same = points.filter((p) => p.currency === currency);
  if (range === "max") return same;
  const now = Date.now();
  const ms =
    range === "1d"
      ? 86400000
      : range === "1w"
        ? 7 * 86400000
        : range === "1m"
          ? 30 * 86400000
          : range === "3m"
            ? 90 * 86400000
            : 365 * 86400000;
  const from = now - ms;
  return same.filter((p) => {
    const t = new Date(p.recorded_at).getTime();
    return Number.isFinite(t) && t >= from;
  });
}

export function rangeValueDelta(points: PortfolioHistoryPoint[]): {
  abs: number;
  pct: number | null;
} | null {
  if (points.length < 2) return null;
  const a = points[0].total_value;
  const b = points[points.length - 1].total_value;
  const abs = b - a;
  const pct = a !== 0 ? (abs / a) * 100 : null;
  return { abs, pct };
}

/** SVG viewBox line points (x 0..1, y 0..1 inverted for screen coords). */
export function historyToSparklinePoints(values: number[]): { x: number; y: number }[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => ({
    x: values.length === 1 ? 0.5 : i / (values.length - 1),
    y: 1 - (v - min) / span,
  }));
  if (pts.length === 1) {
    const p = pts[0];
    return [
      { x: 0.08, y: p.y },
      { x: 0.92, y: p.y },
    ];
  }
  return pts;
}
