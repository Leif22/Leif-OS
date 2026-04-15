import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarEventRow } from "./types";
import {
  eventTouchesBerlinYmdRange,
  fetchCalendarEventsForBerlinYmdRange,
} from "./fetch-range";

/** Event schneidet den Kalendermonat ym (YYYY-MM) in Europe/Berlin (YMD-Vergleich). */
export function eventTouchesBerlinMonth(ev: CalendarEventRow, ym: string): boolean {
  const y = Number(ym.slice(0, 4));
  const mo = Number(ym.slice(5, 7));
  const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const monthStart = `${ym}-01`;
  const monthEnd = `${ym}-${String(lastDay).padStart(2, "0")}`;
  return eventTouchesBerlinYmdRange(ev, monthStart, monthEnd);
}

export async function fetchCalendarEventsForMonth(
  supabase: SupabaseClient,
  userId: string,
  ym: string,
): Promise<{ events: CalendarEventRow[]; error: string | null }> {
  const y = Number(ym.slice(0, 4));
  const mo = Number(ym.slice(5, 7));
  if (!Number.isFinite(y) || mo < 1 || mo > 12 || !/^\d{4}-\d{2}$/.test(ym.trim())) {
    return { events: [], error: "Ungültiger Monat." };
  }
  const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const monthStart = `${ym}-01`;
  const monthEnd = `${ym}-${String(lastDay).padStart(2, "0")}`;
  return fetchCalendarEventsForBerlinYmdRange(supabase, userId, monthStart, monthEnd);
}
