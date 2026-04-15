export type ParsedParqetPosition = {
  name: string;
  isin: string | null;
  ticker: string | null;
  shares: number | null;
  current_value: number;
  purchase_value: number | null;
  gain_loss: number | null;
  gain_loss_pct: number | null;
  weight_pct: number | null;
};

export type ParsedParqetPortfolio = {
  parqet_portfolio_id: string;
  name: string;
  total_value: number;
  currency: string;
  total_gain_loss: number | null;
  total_gain_loss_pct: number | null;
  positions: ParsedParqetPosition[];
  /** Weitere Kennungen für Detail-Endpunkte (z. B. Slug vs. interne ID). */
  supplement_ids?: string[];
  /** Aus `distinctBrokers` — für Connect-URLs wie `/portfolios/{id}/brokers/{brokerId}/…`. */
  broker_ids?: string[];
};

function num(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "string") {
    const t = v.trim().replace(/\s/g, "").replace(",", ".");
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

function numFromMoney(v: unknown): number | null {
  const o = asRecord(v);
  if (!o) return null;
  return (
    num(o.amount) ??
    num(o.value) ??
    num(o.major) ??
    num(o.nominal) ??
    num(o.units) ??
    null
  );
}

/** Typische Summen-Felder (Parqet / JSON:API / verschachtelt). */
const TOTAL_VALUE_KEYS: string[] = [
  "totalValue",
  "total_value",
  "totalMarketValue",
  "total_market_value",
  "marketValue",
  "market_value",
  "currentValue",
  "current_value",
  "current_market_value",
  "netWorth",
  "net_worth",
  "portfolioValue",
  "portfolio_value",
  "value",
  "balance",
  "equity",
  "nav",
  "liquidationValue",
  "grossValue",
  "sum",
  "amount",
  "total",
  "gesamtwert",
  "kapital",
  "vermoegen",
  "propertyValue",
  "property_value",
  "realEstateValue",
  "real_estate_value",
  "immobilienwert",
  "netAssetValue",
  "net_asset_value",
];

const NEST_KEYS = [
  "summary",
  "totals",
  "stats",
  "metrics",
  "valuation",
  "overview",
  "financials",
  "performance",
  "balance",
  "aggregates",
  "figures",
  "portfolio",
  "details",
];

function pickTotalValue(obj: Record<string, unknown>, depth: number): number | null {
  if (depth <= 0) return null;
  for (const k of TOTAL_VALUE_KEYS) {
    const v = obj[k];
    const n = num(v) ?? numFromMoney(v);
    if (n != null) return n;
  }
  for (const nk of NEST_KEYS) {
    const child = asRecord(obj[nk]);
    if (child) {
      const n = pickTotalValue(child, depth - 1);
      if (n != null) return n;
    }
  }
  return null;
}

/** JSON:API kann `id` als String oder als `{ id: "…" }` liefern — kein `[object Object]` in URLs. */
function stringifyApiId(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    return String(raw).trim();
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const inner = o.id ?? o.uuid ?? o.portfolioId ?? o.portfolio_id;
    if (inner !== undefined && inner !== raw) {
      return stringifyApiId(inner);
    }
  }
  return "";
}

function portfolioId(obj: Record<string, unknown>): string {
  const raw =
    obj.id ??
    obj._id ??
    obj.portfolioId ??
    obj.portfolio_id ??
    obj.uuid ??
    obj.slug ??
    obj.portfolioUuid;
  const s = stringifyApiId(raw);
  if (s) return s;
  if (raw != null && typeof raw !== "object") return String(raw).trim();
  return "";
}

/** JSON:API: attributes mit id/type flachlegen. */
function flattenResource(raw: unknown): Record<string, unknown> | null {
  const o = asRecord(raw);
  if (!o) return null;
  const attrs = asRecord(o.attributes);
  if (attrs) {
    const rid =
      stringifyApiId(o.id) ||
      stringifyApiId(attrs.id) ||
      (typeof o.id === "string" || typeof o.id === "number" ? String(o.id).trim() : "") ||
      (typeof attrs.id === "string" || typeof attrs.id === "number"
        ? String(attrs.id).trim()
        : "");
    return {
      ...attrs,
      id: rid,
      type: o.type,
    };
  }
  return o;
}

/** JSON:API: `data` ist Liste von Portfolios — nicht von Holdings/Zeilen. */
function looksLikePortfolioRow(first: Record<string, unknown>): boolean {
  const t = str(first.type)?.toLowerCase() ?? "";
  if (
    t.includes("holding") ||
    t.includes("line") ||
    t.includes("position") ||
    t.includes("security")
  ) {
    return false;
  }
  return first.attributes != null || t.includes("portfolio");
}

function indexIncluded(body: unknown): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  const root = asRecord(body);
  if (!root || !Array.isArray(root.included)) return map;
  for (const item of root.included) {
    const o = asRecord(item);
    if (!o) continue;
    const type = str(o.type);
    const id = stringifyApiId(o.id);
    if (!type || !id) continue;
    const flat = flattenResource(item);
    if (flat) {
      map.set(`${type}:${id}`, flat);
    }
  }
  return map;
}

function portfolioListFromBody(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  const o = asRecord(body);
  if (!o) return [];
  if (o.data !== undefined) {
    if (Array.isArray(o.data)) {
      if (o.data.length === 0) return [];
      const first = asRecord(o.data[0]);
      if (first && looksLikePortfolioRow(first)) {
        return o.data as unknown[];
      }
      return [];
    }
    return [o.data];
  }
  for (const key of [
    "portfolios",
    "items",
    "results",
    "content",
    "elements",
    "rows",
    "userPortfolios",
    "user_portfolios",
  ]) {
    if (Array.isArray(o[key])) return o[key] as unknown[];
  }
  return [];
}

function parsePosition(raw: unknown): ParsedParqetPosition | null {
  const o = flattenResource(raw) ?? asRecord(raw);
  if (!o) return null;
  const inst =
    asRecord(o.instrument) ??
    asRecord(o.security) ??
    asRecord(o.asset) ??
    asRecord(o.line) ??
    asRecord(o.holding);
  const nestedName =
    inst &&
    (str(inst.name) ??
      str(inst.title) ??
      str(inst.symbol) ??
      str(inst.ticker) ??
      str(inst.isin));
  const nestedValue =
    inst &&
    (num(inst.marketValue) ??
      num(inst.market_value) ??
      num(inst.value) ??
      num(inst.currentValue) ??
      num(inst.current_value) ??
      numFromMoney(inst.money));
  const name =
    str(o.name) ??
    str(o.title) ??
    str(o.label) ??
    str(o.assetName) ??
    str(o.securityName) ??
    str(o.instrumentName) ??
    str(o.displayName) ??
    nestedName ??
    "Position";
  let current =
    num(o.currentValue) ??
    num(o.current_value) ??
    num(o.marketValue) ??
    num(o.market_value) ??
    num(o.grossMarketValue) ??
    num(o.netMarketValue) ??
    num(o.totalMarketValue) ??
    num(o.value) ??
    num(o.totalValue) ??
    num(o.positionValue) ??
    num(o.valuation) ??
    num(o.euroValue) ??
    num(o.valueEUR) ??
    num(o.marketValueEur) ??
    num(o.currentWorth) ??
    nestedValue ??
    numFromMoney(o.money) ??
    numFromMoney(o.amount) ??
    null;
  if (current == null || current === 0) {
    const px = num(o.price) ?? num(o.lastPrice) ?? num(o.last_price) ?? num(o.quote);
    const q = num(o.quantity) ?? num(o.shares) ?? num(o.units);
    if (px != null && q != null) current = px * q;
  }
  if (current == null || !Number.isFinite(current)) current = 0;
  return {
    name,
    isin: str(o.isin) ?? str(o.ISIN),
    ticker: str(o.ticker) ?? str(o.symbol) ?? str(o.Symbol),
    shares: num(o.shares) ?? num(o.quantity) ?? num(o.units) ?? num(o.amount),
    current_value: current,
    purchase_value:
      num(o.purchaseValue) ?? num(o.purchase_value) ?? num(o.costBasis) ?? num(o.invested),
    gain_loss: num(o.gainLoss) ?? num(o.gain_loss) ?? num(o.pl) ?? num(o.unrealizedGain),
    gain_loss_pct: num(o.gainLossPct) ?? num(o.gain_loss_pct) ?? num(o.returnPct),
    weight_pct: num(o.weightPct) ?? num(o.weight_pct) ?? num(o.weight) ?? num(o.allocationPct),
  };
}

function positionsFromRecord(obj: Record<string, unknown>): ParsedParqetPosition[] {
  const embedded = asRecord(obj._embedded);
  if (embedded) {
    const fromEmb = positionsFromRecord(embedded);
    if (fromEmb.length > 0) return fromEmb;
  }
  const brokers = obj.distinctBrokers;
  if (Array.isArray(brokers)) {
    for (const el of brokers) {
      if (typeof el === "string" || typeof el === "number" || typeof el === "boolean") {
        continue;
      }
      const br = asRecord(el);
      if (!br) continue;
      const fromBr = positionsFromRecord(br);
      if (fromBr.length > 0) return fromBr;
    }
  }
  const candidates = [
    obj.holdings,
    obj.positions,
    obj.assets,
    obj.lines,
    obj.instruments,
    obj.securities,
    obj.investments,
    obj.stockPositions,
    obj.allocations,
    obj.constituents,
    obj.components,
    obj.productLines,
    obj.ledger,
    obj.rows,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) {
      return c.map(parsePosition).filter((p): p is ParsedParqetPosition => p != null);
    }
  }
  const nested = asRecord(obj.portfolio);
  if (nested) {
    return positionsFromRecord(nested);
  }
  return [];
}

function relationshipRefs(raw: Record<string, unknown>, names: string[]): unknown[] | null {
  const rel = asRecord(raw.relationships);
  if (!rel) return null;
  for (const name of names) {
    const block = asRecord(rel[name]);
    if (!block || block.data === undefined) continue;
    if (Array.isArray(block.data)) {
      return block.data as unknown[];
    }
    return [block.data];
  }
  return null;
}

function positionsFromIncluded(
  raw: Record<string, unknown>,
  includedMap: Map<string, Record<string, unknown>>,
): ParsedParqetPosition[] {
  const refs =
    relationshipRefs(raw, [
      "holdings",
      "positions",
      "assets",
      "lines",
      "instruments",
      "ledger_lines",
      "ledgerLines",
      "security_positions",
      "stockLines",
      "stock_lines",
    ]) ?? [];
  if (refs.length === 0 || includedMap.size === 0) return [];
  const out: ParsedParqetPosition[] = [];
  for (const ref of refs) {
    const r = asRecord(ref);
    const type = str(r?.type);
    const id = stringifyApiId(r?.id);
    if (!type || !id) continue;
    const entity = includedMap.get(`${type}:${id}`);
    if (entity) {
      const p = parsePosition(entity);
      if (p) out.push(p);
    }
  }
  return out;
}

function extractPositions(
  raw: unknown,
  flat: Record<string, unknown>,
  includedMap: Map<string, Record<string, unknown>>,
): ParsedParqetPosition[] {
  const direct = positionsFromRecord(flat);
  if (direct.length > 0) return direct;
  const rawObj = asRecord(raw);
  if (rawObj) {
    const fromRel = positionsFromIncluded(rawObj, includedMap);
    if (fromRel.length > 0) return fromRel;
    const d2 = positionsFromRecord(rawObj);
    if (d2.length > 0) return d2;
  }
  return [];
}

function pickCurrency(obj: Record<string, unknown>): string {
  return (
    str(obj.currency) ??
    str(obj.currencyCode) ??
    str(obj.currency_code) ??
    str(obj.baseCurrency) ??
    str(obj.base_currency) ??
    "EUR"
  );
}

export function parseParqetPortfoliosPayload(body: unknown): ParsedParqetPortfolio[] {
  const includedMap = indexIncluded(body);
  const list = portfolioListFromBody(body);
  const out: ParsedParqetPortfolio[] = [];

  for (const raw of list) {
    const flat = flattenResource(raw);
    if (!flat) continue;
    const pid = portfolioId(flat);
    if (!pid) continue;

    const name =
      str(flat.name) ??
      str(flat.title) ??
      str(flat.label) ??
      str(flat.displayName) ??
      `Portfolio ${pid.slice(0, 8)}`;

    const total = pickTotalValue(flat, 4) ?? 0;
    const currency = pickCurrency(flat);

    const perf = asRecord(flat.performance) ?? asRecord(flat.metrics) ?? null;
    const total_gain_loss =
      num(flat.totalGainLoss) ??
      num(flat.total_gain_loss) ??
      (perf ? num(perf.totalGainLoss) ?? num(perf.gain) : null);
    const total_gain_loss_pct =
      num(flat.totalGainLossPct) ??
      num(flat.total_gain_loss_pct) ??
      (perf ? num(perf.totalGainLossPct) ?? num(perf.returnPct) : null);

    let positions = extractPositions(raw, flat, includedMap);
    if (positions.length === 0) {
      positions = extractPositionsDeepSearch(raw);
    }
    if (positions.length === 0) {
      positions = extractPositionsDeepSearch(flat);
    }

    const sumPositions = positions.reduce(
      (s, p) => s + (Number.isFinite(p.current_value) ? p.current_value : 0),
      0,
    );
    const totalEffective = total > 0 ? total : sumPositions;

    const supplement_ids: string[] = [];
    const pushAlt = (v: unknown) => {
      const x = stringifyApiId(v);
      if (x && x !== pid) supplement_ids.push(x);
    };
    pushAlt(flat.slug);
    pushAlt(flat.publicSlug);
    pushAlt(flat.portfolioSlug);
    pushAlt(flat.shortId);
    pushAlt(flat.handle);
    const nestP = asRecord(flat.portfolio);
    if (nestP) {
      pushAlt(nestP.slug);
      pushAlt(nestP.id);
    }
    const uniqueSupp = [...new Set(supplement_ids)];

    const broker_ids: string[] = [];
    if (Array.isArray(flat.distinctBrokers)) {
      for (const el of flat.distinctBrokers as unknown[]) {
        if (typeof el === "string" || typeof el === "number" || typeof el === "boolean") {
          const s = String(el).trim();
          if (s) broker_ids.push(s);
          continue;
        }
        const br = asRecord(el);
        if (!br) continue;
        const bid =
          stringifyApiId(br.id) ||
          stringifyApiId(br.brokerId) ||
          stringifyApiId(br.broker_id) ||
          stringifyApiId(br._id) ||
          stringifyApiId(br.uuid) ||
          stringifyApiId(br.key) ||
          stringifyApiId(br.brokerKey) ||
          stringifyApiId(br.externalId) ||
          str(br.slug)?.trim() ||
          "";
        if (bid) broker_ids.push(bid);
      }
    }
    const uniqueBrokers = [
      ...new Set(
        broker_ids.flatMap((b) => {
          const t = b.trim();
          if (!t) return [];
          return [t, t.replace(/_/g, "-"), t.replace(/-/g, "_")];
        }),
      ),
    ].filter(Boolean);

    out.push({
      parqet_portfolio_id: pid,
      name,
      total_value: totalEffective,
      currency,
      total_gain_loss,
      total_gain_loss_pct,
      positions,
      ...(uniqueSupp.length ? { supplement_ids: uniqueSupp } : {}),
      ...(uniqueBrokers.length ? { broker_ids: uniqueBrokers } : {}),
    });
  }

  return out;
}

/** Antwort von GET …/holdings o. Ä.: reine Positionsliste oder JSON:API. */
export function parseHoldingsPayload(body: unknown): ParsedParqetPosition[] {
  if (Array.isArray(body)) {
    return body.map(parsePosition).filter((p): p is ParsedParqetPosition => p != null);
  }
  const o = asRecord(body);
  if (!o) return [];
  const dataVal = o.data;
  if (dataVal != null && !Array.isArray(dataVal)) {
    const single = asRecord(dataVal);
    if (single) {
      const nested = positionsFromRecord(single);
      if (nested.length > 0) return nested;
      const one = parsePosition(single);
      if (one) return [one];
    }
  }
  for (const key of [
    "holdings",
    "positions",
    "lines",
    "assets",
    "instruments",
    "items",
    "results",
    "data",
  ]) {
    const v = o[key];
    if (Array.isArray(v)) {
      const parsed = v.map(parsePosition).filter((p): p is ParsedParqetPosition => p != null);
      if (parsed.length > 0) return parsed;
    }
  }
  const rec = positionsFromRecord(o);
  if (rec.length > 0) return rec;
  return positionsFromIncluded(o, indexIncluded(body));
}

/** Einzelportfolio-JSON → Positionsliste (Detail oder reine Holdings-Liste). */
export function positionsFromPortfolioDetail(
  portfolioId: string,
  json: unknown,
): ParsedParqetPosition[] {
  const wrapped: unknown = Array.isArray(json)
    ? { data: json }
    : asRecord(json)?.data !== undefined
      ? json
      : { data: [json] };
  const list = parseParqetPortfoliosPayload(wrapped as Record<string, unknown>);
  const byId = list.find((p) => p.parqet_portfolio_id === portfolioId);
  if (byId && byId.positions.length > 0) return byId.positions;
  if (list.length === 1 && list[0].positions.length > 0) return list[0].positions;

  const holdings = parseHoldingsPayload(json);
  if (holdings.length > 0) return holdings;
  return [];
}

function scoreAsHoldingRow(rec: Record<string, unknown>): number {
  let s = 0;
  if (str(rec.isin) || str(rec.ISIN) || str(rec.symbol) || str(rec.ticker) || str(rec.wkn)) s += 2;
  if (str(rec.name) || str(rec.title) || str(rec.label)) s += 1;
  if (num(rec.quantity) != null || num(rec.shares) != null || num(rec.units) != null) s += 1;
  if (
    num(rec.value) != null ||
    num(rec.marketValue) != null ||
    num(rec.currentValue) != null ||
    num(rec.valuation) != null ||
    num(rec.euroValue) != null ||
    num(rec.valueEUR) != null ||
    num(rec.marketValueEur) != null ||
    num(rec.currentWorth) != null ||
    num(rec.worth) != null
  ) {
    s += 2;
  }
  return s;
}

/**
 * Letzter Ausweg: tief im JSON nach Arrays suchen, die wie Positionszeilen aussehen
 * (z. B. unbekannte Feldnamen).
 */
export function extractPositionsDeepSearch(body: unknown): ParsedParqetPosition[] {
  let best: ParsedParqetPosition[] = [];

  function considerArray(arr: unknown[]) {
    if (!Array.isArray(arr) || arr.length === 0 || arr.length > 2500) return;
    const rows: ParsedParqetPosition[] = [];
    for (const el of arr) {
      const rec = asRecord(el);
      if (!rec) continue;
      const sc = scoreAsHoldingRow(rec);
      if (sc < 2) continue;
      const p = parsePosition(el);
      if (p) rows.push(p);
    }
    if (rows.length > best.length) {
      best = rows;
    }
  }

  function visit(node: unknown, depth: number) {
    if (depth > 14) return;
    if (Array.isArray(node)) {
      considerArray(node);
      for (const x of node) visit(x, depth + 1);
      return;
    }
    const o = asRecord(node);
    if (!o) return;
    for (const v of Object.values(o)) visit(v, depth + 1);
  }

  visit(body, 0);
  return best;
}

// --- Parqet Connect: POST /performance → holdings[] (developer.parqet.com/docs/api) ---

export type PerformanceHoldingEntry = { raw: unknown; portfolioIdHint: string | null };

export function extractPerformanceHoldingEntries(body: unknown): PerformanceHoldingEntry[] {
  const o = asRecord(body);
  if (!o) return [];
  const flat = (arr: unknown[] | undefined): PerformanceHoldingEntry[] =>
    Array.isArray(arr) ? arr.map((raw) => ({ raw, portfolioIdHint: null })) : [];

  if (Array.isArray(o.holdings)) return flat(o.holdings);
  const d = asRecord(o.data);
  if (d && Array.isArray(d.holdings)) return flat(d.holdings);
  const r = asRecord(o.result);
  if (r && Array.isArray(r.holdings)) return flat(r.holdings);

  if (Array.isArray(o.portfolios)) {
    const out: PerformanceHoldingEntry[] = [];
    for (const p of o.portfolios) {
      const pr = asRecord(p);
      if (!pr) continue;
      const pid =
        stringifyApiId(pr.id) ??
        stringifyApiId(pr.portfolioId) ??
        stringifyApiId(pr.portfolio_id) ??
        stringifyApiId(asRecord(pr.portfolio)?.id) ??
        null;
      const hh = pr.holdings;
      if (Array.isArray(hh)) {
        for (const raw of hh) {
          out.push({ raw, portfolioIdHint: pid });
        }
      }
    }
    if (out.length > 0) return out;
  }
  return [];
}

function applyWeightsFromSum(positions: ParsedParqetPosition[]): ParsedParqetPosition[] {
  const sum = positions.reduce(
    (s, p) => s + (Number.isFinite(p.current_value) ? p.current_value : 0),
    0,
  );
  if (sum <= 0) return positions;
  return positions.map((p) => ({
    ...p,
    weight_pct:
      p.weight_pct ??
      (Number.isFinite(p.current_value) && p.current_value > 0
        ? (p.current_value / sum) * 100
        : null),
  }));
}

/** Wert aus /performance-Zeilen (Wertpapiere, Immobilien, Sachwerte …). */
function performanceHoldingCurrentValue(
  h: Record<string, unknown>,
  asset: Record<string, unknown>,
  pos: Record<string, unknown>,
  perf: Record<string, unknown> | null,
): number | null {
  const quote = asRecord(h.quote);
  const val = asRecord(h.valuation) ?? asRecord(pos.valuation) ?? asRecord(asset.valuation);
  return (
    num(pos.currentValue) ??
    num(pos.current_value) ??
    num(pos.marketValue) ??
    num(pos.market_value) ??
    num(pos.estimatedValue) ??
    num(pos.estimated_value) ??
    num(pos.fairValue) ??
    num(pos.fair_value) ??
    num(pos.appraisedValue) ??
    num(pos.bookValue) ??
    num(pos.netAssetValue) ??
    num(h.currentValue) ??
    num(h.current_value) ??
    num(h.marketValue) ??
    num(h.market_value) ??
    num(h.estimatedValue) ??
    numFromMoney(h.valuation) ??
    numFromMoney(asset.valuation) ??
    numFromMoney(val) ??
    num(val?.amount) ??
    num(val?.value) ??
    num(quote?.value) ??
    numFromMoney(quote) ??
    (perf ? num(perf.endingValue) ?? num(perf.endValue) ?? num(perf.marketValue) : null) ??
    (perf ? numFromMoney(asRecord(perf.value)) : null) ??
    null
  );
}

/** Eine Zeile aus dem `holdings`-Array der /performance-Antwort. */
export function parseParqetPerformanceHoldingRow(raw: unknown): ParsedParqetPosition | null {
  const h = asRecord(raw);
  if (!h) return null;
  const asset = asRecord(h.asset) ?? {};
  const pos = asRecord(h.position) ?? {};
  const prop = asRecord(h.property) ?? asRecord(asset.property);
  const name =
    str(asset.name) ??
    str(asset.title) ??
    str(asset.label) ??
    str(asset.displayName) ??
    str(prop?.name) ??
    str(prop?.title) ??
    str(h.name) ??
    str(h.title) ??
    str(h.label) ??
    str(h.displayName) ??
    str(h.description)?.slice(0, 120) ??
    null;
  const isin = str(asset.isin) ?? str(asset.ISIN);
  const ticker = str(asset.symbol) ?? str(asset.ticker) ?? str(asset.tickerSymbol);
  const typeStr = str(asset.type) ?? str(asset.assetType) ?? str(h.assetType);
  const isLikelyNonSecurity =
    typeStr != null &&
    /real|estate|immobilien|property|physical|crypto|cash|sachwert|commodity|metal/i.test(
      typeStr,
    );
  const displayName =
    name ??
    (typeStr ? `${typeStr.replace(/_/g, " ")}` : null) ??
    (isLikelyNonSecurity ? "Position" : null);
  if (!displayName && !isin && !ticker) return null;

  const perf = asRecord(h.performance);
  const shares = num(pos.shares) ?? num(pos.quantity) ?? num(pos.units) ?? num(pos.amount);
  let current = performanceHoldingCurrentValue(h, asset, pos, perf);
  if (current == null) {
    const cp = num(pos.currentPrice) ?? num(pos.current_price) ?? numFromMoney(pos.currentPrice);
    const q = shares;
    if (cp != null && q != null) current = cp * q;
  }
  if (current == null || !Number.isFinite(current)) current = 0;

  let purchase_value =
    num(pos.purchaseValue) ??
    num(pos.purchase_value) ??
    num(pos.acquisitionValue) ??
    num(pos.acquisition_value) ??
    num(h.purchaseValue) ??
    num(h.purchase_value) ??
    numFromMoney(pos.purchasePrice) ??
    null;
  if (purchase_value == null) {
    const pp =
      num(pos.purchasePrice) ??
      num(pos.purchase_price) ??
      numFromMoney(pos.purchasePrice) ??
      numFromMoney(pos.acquisitionPrice);
    const q = shares;
    if (pp != null && q != null) purchase_value = pp * q;
  }

  const gain_loss =
    num(perf?.unrealizedGain) ??
    num(perf?.unrealized_gain) ??
    num(perf?.totalGain) ??
    num(perf?.total_gain) ??
    (purchase_value != null && Number.isFinite(current)
      ? current - purchase_value
      : null);
  let gain_loss_pct: number | null = null;
  if (purchase_value != null && purchase_value !== 0 && gain_loss != null) {
    gain_loss_pct = (gain_loss / purchase_value) * 100;
  }

  return {
    name: displayName ?? "Position",
    isin,
    ticker,
    shares,
    current_value: current,
    purchase_value,
    gain_loss,
    gain_loss_pct,
    weight_pct: num(pos.weightPct) ?? num(pos.weight_pct) ?? num(perf?.weightPct) ?? null,
  };
}

/**
 * Mappt /performance-`holdings` auf Portfolio-IDs. Fehlt `portfolioId` am Holding, nur bei genau einem angefragten Portfolio zuordenbar.
 */
export function groupPerformanceHoldingsByPortfolio(
  body: unknown,
  requestedPortfolioIds: string[],
): Map<string, ParsedParqetPosition[]> {
  const map = new Map<string, ParsedParqetPosition[]>();
  const req = new Set(requestedPortfolioIds);
  for (const id of requestedPortfolioIds) {
    map.set(id, []);
  }
  const entries = extractPerformanceHoldingEntries(body);
  const singlePid = requestedPortfolioIds.length === 1 ? requestedPortfolioIds[0] : null;

  for (const { raw, portfolioIdHint } of entries) {
    const p = parseParqetPerformanceHoldingRow(raw);
    if (!p) continue;
    const h = asRecord(raw);
    if (!h) continue;
    let pid =
      stringifyApiId(h.portfolioId) ??
      stringifyApiId(h.portfolio_id) ??
      stringifyApiId(asRecord(h.portfolio)?.id) ??
      portfolioIdHint;
    if (!pid && singlePid) pid = singlePid;
    if (!pid || !req.has(pid)) continue;
    map.get(pid)!.push(p);
  }

  for (const id of requestedPortfolioIds) {
    map.set(id, applyWeightsFromSum(map.get(id) ?? []));
  }
  return map;
}
