"use client";

import { deleteCalendarEvent, updateCalendarEvent } from "@/app/(app)/kalender/actions";
import { useRouter } from "next/navigation";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { controlClass, textareaClass } from "@/components/ui/control-styles";
import type { CalendarEventFormPayload } from "@/lib/calendar/types";
import { formatBerlinYmdLongDe } from "@/lib/dashboard/berlin-date";
import type {
  CalendarEventBrief,
  TodayDashboardData,
  UpcomingCalendarEventBrief,
} from "@/lib/dashboard/fetch-today-dashboard";
import { cn } from "@/lib/cn";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

function capacityBarClass(level: TodayDashboardData["capacity"]["level"]): string {
  if (level === "green") return "bg-leif-success";
  if (level === "yellow") return "bg-leif-warning";
  return "bg-leif-error";
}

function formatEventTimeBrief(ev: CalendarEventBrief): string {
  if (ev.is_all_day) return "Ganztägig";
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  };
  const a = new Date(ev.start_time).toLocaleTimeString("de-DE", opts);
  const b = new Date(ev.end_time).toLocaleTimeString("de-DE", opts);
  return `${a}–${b}`;
}

function eventIsCurrent(ev: CalendarEventBrief): boolean {
  if (ev.is_all_day) return false;
  const now = Date.now();
  const start = new Date(ev.start_time).getTime();
  const end = new Date(ev.end_time).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false;
  return now >= start && now < end;
}

function formatUpcomingWeekday(dayYmd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayYmd.trim());
  if (!m) return "—";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const inst = new Date(Date.UTC(y, mo - 1, d, 12));
  return inst
    .toLocaleDateString("de-DE", { weekday: "short", timeZone: "Europe/Berlin" })
    .replace(/\.$/, "");
}

function formatUpcomingTime(ev: UpcomingCalendarEventBrief): string {
  if (ev.is_all_day) return "Ganzt.";
  return new Date(ev.start_time).toLocaleTimeString("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function localDateFromDate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function localDatetimeLocalFromDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props = {
  data: TodayDashboardData;
};

export function DashboardContextSidebar({ data }: Props) {
  const router = useRouter();
  const eventDialogRef = useRef<HTMLDialogElement>(null);
  const eventFormId = useId();
  const { capacity, errors, todayYmd, events, upcomingEvents } = data;
  const pct = Math.min(100, Math.round(capacity.ratio * 100));
  const [editingEvent, setEditingEvent] = useState<CalendarEventBrief | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventDayDate, setEventDayDate] = useState("");
  const [eventStartLocal, setEventStartLocal] = useState("");
  const [eventEndLocal, setEventEndLocal] = useState("");
  const [eventPending, setEventPending] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);

  useEffect(() => {
    const el = eventDialogRef.current;
    if (!el) return;
    if (editingEvent) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [editingEvent]);

  function openEventEdit(ev: CalendarEventBrief) {
    setEditingEvent(ev);
    setEventTitle(ev.title);
    setEventDescription(ev.description ?? "");
    setEventAllDay(ev.is_all_day);
    if (ev.is_all_day) {
      setEventDayDate(localDateFromDate(new Date(ev.start_time)));
    } else {
      setEventStartLocal(localDatetimeLocalFromDate(new Date(ev.start_time)));
      setEventEndLocal(localDatetimeLocalFromDate(new Date(ev.end_time)));
    }
    setEventError(null);
  }

  function closeEventEdit() {
    setEditingEvent(null);
    setEventError(null);
  }

  function buildEventPayload():
    | { ok: true; payload: CalendarEventFormPayload }
    | { ok: false; error: string } {
    if (eventAllDay) {
      if (!eventDayDate) return { ok: false, error: "Datum wählen." };
      const [Y, M, D] = eventDayDate.split("-").map(Number);
      const start = new Date(Y, M - 1, D, 0, 0, 0, 0);
      const end = new Date(Y, M - 1, D, 23, 59, 59, 999);
      return {
        ok: true,
        payload: {
          title: eventTitle,
          description: eventDescription,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          is_all_day: true,
        },
      };
    }
    const s = new Date(eventStartLocal);
    const e = new Date(eventEndLocal);
    if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime())) {
      return { ok: false, error: "Start und Ende gültig ausfüllen." };
    }
    return {
      ok: true,
      payload: {
        title: eventTitle,
        description: eventDescription,
        start_time: s.toISOString(),
        end_time: e.toISOString(),
        is_all_day: false,
      },
    };
  }

  async function onEventSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingEvent) return;
    setEventError(null);
    const built = buildEventPayload();
    if (!built.ok) {
      setEventError(built.error);
      return;
    }
    setEventPending(true);
    try {
      const res = await updateCalendarEvent(editingEvent.id, built.payload);
      if (!res.ok) {
        setEventError(res.error);
        return;
      }
      closeEventEdit();
      router.refresh();
    } finally {
      setEventPending(false);
    }
  }

  async function onEventDelete() {
    if (!editingEvent) return;
    if (!window.confirm("Termin wirklich löschen?")) return;
    setEventPending(true);
    try {
      const res = await deleteCalendarEvent(editingEvent.id);
      if (!res.ok) {
        setEventError(res.error);
        return;
      }
      closeEventEdit();
      router.refresh();
    } finally {
      setEventPending(false);
    }
  }

  const upcomingByDay = upcomingEvents.reduce(
    (acc, ev) => {
      const prev = acc[ev.dayYmd];
      if (prev) {
        prev.push(ev);
      } else {
        acc[ev.dayYmd] = [ev];
      }
      return acc;
    },
    {} as Record<string, UpcomingCalendarEventBrief[]>,
  );

  return (
    <aside
      className="space-y-5 text-[14px] text-leif-secondary lg:sticky lg:top-8 lg:self-start"
      aria-label="Kontext: Heute"
    >
      <section className="rounded-xl border border-leif-border/28 bg-leif-surface-soft p-3.5 shadow-[0_3px_12px_rgba(15,23,42,0.07)]">
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-leif-muted">Heute</h2>
        <div
          className="mt-1 space-y-1"
          aria-label={`Belegte Zeit heute: ${capacity.usedMinutes} Minuten, ${pct} Prozent des Tageskontingents`}
        >
          <p className="text-[11px] tabular-nums leading-none text-leif-secondary">
            {capacity.usedMinutes} Min <span className="text-leif-muted">·</span> {pct}%
          </p>
          <div className="h-1 overflow-hidden rounded-full bg-leif-divider">
            <div
              className={cn(
                "h-full max-w-full rounded-full opacity-65 transition-[width] duration-200",
                capacityBarClass(capacity.level),
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <p className="mt-2 text-[11px] leading-snug text-leif-muted">{formatBerlinYmdLongDe(todayYmd)}</p>

        {events.length > 0 && (
          <ul
            className="mt-2.5 space-y-2.5 border-l border-leif-border/20 pl-2"
            aria-label="Termine heute"
          >
            {events.map((ev) => {
              const current = eventIsCurrent(ev);
              return (
                <li key={ev.id}>
                  <button
                    type="button"
                    onClick={() => openEventEdit(ev)}
                    className={cn(
                      "grid w-full cursor-pointer grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-x-2 rounded-sm py-0.5 text-left transition-colors hover:bg-leif-canvas/70 hover:-mx-0.5 hover:px-0.5",
                      current && "bg-white -mx-0.5 px-0.5",
                    )}
                  >
                    <span
                      className="w-[5.5rem] truncate text-left text-[10px] font-medium tabular-nums leading-snug text-leif-secondary"
                      title={formatEventTimeBrief(ev)}
                    >
                      {formatEventTimeBrief(ev)}
                    </span>
                    <span className="min-w-0 break-words text-left text-[14px] font-medium leading-snug tracking-tight text-leif-text">
                      {ev.title || "Ohne Titel"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {!errors.events && upcomingEvents.length > 0 ? (
          <div className="mt-3.5 border-t border-leif-border/25 pt-3">
            <h3 className="text-[11px] font-medium uppercase tracking-wide text-leif-muted/75">
              Kommende Termine
            </h3>
            <div className="mt-2 space-y-4 border-l border-leif-border/15 pl-2" aria-label="Termine in den nächsten Tagen">
              {Object.entries(upcomingByDay).map(([dayYmd, dayEvents]) => (
                <div key={dayYmd} className="space-y-1">
                  <p className="text-[9px] font-medium uppercase tracking-wide text-leif-muted/72">
                    {formatUpcomingWeekday(dayYmd)}
                  </p>
                  <ul className="space-y-1">
                    {dayEvents.map((ev) => (
                      <li key={ev.id}>
                        <button
                          type="button"
                          onClick={() => openEventEdit(ev)}
                          className="grid w-full cursor-pointer grid-cols-[minmax(4rem,5rem)_minmax(0,1fr)] items-baseline gap-x-2 rounded-sm py-0.5 text-left transition-colors hover:bg-leif-canvas/65"
                        >
                          <span
                            className="w-[5rem] truncate text-left text-[9px] font-medium tabular-nums leading-snug text-leif-secondary/90"
                            title={formatUpcomingTime(ev)}
                          >
                            {formatUpcomingTime(ev)}
                          </span>
                          <span className="min-w-0 break-words text-left text-[13px] font-normal leading-snug text-leif-secondary">
                            {ev.title || "Ohne Titel"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {(errors.events || errors.tasks) && (
          <AlertBanner variant="warning" className="mt-3 py-2 text-[11px]">
            {errors.events ? `Termine: ${errors.events} ` : ""}
            {errors.tasks ? `Tasks: ${errors.tasks}` : ""}
          </AlertBanner>
        )}
      </section>

      <dialog
        ref={eventDialogRef}
        className="w-[min(100vw-2rem,32rem)] max-h-[min(90vh,40rem)] overflow-hidden rounded-[12px] border border-leif-border bg-leif-surface p-0 text-leif-text shadow-leif [&::backdrop]:bg-black/25"
        onClose={closeEventEdit}
      >
        {editingEvent ? (
          <div className="flex max-h-[min(90vh,40rem)] flex-col">
            <header className="border-b border-leif-divider px-6 py-4">
              <h3 className="text-base font-semibold text-leif-text">Termin bearbeiten</h3>
            </header>
            <form id={eventFormId} onSubmit={onEventSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
              {eventError ? <AlertBanner variant="error">{eventError}</AlertBanner> : null}
              <label className="block text-sm font-medium text-leif-secondary">
                Titel
                <input
                  name="title"
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className={`${controlClass} mt-2`}
                />
              </label>
              <label className="block text-sm font-medium text-leif-secondary">
                Beschreibung
                <textarea
                  name="description"
                  rows={3}
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className={`${textareaClass} mt-2`}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-leif-text">
                <input
                  type="checkbox"
                  checked={eventAllDay}
                  onChange={(e) => setEventAllDay(e.target.checked)}
                  className="rounded border-leif-border text-leif-primary"
                />
                Ganztägig
              </label>
              {eventAllDay ? (
                <label className="block text-sm font-medium text-leif-secondary">
                  Datum
                  <input
                    type="date"
                    value={eventDayDate}
                    onChange={(e) => setEventDayDate(e.target.value)}
                    className={`${controlClass} mt-2`}
                  />
                </label>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-leif-secondary">
                    Start
                    <input
                      type="datetime-local"
                      value={eventStartLocal}
                      onChange={(e) => setEventStartLocal(e.target.value)}
                      className={`${controlClass} mt-2`}
                    />
                  </label>
                  <label className="block text-sm font-medium text-leif-secondary">
                    Ende
                    <input
                      type="datetime-local"
                      value={eventEndLocal}
                      onChange={(e) => setEventEndLocal(e.target.value)}
                      className={`${controlClass} mt-2`}
                    />
                  </label>
                </div>
              )}
            </form>
            <footer className="flex items-center justify-between gap-2 border-t border-leif-divider px-6 py-4">
              <Button type="button" variant="danger" disabled={eventPending} onClick={() => void onEventDelete()}>
                Löschen
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" onClick={closeEventEdit}>
                  Schließen
                </Button>
                <Button type="submit" form={eventFormId} variant="primary" disabled={eventPending}>
                  {eventPending ? "Speichern…" : "Speichern"}
                </Button>
              </div>
            </footer>
          </div>
        ) : null}
      </dialog>
    </aside>
  );
}
