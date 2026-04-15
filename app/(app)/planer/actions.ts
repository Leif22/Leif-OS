"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchCalendarEventsForBerlinYmdRange } from "@/lib/calendar/fetch-range";
import type { CalendarEventRow } from "@/lib/calendar/types";

export async function fetchPlanerDayEvents(
  ymd: string,
): Promise<{ ok: true; events: CalendarEventRow[] } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const eventsRes = await fetchCalendarEventsForBerlinYmdRange(supabase, userData.user.id, ymd, ymd);
  if (eventsRes.error) return { ok: false, error: eventsRes.error };

  return { ok: true, events: eventsRes.events };
}

/**
 * Outlook-Termin(e) in der Planungsansicht aus- oder einblenden.
 * Bei Serien (gleiche outlook_recurrence_group_id) werden alle Vorkommen mitgeschaltet.
 */
export async function setCalendarEventExcludeFromPlanner(
  eventId: string,
  exclude: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const userId = userData.user.id;

  const { data: ev, error: loadErr } = await supabase
    .from("calendar_events")
    .select("id, source, outlook_event_id, outlook_recurrence_group_id")
    .eq("id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (loadErr) return { ok: false, error: loadErr.message };
  if (!ev) return { ok: false, error: "Termin nicht gefunden." };
  if (ev.source !== "outlook") {
    return { ok: false, error: "Nur importierte Outlook-Termine können aus der Planung ausgeblendet werden." };
  }

  const groupRaw =
    (typeof ev.outlook_recurrence_group_id === "string" && ev.outlook_recurrence_group_id.trim()) ||
    (typeof ev.outlook_event_id === "string" && ev.outlook_event_id.trim()) ||
    ev.id;

  const { data: seriesRows, error: listErr } = await supabase
    .from("calendar_events")
    .select("id")
    .eq("user_id", userId)
    .eq("source", "outlook")
    .eq("outlook_recurrence_group_id", groupRaw);

  if (listErr) return { ok: false, error: listErr.message };

  const idSet = new Set((seriesRows ?? []).map((r) => (r as { id: string }).id));
  idSet.add(eventId);
  const ids = [...idSet];

  const { error: upErr } = await supabase
    .from("calendar_events")
    .update({ exclude_from_planner: exclude })
    .eq("user_id", userId)
    .in("id", ids);

  if (upErr) return { ok: false, error: upErr.message };

  revalidatePath("/planer");
  revalidatePath("/kalender");
  revalidatePath("/dashboard");
  return { ok: true };
}
