import type { SupabaseClient } from "@supabase/supabase-js";
import { eventTouchesBerlinMonth } from "@/lib/calendar/fetch-month";
import type { CalendarEventRow } from "@/lib/calendar/types";
import { calendarOverlapUtcWindowForYm } from "@/lib/calendar/month-window";
import { getValidMicrosoftAccessToken } from "./tokens";
import { graphEventToDbFields, graphListCalendarView, graphOutlookPlannerFlags } from "./graph-events";

/**
 * Lädt Outlook-Termine für den Monat und legt sie in calendar_events an bzw. aktualisiert sie
 * (Upsert über user_id + outlook_event_id).
 */
export async function syncOutlookEventsForMonth(
  supabase: SupabaseClient,
  userId: string,
  ym: string,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const win = calendarOverlapUtcWindowForYm(ym);
  if (!win) return { ok: false, error: "Ungültiger Monat." };

  const token = await getValidMicrosoftAccessToken(supabase, userId);
  if ("error" in token) return { ok: false, error: token.error };

  const [{ data: prefRow }, { data: excludedGroupRows }] = await Promise.all([
    supabase
      .from("user_calendar_planner_prefs")
      .select("outlook_sync_exclude_new_by_default")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("calendar_events")
      .select("outlook_recurrence_group_id")
      .eq("user_id", userId)
      .eq("exclude_from_planner", true)
      .eq("source", "outlook")
      .not("outlook_recurrence_group_id", "is", null),
  ]);

  const defaultExcludeNew = Boolean(prefRow?.outlook_sync_exclude_new_by_default);
  const excludedGroupIds = new Set(
    (excludedGroupRows ?? [])
      .map((r) => (r as { outlook_recurrence_group_id: string | null }).outlook_recurrence_group_id)
      .filter((g): g is string => Boolean(g)),
  );

  let graphEvents;
  try {
    graphEvents = await graphListCalendarView(token.accessToken, win.fromIso, win.toIso);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Outlook-Abruf fehlgeschlagen";
    return { ok: false, error: msg };
  }

  let n = 0;
  for (const ge of graphEvents) {
    if (!ge.id) continue;
    const fields = graphEventToDbFields(ge);
    if (!fields) continue;
    const recurrenceGroupId =
      typeof ge.seriesMasterId === "string" && ge.seriesMasterId.trim() ? ge.seriesMasterId.trim() : ge.id;
    const flags = graphOutlookPlannerFlags(ge);
    const probe: CalendarEventRow = {
      id: "",
      title: fields.title,
      description: fields.description,
      start_time: fields.start_time,
      end_time: fields.end_time,
      is_all_day: fields.is_all_day,
      source: "outlook",
      area_id: null,
      outlook_event_id: ge.id,
      outlook_recurrence_group_id: recurrenceGroupId,
      exclude_from_planner: false,
      outlook_sensitivity: flags.outlook_sensitivity,
      outlook_is_recurring: flags.outlook_is_recurring,
    };
    if (!eventTouchesBerlinMonth(probe, ym)) continue;

    const { data: existing } = await supabase
      .from("calendar_events")
      .select("id, exclude_from_planner")
      .eq("user_id", userId)
      .eq("outlook_event_id", ge.id)
      .maybeSingle();

    const excludeFromPlanner = existing?.id
      ? Boolean(existing.exclude_from_planner)
      : excludedGroupIds.has(recurrenceGroupId)
        ? true
        : defaultExcludeNew;

    const row = {
      user_id: userId,
      title: fields.title,
      description: fields.description,
      start_time: fields.start_time,
      end_time: fields.end_time,
      is_all_day: fields.is_all_day,
      source: "outlook" as const,
      outlook_event_id: ge.id,
      outlook_recurrence_group_id: recurrenceGroupId,
      exclude_from_planner: excludeFromPlanner,
      outlook_sensitivity: flags.outlook_sensitivity,
      outlook_is_recurring: flags.outlook_is_recurring,
    };

    if (existing?.id) {
      const { error } = await supabase.from("calendar_events").update(row).eq("id", existing.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabase.from("calendar_events").insert(row);
      if (error) return { ok: false, error: error.message };
    }
    n += 1;
  }

  return { ok: true, count: n };
}
