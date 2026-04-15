/**
 * Parqet Connect: POST /performance — Gesamtvermögen über Zeit.
 *
 * Primär: offizielles Schema `charts[].date` + `charts[].values.history` (OpenAPI
 * `PortfolioPerformanceDto_Output`, vgl. developer.parqet.com/api-spec/current.json
 * und github.com/michaeljauk/parqet-cli). Fallback: heuristische Suche / Holdings.
 */

import {
  extractPerformanceHoldingEntries,
  parseParqetPerformanceHoldingRow,
} from "./parse-portfolios";

export type ParqetSeriesPoint = { asOf: string; value: number };

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function num(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function numFromMoney(v: unknown): number | null {
  const o = asRecord(v);
  if (!o) return null;
  return num(o.amount) ?? num(o.value);
}

function parseIsoTime(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const d = new Date(raw > 1e12 ? raw : raw * 1000);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  if (typeof raw === "string" && raw.trim()) {
    const d = new Date(raw);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  return null;
}

function timeFromRow(o: Record<string, unknown>): string | null {
  return (
    parseIsoTime(o.date) ??
    parseIsoTime(o.time) ??
    parseIsoTime(o.timestamp) ??
    parseIsoTime(o.asOf) ??
    parseIsoTime(o.as_of) ??
    parseIsoTime(o.day) ??
    parseIsoTime(o.periodEnd) ??
    parseIsoTime(o.period_end) ??
    parseIsoTime(o.endDate) ??
    parseIsoTime(o.end_date) ??
    parseIsoTime(o.at) ??
    parseIsoTime(o.instant) ??
    parseIsoTime(o.calendarDate) ??
    parseIsoTime(o.calendar_date) ??
    parseIsoTime(o.observationDate) ??
    parseIsoTime(o.datum) ??
    parseIsoTime(o.zeitpunkt) ??
    parseIsoTime(o.x) ??
    parseIsoTime(o.t) ??
    parseIsoTime(asRecord(o.attributes)?.date) ??
    parseIsoTime(asRecord(o.attributes)?.timestamp) ??
    null
  );
}

function valueFromRow(o: Record<string, unknown>): number | null {
  return (
    num(o.value) ??
    num(o.y) ??
    num(o.close) ??
    num(o.nav) ??
    num(o.totalValue) ??
    num(o.total_value) ??
    num(o.portfolioValue) ??
    num(o.portfolio_value) ??
    num(o.endingValue) ??
    num(o.ending_value) ??
    num(o.marketValue) ??
    num(o.market_value) ??
    num(o.notional) ??
    num(o.gross) ??
    numFromMoney(o.value) ??
    numFromMoney(o.totalValue) ??
    numFromMoney(asRecord(o.attributes)?.value) ??
    null
  );
}

function pointFromRow(row: unknown): ParqetSeriesPoint | null {
  const o = asRecord(row);
  if (!o) return null;
  const nested = asRecord(o.attributes) ?? asRecord(o.values) ?? null;
  const base = nested ? { ...o, ...nested } : o;
  const t = timeFromRow(base);
  const v = valueFromRow(base);
  if (!t || v == null || !Number.isFinite(v)) return null;
  return { asOf: t, value: v };
}

function parseSeriesArray(arr: unknown[]): ParqetSeriesPoint[] {
  const out: ParqetSeriesPoint[] = [];
  for (const row of arr) {
    const p = pointFromRow(row);
    if (p) out.push(p);
  }
  return out;
}

function scoreSeriesPoints(pts: ParqetSeriesPoint[]): number {
  return pts.length;
}

const HOLDING_SERIES_KEYS = [
  "series",
  "history",
  "timeline",
  "points",
  "values",
  "data",
  "chart",
  "curve",
  "dailyValues",
  "navPoints",
  "snapshots",
  "intervals",
  "rows",
] as const;

/**
 * Längste erkannte Zeitreihe unter performance / position / Holding-Root
 * (manche Parqet-Builds hängen Kurven nur an der Position).
 */
function longestSeriesInHoldingSubtree(raw: unknown): ParqetSeriesPoint[] {
  const h = asRecord(raw);
  if (!h) return [];
  let best: ParqetSeriesPoint[] = [];
  const seeds: unknown[] = [
    h.performance,
    h.performanceHistory,
    h.valueHistory,
    h.history,
    h.chart,
    h.position,
    h,
  ].filter((x) => x != null);

  for (const seed of seeds) {
    const rec = asRecord(seed);
    if (!rec) continue;
    for (const key of HOLDING_SERIES_KEYS) {
      const v = rec[key];
      if (Array.isArray(v) && v.length >= 2) {
        const pts = parseSeriesArray(v);
        if (pts.length > best.length) best = pts;
      }
    }
    const deep: unknown[][] = [];
    collectArrays(rec, 0, 10, deep);
    for (const arr of deep) {
      const pts = parseSeriesArray(arr);
      if (pts.length > best.length) best = pts;
    }
  }
  return best;
}

function holdingsCurrentValueSum(body: unknown): number {
  let s = 0;
  for (const { raw } of extractPerformanceHoldingEntries(body)) {
    const p = parseParqetPerformanceHoldingRow(raw);
    if (p && Number.isFinite(p.current_value)) s += p.current_value;
  }
  return s;
}

/**
 * Summiert pro Kalendertag die Werte aus den längsten erkannten Unterserien je Holding.
 * Nur wenn genug Holdings eine Serie liefern und die Summe am letzten Tag zur aktuellen
 * Positions-Summe passt (sonst wahrscheinlich %-Returns oder unvollständige Daten).
 */
function extractSeriesFromHoldingsSummed(body: unknown): ParqetSeriesPoint[] {
  const entries = extractPerformanceHoldingEntries(body);
  if (entries.length === 0) return [];

  const perHolding: ParqetSeriesPoint[][] = [];
  for (const { raw } of entries) {
    const series = longestSeriesInHoldingSubtree(raw);
    if (series.length >= 2) perHolding.push(series);
  }
  if (perHolding.length === 0) return [];

  const n = entries.length;
  const minWithSeries = n <= 2 ? n : Math.max(2, Math.ceil(n * 0.25));
  if (perHolding.length < minWithSeries) return [];

  const byDay = new Map<string, number>();
  for (const series of perHolding) {
    for (const pt of series) {
      const d = new Date(pt.asOf);
      if (!Number.isFinite(d.getTime())) continue;
      const day = d.toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + pt.value);
    }
  }
  const out: ParqetSeriesPoint[] = [...byDay.entries()]
    .map(([day, value]) => ({ asOf: new Date(`${day}T12:00:00.000Z`).toISOString(), value }))
    .sort((a, b) => a.asOf.localeCompare(b.asOf));

  if (out.length < 2) return [];

  const maxAbs = out.reduce((m, p) => Math.max(m, Math.abs(p.value)), 0);
  const refSum = holdingsCurrentValueSum(body);
  const last = out[out.length - 1]!.value;
  if (refSum > 1000 && maxAbs <= 1 && Math.abs(last) <= 1) {
    return [];
  }

  if (refSum > 100) {
    const relErr = Math.abs(last - refSum) / refSum;
    const full = perHolding.length >= n;
    if (full && relErr > 0.62) return [];
    if (!full && relErr > 0.48) return [];
  }
  return out;
}

/** Sammelt flache Arrays aus dem JSON-Baum (max. Tiefe). */
function collectArrays(node: unknown, depth: number, maxDepth: number, out: unknown[][]): void {
  if (depth > maxDepth || node == null) return;
  if (Array.isArray(node)) {
    if (node.length >= 2) out.push(node);
    for (const x of node) collectArrays(x, depth + 1, maxDepth, out);
    return;
  }
  const o = asRecord(node);
  if (!o) return;
  for (const v of Object.values(o)) collectArrays(v, depth + 1, maxDepth, out);
}

/**
 * Parqet OpenAPI: `charts` — `values.history` = Portfoliowert zum Zeitpunkt `date`.
 * @see https://developer.parqet.com/api-spec/current.json — PortfolioPerformanceDto_Output
 */
function extractParqetSeriesFromOfficialCharts(body: unknown): ParqetSeriesPoint[] {
  const o = asRecord(body);
  if (!o) return [];
  let charts: unknown = o.charts;
  const data = asRecord(o.data);
  if (!Array.isArray(charts) && data && Array.isArray(data.charts)) {
    charts = data.charts;
  }
  if (!Array.isArray(charts) || charts.length < 2) return [];

  const pts: ParqetSeriesPoint[] = [];
  for (const row of charts) {
    const c = asRecord(row);
    if (!c) continue;
    const t = parseIsoTime(c.date);
    const vals = asRecord(c.values);
    const v = vals ? num(vals.history) : null;
    if (!t || v == null || !Number.isFinite(v)) continue;
    pts.push({ asOf: t, value: v });
  }
  if (pts.length < 2) return [];

  pts.sort((a, b) => a.asOf.localeCompare(b.asOf));
  const byExact = new Map<string, number>();
  for (const p of pts) {
    byExact.set(p.asOf, p.value);
  }
  return [...byExact.entries()]
    .map(([asOf, value]) => ({ asOf, value }))
    .sort((a, b) => a.asOf.localeCompare(b.asOf));
}

/** Pro Tag aggregieren (mehrere Portfolios / doppelte Keys). */
function mergeByDay(pts: ParqetSeriesPoint[]): ParqetSeriesPoint[] {
  const map = new Map<string, number>();
  for (const p of pts) {
    const d = new Date(p.asOf);
    if (!Number.isFinite(d.getTime())) continue;
    const key = d.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + p.value);
  }
  return [...map.entries()]
    .map(([day, value]) => ({ asOf: new Date(`${day}T12:00:00.000Z`).toISOString(), value }))
    .sort((a, b) => a.asOf.localeCompare(b.asOf));
}

/**
 * Versucht, aus der /performance-Antwort eine Gesamtvermögens-Zeitreihe zu lesen.
 * Liefert aufsteigend sortierte, nach Tag zusammengefasste Punkte (mindestens 0).
 */
export function extractParqetPerformanceTotalSeries(body: unknown): ParqetSeriesPoint[] {
  const fromCharts = extractParqetSeriesFromOfficialCharts(body);
  if (fromCharts.length >= 2) {
    const byDayLast = new Map<string, ParqetSeriesPoint>();
    for (const p of fromCharts) {
      const d = new Date(p.asOf);
      if (!Number.isFinite(d.getTime())) continue;
      const day = d.toISOString().slice(0, 10);
      const prev = byDayLast.get(day);
      if (!prev || prev.asOf.localeCompare(p.asOf) < 0) {
        byDayLast.set(day, { asOf: p.asOf, value: p.value });
      }
    }
    const merged = [...byDayLast.values()].sort((a, b) => a.asOf.localeCompare(b.asOf));
    if (merged.length >= 2) {
      return merged.map((p) => {
        const day = new Date(p.asOf).toISOString().slice(0, 10);
        return {
          asOf: new Date(`${day}T12:00:00.000Z`).toISOString(),
          value: p.value,
        };
      });
    }
    return fromCharts;
  }

  const o = asRecord(body);
  if (!o) return [];

  const directCandidates: unknown[][] = [];
  for (const key of [
    "series",
    "points",
    "history",
    "timeline",
    "dataPoints",
    "curve",
    "values",
    "chart",
    "performanceSeries",
    "portfolioPerformance",
    "portfolioTotals",
    "portfolioHistory",
    "wealthHistory",
    "valueHistory",
    "performanceHistory",
    "totals",
    "snapshots",
  ]) {
    const v = o[key];
    if (Array.isArray(v) && v.length >= 2) directCandidates.push(v);
    const inner = asRecord(v);
    if (inner) {
      for (const k2 of ["series", "points", "data", "values"]) {
        const a = inner[k2];
        if (Array.isArray(a) && a.length >= 2) directCandidates.push(a);
      }
    }
  }

  const data = asRecord(o.data);
  if (data) {
    for (const key of ["series", "points", "history", "timeline", "chart"]) {
      const v = data[key];
      if (Array.isArray(v) && v.length >= 2) directCandidates.push(v);
    }
  }

  const fromPortfolios = o.portfolios;
  if (Array.isArray(fromPortfolios)) {
    for (const p of fromPortfolios) {
      const pr = asRecord(p);
      if (!pr) continue;
      for (const key of ["series", "history", "performance", "chart"]) {
        const v = pr[key];
        if (Array.isArray(v) && v.length >= 2) directCandidates.push(v);
        const perf = asRecord(pr.performance) ?? asRecord(v);
        if (perf) {
          for (const k2 of ["series", "history", "points", "timeline"]) {
            const a = perf[k2];
            if (Array.isArray(a) && a.length >= 2) directCandidates.push(a);
          }
        }
      }
    }
  }

  let best: ParqetSeriesPoint[] = [];
  let bestScore = 0;
  for (const arr of directCandidates) {
    const pts = parseSeriesArray(arr);
    const s = scoreSeriesPoints(pts);
    if (s > bestScore) {
      bestScore = s;
      best = pts;
    }
  }

  if (bestScore < 2) {
    const deep: unknown[][] = [];
    collectArrays(body, 0, 14, deep);
    for (const arr of deep) {
      const pts = parseSeriesArray(arr);
      const s = scoreSeriesPoints(pts);
      if (s > bestScore) {
        bestScore = s;
        best = pts;
      }
    }
  }

  if (best.length < 2) {
    const fromHoldings = extractSeriesFromHoldingsSummed(body);
    return fromHoldings.length >= 2 ? fromHoldings : [];
  }
  const merged = mergeByDay(best);
  if (merged.length >= 2) return merged;
  const fromHoldings = extractSeriesFromHoldingsSummed(body);
  if (fromHoldings.length >= 2) return fromHoldings;
  return best.sort((a, b) => a.asOf.localeCompare(b.asOf));
}
