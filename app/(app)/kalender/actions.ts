"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEventFormPayload } from "@/lib/calendar/types";
import {
  graphCreateEvent,
  graphDeleteEvent,
  graphUpdateEvent,
} from "@/lib/microsoft/graph-events";
import { syncOutlookEventsForMonth } from "@/lib/microsoft/outlook-sync";
import { getValidMicrosoftAccessToken } from "@/lib/microsoft/tokens";

function revalidate() {
  revalidatePath("/kalender");
  revalidatePath("/dashboard");
  revalidatePath("/planer");
}

function validatePayload(p: CalendarEventFormPayload): string | null {
  if (!p.title.trim()) return "Titel ist Pflichtfeld.";
  const s = new Date(p.start_time).getTime();
  const e = new Date(p.end_time).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e)) return "Ungültige Zeitangaben.";
  if (e <= s) return "Ende muss nach dem Start liegen.";
  return null;
}

export async function createCalendarEvent(
  payload: CalendarEventFormPayload,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const err = validatePayload(payload);
  if (err) return { ok: false, error: err };

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const userId = userData.user.id;

  let outlookEventId: string | null = null;
  let source: "leifos" | "outlook" = "leifos";

  if (payload.writeToOutlook) {
    const token = await getValidMicrosoftAccessToken(supabase, userId);
    if ("error" in token) return { ok: false, error: token.error };
    try {
      outlookEventId = await graphCreateEvent(token.accessToken, payload);
      source = "outlook";
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Outlook konnte den Termin nicht anlegen.";
      return { ok: false, error: msg };
    }
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      user_id: userId,
      title: payload.title.trim(),
      description: payload.description.trim() || null,
      location: payload.location?.trim() || null,
      is_private: Boolean(payload.is_private),
      start_time: payload.start_time,
      end_time: payload.end_time,
      is_all_day: payload.is_all_day,
      source,
      outlook_event_id: outlookEventId,
      outlook_recurrence_group_id: outlookEventId ?? null,
      exclude_from_planner: false,
      outlook_sensitivity: null,
      outlook_is_recurring: false,
    })
    .select("id")
    .single();

  if (error) {
    if (outlookEventId) {
      const token = await getValidMicrosoftAccessToken(supabase, userId);
      if ("accessToken" in token) {
        try {
          await graphDeleteEvent(token.accessToken, outlookEventId);
        } catch {
          /* Rollback best effort */
        }
      }
    }
    return { ok: false, error: error.message };
  }
  revalidate();
  return { ok: true, id: data.id as string };
}

export async function updateCalendarEvent(
  id: string,
  payload: CalendarEventFormPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const err = validatePayload(payload);
  if (err) return { ok: false, error: err };

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const userId = userData.user.id;

  const { data: row, error: loadErr } = await supabase
    .from("calendar_events")
    .select("outlook_event_id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (loadErr) return { ok: false, error: loadErr.message };
  const outlookId = (row as { outlook_event_id: string | null } | null)?.outlook_event_id ?? null;

  if (outlookId) {
    const token = await getValidMicrosoftAccessToken(supabase, userId);
    if ("error" in token) return { ok: false, error: token.error };
    try {
      await graphUpdateEvent(token.accessToken, outlookId, payload);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Outlook-Synchronisation fehlgeschlagen.";
      return { ok: false, error: msg };
    }
  }

  const { error } = await supabase
    .from("calendar_events")
    .update({
      title: payload.title.trim(),
      description: payload.description.trim() || null,
      location: payload.location?.trim() || null,
      is_private: Boolean(payload.is_private),
      start_time: payload.start_time,
      end_time: payload.end_time,
      is_all_day: payload.is_all_day,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function deleteCalendarEvent(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };
  const userId = userData.user.id;

  const { data: row, error: loadErr } = await supabase
    .from("calendar_events")
    .select("outlook_event_id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (loadErr) return { ok: false, error: loadErr.message };
  const outlookId = (row as { outlook_event_id: string | null } | null)?.outlook_event_id ?? null;

  if (outlookId) {
    const token = await getValidMicrosoftAccessToken(supabase, userId);
    if ("error" in token) return { ok: false, error: token.error };
    try {
      await graphDeleteEvent(token.accessToken, outlookId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Outlook konnte den Termin nicht löschen.";
      return { ok: false, error: msg };
    }
  }

  const { error } = await supabase.from("calendar_events").delete().eq("id", id).eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function syncOutlookCalendarMonth(
  ym: string,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (!/^\d{4}-\d{2}$/.test(ym.trim())) return { ok: false, error: "Ungültiger Monat." };

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const res = await syncOutlookEventsForMonth(supabase, userData.user.id, ym.trim());
  if (!res.ok) return res;
  revalidate();
  return res;
}

export async function updatePlannedTaskFromCalendar(
  taskId: string,
  plannedDate: string,
  estimatedMinutes: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const day = String(plannedDate ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { ok: false, error: "Ungültiges Datum." };
  const duration = Math.max(15, Math.round(Number(estimatedMinutes) || 0));
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("tasks")
    .update({
      planned_date: day,
      estimated_minutes: duration,
      status: "planned",
      completed_at: null,
    })
    .eq("id", taskId)
    .eq("user_id", userData.user.id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}
