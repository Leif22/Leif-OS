import type { SupabaseClient } from "@supabase/supabase-js";
import { addBerlinCalendarDays } from "@/lib/calendar/berlin-ymd";
import { timestampToBerlinYmd, todayYmdInRecommendationTz } from "./berlin-date";

const DAY_BUDGET_MINUTES = 8 * 60;

export type CalendarEventBrief = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
};

/** Termin ab morgen im Dashboard (Kalendertag Start in Berlin + Daten für die Liste). */
export type UpcomingCalendarEventBrief = CalendarEventBrief & {
  dayYmd: string;
};

const UPCOMING_LOOKAHEAD_DAYS = 5;
const UPCOMING_MAX_ITEMS = 5;

export type TodayPlannedTaskBrief = {
  id: string;
  title: string;
  status: string;
  planned_date: string;
  estimated_minutes: number | null;
  area_name: string;
};

export type TodayCapacity = {
  usedMinutes: number;
  budgetMinutes: number;
  ratio: number;
  /** Ampel: grün / gelb / rot */
  level: "green" | "yellow" | "red";
};

function eventMinutes(ev: CalendarEventBrief): number {
  if (ev.is_all_day) return 8 * 60;
  const s = new Date(ev.start_time).getTime();
  const e = new Date(ev.end_time).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
  return Math.round((e - s) / 60_000);
}

function capacityLevel(ratio: number): TodayCapacity["level"] {
  if (ratio < 0.6) return "green";
  if (ratio < 0.9) return "yellow";
  return "red";
}

export function computeTodayCapacity(
  events: CalendarEventBrief[],
  tasks: TodayPlannedTaskBrief[],
): TodayCapacity {
  let used = 0;
  for (const ev of events) used += eventMinutes(ev);
  for (const t of tasks) used += t.estimated_minutes ?? 0;
  const ratio = DAY_BUDGET_MINUTES > 0 ? used / DAY_BUDGET_MINUTES : 0;
  return {
    usedMinutes: used,
    budgetMinutes: DAY_BUDGET_MINUTES,
    ratio,
    level: capacityLevel(ratio),
  };
}

export type TodayDashboardData = {
  todayYmd: string;
  events: CalendarEventBrief[];
  /** Termine in den nächsten Kalendertagen (ohne heute), begrenzt. */
  upcomingEvents: UpcomingCalendarEventBrief[];
  tasks: TodayPlannedTaskBrief[];
  reviewTasks: TodayPlannedTaskBrief[];
  capacity: TodayCapacity;
  errors: { events: string | null; tasks: string | null; reviewTasks: string | null };
};

export async function fetchTodayDashboardData(
  supabase: SupabaseClient,
  userId: string,
): Promise<TodayDashboardData> {
  const todayYmd = todayYmdInRecommendationTz();
  const windowStart = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const [evRes, taskRes, reviewTaskRes] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("id, title, description, start_time, end_time, is_all_day")
      .eq("user_id", userId)
      .gte("start_time", windowStart)
      .lte("start_time", windowEnd)
      .order("start_time", { ascending: true }),
    supabase
      .from("tasks")
      .select("id, title, planned_date, status, estimated_minutes, areas(name)")
      .eq("user_id", userId)
      .eq("planned_date", todayYmd)
      .in("status", ["planned", "open"])
      .order("title", { ascending: true }),
    supabase
      .from("tasks")
      .select("id, title, planned_date, status, estimated_minutes, completed_at, areas(name)")
      .eq("user_id", userId)
      .lt("planned_date", todayYmd)
      .is("completed_at", null)
      .order("planned_date", { ascending: true })
      .order("title", { ascending: true }),
  ]);

  const eventsRaw = evRes.data ?? [];
  const lastUpcomingDay = addBerlinCalendarDays(todayYmd, UPCOMING_LOOKAHEAD_DAYS);

  const events: CalendarEventBrief[] = [];
  const upcomingCandidates: UpcomingCalendarEventBrief[] = [];
  for (const row of eventsRaw as Record<string, unknown>[]) {
    const startTime = String(row.start_time ?? "");
    const ymd = timestampToBerlinYmd(startTime);
    const brief: CalendarEventBrief = {
      id: String(row.id),
      title: String(row.title ?? ""),
      description: row.description == null ? null : String(row.description),
      start_time: startTime,
      end_time: String(row.end_time ?? ""),
      is_all_day: Boolean(row.is_all_day),
    };
    if (ymd === todayYmd) {
      events.push(brief);
    } else if (ymd > todayYmd && ymd <= lastUpcomingDay) {
      upcomingCandidates.push({ ...brief, dayYmd: ymd });
    }
  }
  upcomingCandidates.sort((a, b) => a.start_time.localeCompare(b.start_time));
  const upcomingEvents = upcomingCandidates.slice(0, UPCOMING_MAX_ITEMS);

  const tasks: TodayPlannedTaskBrief[] = [];
  if (taskRes.error) {
    // tasks error handled below
  } else {
    for (const row of taskRes.data ?? []) {
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
        status: String(r.status ?? ""),
        planned_date: String(r.planned_date ?? todayYmd),
        estimated_minutes:
          r.estimated_minutes == null ? null : Number(r.estimated_minutes),
        area_name: areaName ?? "—",
      });
    }
    tasks.sort((a, b) => {
      const ea = a.estimated_minutes ?? 0;
      const eb = b.estimated_minutes ?? 0;
      if (eb !== ea) return eb - ea;
      return a.title.localeCompare(b.title, "de");
    });
  }

  const reviewTasks: TodayPlannedTaskBrief[] = [];
  if (!reviewTaskRes.error) {
    for (const row of reviewTaskRes.data ?? []) {
      const r = row as Record<string, unknown>;
      const areas = r.areas as { name?: string } | { name?: string }[] | null;
      const areaName = Array.isArray(areas)
        ? areas[0]?.name
        : typeof areas === "object" && areas && "name" in areas
          ? String((areas as { name: string }).name)
          : "—";
      reviewTasks.push({
        id: String(r.id),
        title: String(r.title ?? ""),
        status: String(r.status ?? ""),
        planned_date: String(r.planned_date ?? ""),
        estimated_minutes:
          r.estimated_minutes == null ? null : Number(r.estimated_minutes),
        area_name: areaName ?? "—",
      });
    }
  }

  const capacity = computeTodayCapacity(
    evRes.error ? [] : events,
    taskRes.error ? [] : tasks,
  );

  return {
    todayYmd,
    events: evRes.error ? [] : events,
    upcomingEvents: evRes.error ? [] : upcomingEvents,
    tasks: taskRes.error ? [] : tasks,
    reviewTasks: reviewTaskRes.error ? [] : reviewTasks,
    capacity,
    errors: {
      events: evRes.error?.message ?? null,
      tasks: taskRes.error?.message ?? null,
      reviewTasks: reviewTaskRes.error?.message ?? null,
    },
  };
}
