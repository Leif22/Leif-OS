import { RECOMMENDATION_TIMEZONE } from "@/lib/tasks/recommended";

const DOW_MON0: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

/** Kalendertag in Europe/Berlin um `delta` Tage verschieben (YYYY-MM-DD). */
export function addBerlinCalendarDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const shifted = new Date(base.getTime() + delta * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: RECOMMENDATION_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
}

/** Wochentag in Berlin: 0 = Montag … 6 = Sonntag. */
export function weekdayMon0Sun6Berlin(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  const inst = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const key = new Intl.DateTimeFormat("en-US", {
    timeZone: RECOMMENDATION_TIMEZONE,
    weekday: "short",
  }).format(inst);
  const three = key.slice(0, 3);
  return DOW_MON0[three] ?? 0;
}

/** Montag der ISO-Woche (Mo–So), die `anchorYmd` in Berlin enthält. */
export function mondayOfIsoWeekBerlin(anchorYmd: string): string {
  const dow = weekdayMon0Sun6Berlin(anchorYmd);
  return addBerlinCalendarDays(anchorYmd, -dow);
}
