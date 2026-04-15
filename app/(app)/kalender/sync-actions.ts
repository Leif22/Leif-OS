"use server";

import { createClient } from "@/lib/supabase/server";
import { syncOutlookEventsForMonth } from "@/lib/microsoft/outlook-sync";
import { calendarOverlapUtcWindowForYmdRange } from "@/lib/calendar/month-window";
import type { CalendarEventRow, PlannedTaskCalendarRow } from "@/lib/calendar/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CalendarSyncReason =
  | "initial"
  | "focus"
  | "resume"
  | "interval-active"
  | "interval-idle"
  | "write-confirmation"
  | "manual"
  | "webhook";

export type CalendarSyncMode = "full" | "delta";

type SyncInput = {
  fromYmd: string;
  toYmd: string;
  reason: CalendarSyncReason;
  mode: CalendarSyncMode;
  changedSinceIso?: string | null;
  withOutlookPull?: boolean;
};

type SyncEventRow = CalendarEventRow & { updated_at: string };
type SyncTaskRow = PlannedTaskCalendarRow & { updated_at: string };

export type CalendarHybridSyncResponse =
  | {
      ok: true;
      mode: CalendarSyncMode;
      syncedAtIso: string;
      events: SyncEventRow[];
      plannedTasks: SyncTaskRow[];
      outlookChangedCount: number;
    }
  | { ok: false; error: string };

function isYmd(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v.trim());
}

function enumerateYm(fromYmd: string, toYmd: string): string[] {
  const [fy, fm] = fromYmd.split("-").map(Number);
  const [ty, tm] = toYmd.split("-").map(Number);
  const out: string[] = [];
  let y = fy;
  let m = fm;
  for (let guard = 0; guard < 36; guard++) {
    out.push(`${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}`);
    if (y === ty && m === tm) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

function shouldPullOutlook(reason: CalendarSyncReason, withOutlookPull: boolean): boolean {
  if (withOutlookPull) return true;
  return reason === "initial" || reason === "focus" || reason === "resume" || reason === "manual";
}

export async function runCalendarHybridSync(input: SyncInput): Promise<CalendarHybridSyncResponse> {
  const fromYmd = input.fromYmd.trim();
  const toYmd = input.toYmd.trim();
  if (!isYmd(fromYmd) || !isYmd(toYmd) || fromYmd > toYmd) {
    return { ok: false, error: "Ungültiger Zeitraum." };
  }

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const userId = userData.user.id;

  const win = calendarOverlapUtcWindowForYmdRange(fromYmd, toYmd);
  if (!win) return { ok: false, error: "Ungültiger Zeitraum." };

  let outlookChangedCount = 0;
  if (shouldPullOutlook(input.reason, Boolean(input.withOutlookPull))) {
    const { data: msTok } = await supabase
      .from("microsoft_oauth_tokens")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (msTok) {
      const months = enumerateYm(fromYmd, toYmd);
      for (const ym of months) {
        const res = await syncOutlookEventsForMonth(supabase, userId, ym);
        if (!res.ok) return { ok: false, error: res.error };
        outlookChangedCount += res.count;
      }
    }
  }

  const mode = input.mode;
  const changedSinceIso = input.changedSinceIso?.trim() || null;
  const useDelta = mode === "delta" && Boolean(changedSinceIso);

  let evQuery = supabase
    .from("calendar_events")
    .select(
      "id, title, description, start_time, end_time, is_all_day, source, area_id, outlook_event_id, outlook_recurrence_group_id, exclude_from_planner, outlook_sensitivity, outlook_is_recurring, updated_at",
    )
    .eq("user_id", userId)
    .lte("start_time", win.toIso)
    .gte("end_time", win.fromIso)
    .order("start_time", { ascending: true });
  if (useDelta) evQuery = evQuery.gt("updated_at", changedSinceIso as string);

  let taskQuery = supabase
    .from("tasks")
    .select("id, title, planned_date, status, estimated_minutes, updated_at, areas(name)")
    .eq("user_id", userId)
    .not("planned_date", "is", null)
    .gte("planned_date", fromYmd)
    .lte("planned_date", toYmd)
    .in("status", ["planned", "open"])
    .order("planned_date", { ascending: true })
    .order("title", { ascending: true });
  if (useDelta) taskQuery = taskQuery.gt("updated_at", changedSinceIso as string);

  const [evRes, taskRes] = await Promise.all([evQuery, taskQuery]);
  if (evRes.error) return { ok: false, error: evRes.error.message };
  if (taskRes.error) return { ok: false, error: taskRes.error.message };

  const events = (evRes.data ?? []) as SyncEventRow[];

  const plannedTasks: SyncTaskRow[] = [];
  for (const row of taskRes.data ?? []) {
    const r = row as Record<string, unknown>;
    const areas = r.areas as { name?: string } | { name?: string }[] | null;
    const areaName = Array.isArray(areas)
      ? areas[0]?.name
      : typeof areas === "object" && areas && "name" in areas
        ? String((areas as { name: string }).name)
        : "—";
    plannedTasks.push({
      id: String(r.id),
      title: String(r.title ?? ""),
      planned_date: String(r.planned_date ?? ""),
      status: String(r.status ?? ""),
      estimated_minutes: r.estimated_minutes == null ? null : Number(r.estimated_minutes),
      area_name: areaName ?? "—",
      updated_at: String(r.updated_at ?? ""),
    });
  }

  return {
    ok: true,
    mode: useDelta ? "delta" : "full",
    syncedAtIso: new Date().toISOString(),
    events,
    plannedTasks,
    outlookChangedCount,
  };
}

/**
 * Webhook-/Backend-Variante: synchronisiert Outlook-Daten ohne User-Session.
 * Nutzt den Service-Role-Client und bleibt bewusst auf Outlook-Pull fokussiert.
 */
export async function runCalendarWebhookSyncForUser(
  supabase: SupabaseClient,
  userId: string,
  input: Pick<SyncInput, "fromYmd" | "toYmd" | "reason">,
): Promise<{ ok: true; outlookChangedCount: number } | { ok: false; error: string }> {
  const fromYmd = input.fromYmd.trim();
  const toYmd = input.toYmd.trim();
  if (!isYmd(fromYmd) || !isYmd(toYmd) || fromYmd > toYmd) {
    return { ok: false, error: "Ungültiger Zeitraum." };
  }

  if (!shouldPullOutlook(input.reason, true)) {
    return { ok: true, outlookChangedCount: 0 };
  }

  const months = enumerateYm(fromYmd, toYmd);
  let outlookChangedCount = 0;
  for (const ym of months) {
    const res = await syncOutlookEventsForMonth(supabase, userId, ym);
    if (!res.ok) return { ok: false, error: res.error };
    outlookChangedCount += res.count;
  }
  return { ok: true, outlookChangedCount };
}

