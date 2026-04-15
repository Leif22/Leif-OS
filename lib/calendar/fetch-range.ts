import type { SupabaseClient } from "@supabase/supabase-js";
import { timestampToBerlinYmd } from "@/lib/dashboard/berlin-date";
import { calendarOverlapUtcWindowForYmdRange } from "./month-window";
import type { CalendarEventRow, PlannedTaskCalendarRow } from "./types";

export function eventTouchesBerlinYmdRange(
  ev: CalendarEventRow,
  fromYmd: string,
  toYmd: string,
): boolean {
  const start = timestampToBerlinYmd(ev.start_time);
  const end = timestampToBerlinYmd(ev.end_time);
  return start <= toYmd && end >= fromYmd;
}

export async function fetchCalendarEventsForBerlinYmdRange(
  supabase: SupabaseClient,
  userId: string,
  fromYmd: string,
  toYmd: string,
): Promise<{ events: CalendarEventRow[]; error: string | null }> {
  const win = calendarOverlapUtcWindowForYmdRange(fromYmd, toYmd);
  if (!win) return { events: [], error: "Ungültiger Zeitraum." };

  const { data, error } = await supabase
    .from("calendar_events")
    .select(
      "id, title, description, start_time, end_time, is_all_day, source, area_id, outlook_event_id, outlook_recurrence_group_id, exclude_from_planner, outlook_sensitivity, outlook_is_recurring",
    )
    .eq("user_id", userId)
    .lte("start_time", win.toIso)
    .gte("end_time", win.fromIso)
    .order("start_time", { ascending: true });

  if (error) return { events: [], error: error.message };

  const rows = (data ?? []) as CalendarEventRow[];
  return {
    events: rows.filter((ev) => eventTouchesBerlinYmdRange(ev, fromYmd, toYmd)),
    error: null,
  };
}

export async function fetchPlannedTasksForBerlinYmdRange(
  supabase: SupabaseClient,
  userId: string,
  fromYmd: string,
  toYmd: string,
): Promise<{ tasks: PlannedTaskCalendarRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, planned_date, status, estimated_minutes, areas(name)")
    .eq("user_id", userId)
    .not("planned_date", "is", null)
    .gte("planned_date", fromYmd)
    .lte("planned_date", toYmd)
    .in("status", ["planned", "open"])
    .order("planned_date", { ascending: true })
    .order("title", { ascending: true });

  if (error) return { tasks: [], error: error.message };

  const tasks: PlannedTaskCalendarRow[] = [];
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const areas = r.areas as { name?: string } | { name?: string }[] | null;
    const areaName = Array.isArray(areas)
      ? areas[0]?.name
      : typeof areas === "object" && areas && "name" in areas
        ? String((areas as { name: string }).name)
        : "—";
    tasks.push({
      id: String(r.id),
      title: String(r.title ?? ""),
      planned_date: String(r.planned_date ?? ""),
      status: String(r.status ?? ""),
      estimated_minutes: r.estimated_minutes == null ? null : Number(r.estimated_minutes),
      area_name: areaName ?? "—",
    });
  }

  return { tasks, error: null };
}
