/**
 * UTC-Zeitfenster für DB-Abfrage: alle Events, die den Kalendermonat (YYYY-MM)
 * in Europe/Berlin schneiden könnten (mit Puffer für Zeitzonenränder).
 */
export function calendarOverlapUtcWindowForYm(ym: string): { fromIso: string; toIso: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12 || !Number.isFinite(y)) return null;

  const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const from = new Date(Date.UTC(y, mo - 1, 1, 0, 0, 0, 0));
  from.setUTCHours(from.getUTCHours() - 48);
  const to = new Date(Date.UTC(y, mo - 1, lastDay, 23, 59, 59, 999));
  to.setUTCHours(to.getUTCHours() + 48);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

/** UTC-Zeitfenster für DB-Abfrage: Events, die den Berlin-Kalenderzeitraum [fromYmd, toYmd] schneiden könnten. */
export function calendarOverlapUtcWindowForYmdRange(
  fromYmd: string,
  toYmd: string,
): { fromIso: string; toIso: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromYmd) || !/^\d{4}-\d{2}-\d{2}$/.test(toYmd)) return null;
  if (fromYmd > toYmd) return null;

  const [y1, m1, d1] = fromYmd.split("-").map(Number);
  const [y2, m2, d2] = toYmd.split("-").map(Number);
  const from = new Date(Date.UTC(y1, m1 - 1, d1, 0, 0, 0, 0));
  from.setUTCHours(from.getUTCHours() - 48);
  const to = new Date(Date.UTC(y2, m2 - 1, d2, 23, 59, 59, 999));
  to.setUTCHours(to.getUTCHours() + 48);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}
