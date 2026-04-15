import { todayYmdInRecommendationTz } from "@/lib/tasks/recommended";

export { todayYmdInRecommendationTz };

/** Kalendertag (YYYY-MM-DD) eines Zeitpunkts in Europe/Berlin. */
export function timestampToBerlinYmd(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** Kalendertag `YYYY-MM-DD` (Berlin-Logik) als ausgeschriebenes Datum für UI. */
export function formatBerlinYmdLongDe(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return ymd;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return ymd;
  const inst = new Date(Date.UTC(y, mo - 1, d, 11, 0, 0));
  return inst.toLocaleDateString("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
