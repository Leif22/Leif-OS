"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  syncOutlookCalendarMonth,
  updateCalendarEvent,
} from "@/app/(app)/kalender/actions";
import {
  runCalendarHybridSync,
  type CalendarSyncMode,
  type CalendarSyncReason,
} from "@/app/(app)/kalender/sync-actions";
import { addBerlinCalendarDays } from "@/lib/calendar/berlin-ymd";
import { eventTouchesBerlinYmdRange } from "@/lib/calendar/fetch-range";
import type { CalendarEventRow, KalenderView, PlannedTaskCalendarRow } from "@/lib/calendar/types";
import {
  computeTodayCapacity,
  type CalendarEventBrief,
  type TodayCapacity,
  type TodayPlannedTaskBrief,
} from "@/lib/dashboard/fetch-today-dashboard";
import { timestampToBerlinYmd } from "@/lib/dashboard/berlin-date";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/control-styles";
import { PageHeader } from "@/components/ui/page-header";
import { PRODUCT_COPY, PRODUCT_LABEL } from "@/lib/product-labels";
import { RefreshCw } from "lucide-react";

type OutlookFlash = { kind: "error" | "success"; message: string };

type Props = {
  view: KalenderView;
  monthYm: string;
  anchorD: string;
  rangeFrom: string;
  rangeTo: string;
  outlookSyncYm: string;
  events: CalendarEventRow[];
  plannedTasks: PlannedTaskCalendarRow[];
  loadError: string | null;
  outlookLinked: boolean;
  outlookFlash: OutlookFlash | null;
};

function shiftYm(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const u = Date.UTC(y, m - 1 + delta, 1);
  const d = new Date(u);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthTitleDe(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
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

function formatEventWhen(ev: CalendarEventRow): string {
  if (ev.is_all_day) {
    const s = timestampToBerlinYmd(ev.start_time);
    const e = timestampToBerlinYmd(ev.end_time);
    return s === e ? s : `${s} – ${e}`;
  }
  const s = new Date(ev.start_time);
  const e = new Date(ev.end_time);
  const o: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  };
  return `${s.toLocaleString("de-DE", o)} – ${e.toLocaleString("de-DE", o)}`;
}

function formatDayHeadingBerlin(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const inst = new Date(Date.UTC(y, m - 1, d, 12));
  return inst.toLocaleDateString("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatWeekdayShortBerlin(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const inst = new Date(Date.UTC(y, m - 1, d, 12));
  return inst.toLocaleDateString("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "numeric",
    month: "numeric",
  });
}

function enumerateBerlinDaysInclusive(fromYmd: string, toYmd: string): string[] {
  const out: string[] = [];
  let cur = fromYmd;
  while (true) {
    out.push(cur);
    if (cur >= toYmd) break;
    cur = addBerlinCalendarDays(cur, 1);
  }
  return out;
}

function eventToBrief(ev: CalendarEventRow): CalendarEventBrief {
  return {
    id: ev.id,
    title: ev.title,
    description: ev.description,
    start_time: ev.start_time,
    end_time: ev.end_time,
    is_all_day: ev.is_all_day,
  };
}

function taskToBrief(t: PlannedTaskCalendarRow): TodayPlannedTaskBrief {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    estimated_minutes: t.estimated_minutes,
    area_name: t.area_name,
  };
}

function eventsForBerlinDay(events: CalendarEventRow[], ymd: string): CalendarEventRow[] {
  return events.filter((e) => eventTouchesBerlinYmdRange(e, ymd, ymd));
}

function tasksForBerlinDay(tasks: PlannedTaskCalendarRow[], ymd: string): PlannedTaskCalendarRow[] {
  return tasks.filter((t) => t.planned_date === ymd);
}

function dayCapacity(ymd: string, events: CalendarEventRow[], tasks: PlannedTaskCalendarRow[]): TodayCapacity {
  const evBriefs = eventsForBerlinDay(events, ymd).map(eventToBrief);
  const taskBriefs = tasksForBerlinDay(tasks, ymd).map(taskToBrief);
  return computeTodayCapacity(evBriefs, taskBriefs);
}

function viewTabClass(active: boolean): string {
  return active
    ? "rounded-[8px] bg-leif-primary px-3 py-1.5 text-sm font-medium text-white shadow-leif"
    : "rounded-[8px] border border-leif-border bg-leif-surface px-3 py-1.5 text-sm font-medium text-leif-secondary transition-colors hover:bg-leif-divider/50";
}

function DayCapacityBar({ capacity }: { capacity: TodayCapacity }) {
  const pct = Math.min(100, Math.round(capacity.ratio * 100));
  const color =
    capacity.level === "green"
      ? "bg-leif-primary"
      : capacity.level === "yellow"
        ? "bg-leif-warning"
        : "bg-leif-error";
  const usedH = (capacity.usedMinutes / 60).toFixed(1).replace(".0", "");
  const budgetH = (capacity.budgetMinutes / 60).toFixed(0);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-leif-muted">
        <span>Kapazität (8 h Ziel)</span>
        <span>
          {usedH} h / {budgetH} h
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-leif-divider">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function KalenderPageClient({
  view,
  monthYm,
  anchorD,
  rangeFrom,
  rangeTo,
  outlookSyncYm,
  events,
  plannedTasks,
  loadError,
  outlookLinked,
  outlookFlash,
}: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formId = useId();
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<CalendarEventRow | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [dayDate, setDayDate] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [writeToOutlook, setWriteToOutlook] = useState(outlookLinked);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncStatusText, setSyncStatusText] = useState<string | null>(null);
  const lastSyncIsoRef = useRef<string | null>(null);
  const syncBusyRef = useRef(false);
  const lastInteractionMsRef = useRef(Date.now());

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (modalOpen) {
      if (!el.open) el.showModal();
    } else if (el.open) el.close();
  }, [modalOpen]);

  async function runHybridSync(reason: CalendarSyncReason, mode: CalendarSyncMode) {
    if (syncBusyRef.current) return;
    syncBusyRef.current = true;
    setSyncStatusText("Kalender wird aktualisiert …");
    try {
      const res = await runCalendarHybridSync({
        fromYmd: rangeFrom,
        toYmd: rangeTo,
        reason,
        mode,
        changedSinceIso: lastSyncIsoRef.current,
      });
      if (!res.ok) {
        setSyncStatusText(`Sync-Problem: ${res.error}`);
        return;
      }
      lastSyncIsoRef.current = res.syncedAtIso;
      if (res.events.length > 0 || res.plannedTasks.length > 0 || res.outlookChangedCount > 0) {
        router.refresh();
      } else {
        setSyncStatusText(null);
      }
    } finally {
      syncBusyRef.current = false;
    }
  }

  useEffect(() => {
    lastSyncIsoRef.current = null;
    void runHybridSync("initial", "full");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeFrom, rangeTo]);

  useEffect(() => {
    const markActive = () => {
      lastInteractionMsRef.current = Date.now();
    };
    const onFocus = () => void runHybridSync("focus", "delta");
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const idleMs = Date.now() - lastInteractionMsRef.current;
      void runHybridSync(idleMs > 4 * 60_000 ? "resume" : "focus", "delta");
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointerdown", markActive, { passive: true });
    window.addEventListener("keydown", markActive);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointerdown", markActive);
      window.removeEventListener("keydown", markActive);
    };
  }, [rangeFrom, rangeTo]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const idleMs = Date.now() - lastInteractionMsRef.current;
      const reason: CalendarSyncReason = idleMs <= 90_000 ? "interval-active" : "interval-idle";
      void runHybridSync(reason, "delta");
    }, 60_000);
    return () => window.clearInterval(id);
  }, [rangeFrom, rangeTo]);

  function openCreate() {
    setDialogMode("create");
    setEditing(null);
    setWriteToOutlook(outlookLinked);
    setTitle("");
    setDescription("");
    setIsAllDay(false);
    const now = new Date();
    const start = new Date(now);
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    setStartLocal(localDatetimeLocalFromDate(start));
    setEndLocal(localDatetimeLocalFromDate(end));
    setDayDate(localDateFromDate(now));
    setError(null);
    setModalOpen(true);
  }

  function openEdit(ev: CalendarEventRow) {
    setDialogMode("edit");
    setEditing(ev);
    setTitle(ev.title);
    setDescription(ev.description ?? "");
    setIsAllDay(ev.is_all_day);
    if (ev.is_all_day) {
      setDayDate(localDateFromDate(new Date(ev.start_time)));
    } else {
      setStartLocal(localDatetimeLocalFromDate(new Date(ev.start_time)));
      setEndLocal(localDatetimeLocalFromDate(new Date(ev.end_time)));
    }
    setError(null);
    setModalOpen(true);
  }

  function closeDialog() {
    setModalOpen(false);
    setEditing(null);
    setDialogMode("create");
    setError(null);
  }

  function buildPayload(): { ok: true; payload: import("@/lib/calendar/types").CalendarEventFormPayload } | { ok: false; error: string } {
    const writeFlag = dialogMode === "create" && outlookLinked && writeToOutlook;
    if (isAllDay) {
      if (!dayDate) return { ok: false, error: "Datum wählen." };
      const [Y, M, D] = dayDate.split("-").map(Number);
      const start = new Date(Y, M - 1, D, 0, 0, 0, 0);
      const end = new Date(Y, M - 1, D, 23, 59, 59, 999);
      return {
        ok: true,
        payload: {
          title,
          description,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          is_all_day: true,
          ...(writeFlag ? { writeToOutlook: true } : {}),
        },
      };
    }
    const s = new Date(startLocal);
    const e = new Date(endLocal);
    if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime())) {
      return { ok: false, error: "Start und Ende gültig ausfüllen." };
    }
    return {
      ok: true,
      payload: {
        title,
        description,
        start_time: s.toISOString(),
        end_time: e.toISOString(),
        is_all_day: false,
        ...(writeFlag ? { writeToOutlook: true } : {}),
      },
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const built = buildPayload();
    if (!built.ok) {
      setError(built.error);
      return;
    }
    setPending(true);
    try {
      if (dialogMode === "create") {
        const res = await createCalendarEvent(built.payload);
        if (!res.ok) {
          setError(res.error);
          return;
        }
      } else if (editing) {
        const res = await updateCalendarEvent(editing.id, built.payload);
        if (!res.ok) {
          setError(res.error);
          return;
        }
      }
      closeDialog();
      void runHybridSync("write-confirmation", "delta");
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!editing) return;
    if (!window.confirm("Termin wirklich löschen?")) return;
    setPending(true);
    try {
      const res = await deleteCalendarEvent(editing.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      closeDialog();
      void runHybridSync("write-confirmation", "delta");
    } finally {
      setPending(false);
    }
  }

  async function onSyncOutlook() {
    setSyncBusy(true);
    setSyncMessage(null);
    try {
      const res = await syncOutlookCalendarMonth(outlookSyncYm);
      if (!res.ok) {
        setSyncMessage(res.error);
        return;
      }
      setSyncMessage(
        res.count === 0
          ? "Keine Outlook-Termine für diesen Monat gefunden (oder bereits synchron)."
          : `${res.count} Outlook-Termin(e) für diesen Monat übernommen bzw. aktualisiert.`,
      );
      void runHybridSync("manual", "full");
    } finally {
      setSyncBusy(false);
    }
  }

  if (loadError) {
    return <AlertBanner variant="error">Kalender konnte nicht geladen werden: {loadError}</AlertBanner>;
  }

  const weekDays = view === "week" ? enumerateBerlinDaysInclusive(rangeFrom, rangeTo) : [];
  const dayCap = view === "day" ? dayCapacity(anchorD, events, plannedTasks) : null;

  return (
    <div className="space-y-6">
      {outlookFlash ? (
        <AlertBanner variant={outlookFlash.kind === "error" ? "error" : "success"}>
          {outlookFlash.message}
        </AlertBanner>
      ) : null}

      <PageHeader
        title={PRODUCT_LABEL.kalender}
        description="Monats-, Wochen- und Tagesansicht (Europe/Berlin). Mit Outlook verbunden kannst du neue Termine in Exchange/Microsoft 365 schreiben und Outlook-Termine synchronisieren."
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={!outlookLinked || syncBusy} onClick={() => void onSyncOutlook()} title={outlookLinked ? "Kalender aktualisieren (Outlook)" : "Outlook in Einstellungen verbinden"}>
              <RefreshCw className={`size-4 ${syncBusy ? "animate-spin" : ""}`} aria-hidden />
            </Button>
            <Button type="button" onClick={() => openCreate()}>
              Termin anlegen
            </Button>
          </div>
        }
      />

      {syncMessage ? (
        <p className="rounded-md border border-leif-border bg-leif-divider/60 px-3 py-2 text-sm text-leif-text">
          {syncMessage}
        </p>
      ) : null}
      {syncStatusText ? (
        <p className="rounded-md border border-leif-border bg-leif-divider/60 px-3 py-2 text-xs text-leif-secondary">
          {syncStatusText}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link href={`/kalender?m=${encodeURIComponent(monthYm)}`} className={viewTabClass(view === "month")}>
          Monat
        </Link>
        <Link
          href={`/kalender?v=week&d=${encodeURIComponent(anchorD)}`}
          className={viewTabClass(view === "week")}
        >
          Woche
        </Link>
        <Link
          href={`/kalender?v=day&d=${encodeURIComponent(anchorD)}`}
          className={viewTabClass(view === "day")}
        >
          Tag
        </Link>
      </div>

      {view === "month" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-leif-border pb-3">
          <Link
            href={`/kalender?m=${encodeURIComponent(shiftYm(monthYm, -1))}`}
            className="rounded-md border border-leif-border px-3 py-1.5 text-sm hover:bg-leif-divider/60"
          >
            ← {monthTitleDe(shiftYm(monthYm, -1))}
          </Link>
          <h2 className="text-lg font-semibold capitalize">{monthTitleDe(monthYm)}</h2>
          <Link
            href={`/kalender?m=${encodeURIComponent(shiftYm(monthYm, 1))}`}
            className="rounded-md border border-leif-border px-3 py-1.5 text-sm hover:bg-leif-divider/60"
          >
            {monthTitleDe(shiftYm(monthYm, 1))} →
          </Link>
        </div>
      ) : null}

      {view === "week" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-leif-border pb-3">
          <Link
            href={`/kalender?v=week&d=${encodeURIComponent(addBerlinCalendarDays(anchorD, -7))}`}
            className="rounded-md border border-leif-border px-3 py-1.5 text-sm hover:bg-leif-divider/60"
          >
            ← Vorherige Woche
          </Link>
          <h2 className="text-center text-lg font-semibold">
            {formatWeekdayShortBerlin(rangeFrom)} – {formatWeekdayShortBerlin(rangeTo)}
          </h2>
          <Link
            href={`/kalender?v=week&d=${encodeURIComponent(addBerlinCalendarDays(anchorD, 7))}`}
            className="rounded-md border border-leif-border px-3 py-1.5 text-sm hover:bg-leif-divider/60"
          >
            Nächste Woche →
          </Link>
        </div>
      ) : null}

      {view === "day" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-leif-border pb-3">
          <Link
            href={`/kalender?v=day&d=${encodeURIComponent(addBerlinCalendarDays(anchorD, -1))}`}
            className="rounded-md border border-leif-border px-3 py-1.5 text-sm hover:bg-leif-divider/60"
          >
            ← Vorheriger Tag
          </Link>
          <h2 className="text-center text-lg font-semibold">{formatDayHeadingBerlin(anchorD)}</h2>
          <Link
            href={`/kalender?v=day&d=${encodeURIComponent(addBerlinCalendarDays(anchorD, 1))}`}
            className="rounded-md border border-leif-border px-3 py-1.5 text-sm hover:bg-leif-divider/60"
          >
            Nächster Tag →
          </Link>
        </div>
      ) : null}

      {view === "month" ? (
        <>
          <div className="overflow-x-auto rounded-[12px] border border-leif-border">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-leif-border bg-leif-divider/60">
                  <th className="px-3 py-2 font-medium">Zeit</th>
                  <th className="px-3 py-2 font-medium">Titel</th>
                  <th className="px-3 py-2 font-medium">Quelle</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-leif-muted">
                      Keine Termine in diesem Monat.
                    </td>
                  </tr>
                ) : (
                  events.map((ev) => (
                    <tr
                      key={ev.id}
                      className="cursor-pointer border-b border-leif-divider hover:bg-leif-divider/60"
                      onClick={() => openEdit(ev)}
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-leif-secondary">
                        {formatEventWhen(ev)}
                      </td>
                      <td className="px-3 py-2 font-medium text-leif-text">{ev.title}</td>
                      <td className="px-3 py-2 text-xs text-leif-muted">
                        {ev.source === "outlook" ? "Outlook" : "Leif OS"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <section className="space-y-2">
            <h3 className="text-base font-semibold tracking-tight">Geplante Tasks im Monat</h3>
            {plannedTasks.length === 0 ? (
              <p className="text-sm text-leif-muted">Keine Tasks mit geplantem Tag in diesem Monat.</p>
            ) : (
              <div className="overflow-x-auto rounded-[12px] border border-leif-border">
                <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-leif-border bg-leif-divider/60">
                      <th className="px-3 py-2 font-medium">Tag</th>
                      <th className="px-3 py-2 font-medium">Task</th>
                      <th className="px-3 py-2 font-medium">{PRODUCT_COPY.kalenderTableArea}</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plannedTasks.map((t) => (
                      <tr key={t.id} className="border-b border-leif-divider">
                        <td className="whitespace-nowrap px-3 py-2 text-leif-secondary">
                          {t.planned_date}
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            href={`/tasks?task=${encodeURIComponent(t.id)}`}
                            className="font-medium text-leif-text underline-offset-2 hover:underline"
                          >
                            {t.title}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-leif-secondary">{t.area_name}</td>
                        <td className="px-3 py-2 text-leif-secondary">{t.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}

      {view === "week" ? (
        <div className="grid gap-3 md:grid-cols-7">
          {weekDays.map((ymd) => {
            const cap = dayCapacity(ymd, events, plannedTasks);
            const dayEvents = eventsForBerlinDay(events, ymd);
            const dayTasks = tasksForBerlinDay(plannedTasks, ymd);
            return (
              <div
                key={ymd}
                className="flex min-h-[10rem] flex-col gap-2 rounded-[12px] border border-leif-border p-2"
              >
                <div className="border-b border-leif-divider pb-1 text-sm font-semibold capitalize">
                  {formatWeekdayShortBerlin(ymd)}
                </div>
                <DayCapacityBar capacity={cap} />
                <ul className="flex-1 space-y-1.5 text-xs">
                  {dayEvents.map((ev) => (
                    <li key={ev.id}>
                      <button
                        type="button"
                        onClick={() => openEdit(ev)}
                        className="w-full rounded border border-leif-border bg-leif-divider/60 px-1.5 py-1 text-left hover:bg-leif-divider"
                      >
                        <span className="block font-medium text-leif-text">{ev.title}</span>
                        <span className="text-leif-muted">{formatEventWhen(ev)}</span>
                      </button>
                    </li>
                  ))}
                  {dayTasks.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/tasks?task=${encodeURIComponent(t.id)}`}
                        className="block rounded border border-leif-primary/30 bg-leif-primary-soft px-1.5 py-1 text-left hover:bg-leif-primary-soft"
                      >
                        <span className="font-medium text-leif-primary-hover">Task</span>
                        <span className="block text-leif-text">{t.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}

      {view === "day" && dayCap ? (
        <div className="space-y-4">
          <DayCapacityBar capacity={dayCap} />
          <div className="overflow-x-auto rounded-[12px] border border-leif-border">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-leif-border bg-leif-divider/60">
                  <th className="px-3 py-2 font-medium">Zeit</th>
                  <th className="px-3 py-2 font-medium">Termin</th>
                  <th className="px-3 py-2 font-medium">Quelle</th>
                </tr>
              </thead>
              <tbody>
                {eventsForBerlinDay(events, anchorD).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-leif-muted">
                      Keine Termine an diesem Tag.
                    </td>
                  </tr>
                ) : (
                  eventsForBerlinDay(events, anchorD).map((ev) => (
                    <tr
                      key={ev.id}
                      className="cursor-pointer border-b border-leif-divider hover:bg-leif-divider/60"
                      onClick={() => openEdit(ev)}
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-leif-secondary">
                        {formatEventWhen(ev)}
                      </td>
                      <td className="px-3 py-2 font-medium text-leif-text">{ev.title}</td>
                      <td className="px-3 py-2 text-xs text-leif-muted">
                        {ev.source === "outlook" ? "Outlook" : "Leif OS"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <section className="space-y-2">
            <h3 className="text-base font-semibold tracking-tight">Geplante Tasks</h3>
            {tasksForBerlinDay(plannedTasks, anchorD).length === 0 ? (
              <p className="text-sm text-leif-muted">Keine Tasks für diesen Tag geplant.</p>
            ) : (
              <ul className="divide-y divide-leif-divider rounded-[12px] border border-leif-border">
                {tasksForBerlinDay(plannedTasks, anchorD).map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <Link
                      href={`/tasks?task=${encodeURIComponent(t.id)}`}
                      className="font-medium text-leif-text underline-offset-2 hover:underline"
                    >
                      {t.title}
                    </Link>
                    <span className="text-xs text-leif-muted">
                      {t.area_name} · {t.status}
                      {t.estimated_minutes != null ? ` · ${t.estimated_minutes} min` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        className="w-[min(32rem,calc(100vw-2rem))] rounded-[12px] border border-leif-border bg-leif-surface p-0 text-leif-text shadow-leif [&::backdrop]:bg-black/25"
        onClose={closeDialog}
      >
        <form id={formId} onSubmit={onSubmit} className="space-y-4 p-5">
          <h3 className="text-lg font-semibold">
            {dialogMode === "create" ? "Termin anlegen" : "Termin bearbeiten"}
          </h3>

          {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

          {dialogMode === "edit" && editing?.outlook_event_id ? (
            <p className="text-xs text-leif-muted">
              Dieser Termin ist mit Outlook verknüpft. Speichern oder Löschen wirkt auch in deinem
              Outlook-Kalender.
            </p>
          ) : null}

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-leif-secondary">Titel</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={controlClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-leif-secondary">Beschreibung</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`${controlClass} h-auto min-h-[5rem] resize-y py-2.5`}
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
            />
            Ganztägig
          </label>

          {dialogMode === "create" && outlookLinked ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={writeToOutlook}
                onChange={(e) => setWriteToOutlook(e.target.checked)}
              />
              Im Outlook-Kalender speichern (Microsoft 365 / Exchange)
            </label>
          ) : null}

          {isAllDay ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-leif-secondary">Datum</span>
              <input
                type="date"
                value={dayDate}
                onChange={(e) => setDayDate(e.target.value)}
                required
                className={controlClass}
              />
            </label>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-leif-secondary">Start</span>
                <input
                  type="datetime-local"
                  value={startLocal}
                  onChange={(e) => setStartLocal(e.target.value)}
                  required
                  className={controlClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-leif-secondary">Ende</span>
                <input
                  type="datetime-local"
                  value={endLocal}
                  onChange={(e) => setEndLocal(e.target.value)}
                  required
                  className={controlClass}
                />
              </label>
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-2 border-t border-leif-border pt-4">
            <div>
              {dialogMode === "edit" && editing ? (
                <Button type="button" variant="danger" disabled={pending} onClick={() => void onDelete()}>
                  Löschen
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()}>
                Abbrechen
              </Button>
              <Button type="submit" variant="primary" disabled={pending}>
                Speichern
              </Button>
            </div>
          </div>
        </form>
      </dialog>
    </div>
  );
}
