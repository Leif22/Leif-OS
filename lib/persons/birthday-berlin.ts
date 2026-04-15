import { RECOMMENDATION_TIMEZONE } from "@/lib/tasks/recommended";

/** Kalendertag YYYY-MM-DD in Europe/Berlin (wie Fälligkeit / „heute“). */
export function berlinWallClockYmd(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: RECOMMENDATION_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function existsUtcYmd(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function ymdAddOneDay(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const nd = new Date(Date.UTC(y, m - 1, d + 1));
  return `${nd.getUTCFullYear()}-${String(nd.getUTCMonth() + 1).padStart(2, "0")}-${String(nd.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Aus ISO-Geburtsdatum (YYYY-MM-DD) Monat und Tag für jährliche Wiederholung.
 */
export function monthDayFromBirthdayIso(iso: string): { month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}

/**
 * Nächstes Vorkommen von Monat/Tag ab fromYmd (einschließlich), als Ganztagsfenster [start, endExclusive).
 * Feb 29 existiert in Schaltjahren; in anderen Jahren wird dieses Datum übersprungen (nächstes Schaltjahr).
 */
export function nextYearlyBirthdayOccurrence(
  fromYmd: string,
  month: number,
  day: number,
): { startYmd: string; endExclusiveYmd: string } | null {
  const startYear = Number(fromYmd.slice(0, 4));
  if (!Number.isFinite(startYear)) return null;

  for (let y = startYear; y <= startYear + 400; y++) {
    if (!existsUtcYmd(y, month, day)) continue;
    const startYmd = `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (startYmd >= fromYmd) {
      return { startYmd, endExclusiveYmd: ymdAddOneDay(startYmd) };
    }
  }
  return null;
}
