"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  syncOutlookCalendarMonth,
  updateCalendarEvent,
  updatePlannedTaskFromCalendar,
} from "@/app/(app)/kalender/actions";
import { addBerlinCalendarDays } from "@/lib/calendar/berlin-ymd";
import type { CalendarEventRow, KalenderView, PlannedTaskCalendarRow } from "@/lib/calendar/types";
import { PlanerPageClient } from "@/components/planer/planer-page-client";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PRODUCT_LABEL } from "@/lib/product-labels";
import type { PlannerStandardPaletteItem } from "@/lib/planer/fetch-planner-standard-blocks";
import { taskIsBookedInCalendar, type AreaRow, type TaskWithRelations } from "@/lib/tasks/types";
import { RefreshCw } from "lucide-react";

type OutlookFlash = { kind: "error" | "success"; message: string };
type KalenderPlannerBundle = {
  initialTasks: { id: string; title: string; durationMinutes: number; priority: number; relevance: number }[];
  initialStandardBlocks: PlannerStandardPaletteItem[];
  standardBlocksLoadError: string | null;
  editableTasks: TaskWithRelations[];
  taskAreas: AreaRow[];
  loadError: string | null;
};

type CalendarWorkMode = "anzeigen" | "planen";

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
  calendarWorkMode: CalendarWorkMode;
  plannerBundle: KalenderPlannerBundle | null;
};

type DetailItem =
  | { kind: "event"; item: CalendarEventRow }
  | { kind: "task"; item: PlannedTaskCalendarRow };

type LocalTaskLayout = Record<string, { day: string; startMin: number; durationMin: number }>;
type PositionedBlock = {
  id: string;
  kind: "event" | "task";
  startMin: number;
  endMin: number;
  col: number;
  colSpan: number;
};
type DraftCreate = { day: string; startMin: number; title: string };

const DAY_START = 6 * 60;
const DAY_END = 20 * 60;
/** Arbeitsband für Planen-Woche (freie Slots optisch hervorheben). */
const WORK_BAND_START_MIN = 8 * 60;
const WORK_BAND_END_MIN = 18 * 60;
const SLOT_MIN = 15;
const PX_PER_MIN = 1.05;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function viewTabClass(active: boolean): string {
  return active
    ? "rounded-[8px] bg-leif-primary px-3 py-1.5 text-sm font-medium text-white shadow-leif"
    : "rounded-[8px] border border-leif-border bg-leif-surface px-3 py-1.5 text-sm font-medium text-leif-secondary transition-colors hover:bg-leif-divider/50";
}

function monthTitleDe(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function shiftYm(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

function enumerateDays(fromYmd: string, toYmd: string): string[] {
  const out: string[] = [];
  let cur = fromYmd;
  while (cur <= toYmd) {
    out.push(cur);
    cur = addBerlinCalendarDays(cur, 1);
  }
  return out;
}

function ymdFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function minutesForDate(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function clampMinutes(min: number): number {
  return Math.max(DAY_START, Math.min(DAY_END, min));
}

function snap(min: number): number {
  return Math.round(min / SLOT_MIN) * SLOT_MIN;
}

function formatClock(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad(h)}:${pad(m)}`;
}

function fmtDayShort(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function groupTitle(ymd: string, today: string): string {
  if (ymd === today) return "Heute";
  if (ymd === addBerlinCalendarDays(today, 1)) return "Morgen";
  return new Date(`${ymd}T12:00:00`).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getEventPlacement(ev: CalendarEventRow): { day: string; startMin: number; endMin: number } {
  const s = new Date(ev.start_time);
  const e = new Date(ev.end_time);
  const day = ymdFromDate(s);
  return {
    day,
    startMin: ev.is_all_day ? DAY_START : clampMinutes(minutesForDate(s)),
    endMin: ev.is_all_day ? DAY_START + 60 : clampMinutes(Math.max(minutesForDate(e), minutesForDate(s) + 30)),
  };
}

function initTaskLayout(tasks: PlannedTaskCalendarRow[]): LocalTaskLayout {
  const byDay: Record<string, number> = {};
  const layout: LocalTaskLayout = {};
  for (const t of tasks) {
    const day = t.planned_date;
    const duration = Math.max(30, t.estimated_minutes ?? 45);
    const start = Math.max(DAY_START, byDay[day] ?? DAY_START + 60);
    layout[t.id] = { day, startMin: start, durationMin: duration };
    byDay[day] = Math.min(DAY_END - 30, start + duration + 15);
  }
  return layout;
}

function buildDayColumns(blocks: Array<{ id: string; kind: "event" | "task"; startMin: number; endMin: number }>): PositionedBlock[] {
  const ordered = [...blocks].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const laneEnds: number[] = [];
  const out: PositionedBlock[] = [];
  for (const b of ordered) {
    let lane = laneEnds.findIndex((end) => end <= b.startMin);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(b.endMin);
    } else {
      laneEnds[lane] = b.endMin;
    }
    out.push({ ...b, col: lane, colSpan: 1 });
  }
  const total = Math.max(1, laneEnds.length);
  return out.map((b) => ({ ...b, colSpan: total }));
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
  calendarWorkMode,
  plannerBundle,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<DetailItem | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [taskLayout, setTaskLayout] = useState<LocalTaskLayout>(() => initTaskLayout(plannedTasks));
  const plannedTasksHydrateKey = useMemo(
    () =>
      plannedTasks
        .map((t) => `${t.id}\0${t.planned_date}\0${t.estimated_minutes ?? ""}`)
        .sort()
        .join("\n"),
    [plannedTasks],
  );
  useEffect(() => {
    setTaskLayout(initTaskLayout(plannedTasks));
  }, [plannedTasksHydrateKey, plannedTasks]);
  const [resizing, setResizing] = useState<{ kind: "event" | "task"; id: string } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<{ day: string; startMin: number } | null>(null);
  const [draftCreate, setDraftCreate] = useState<DraftCreate | null>(null);
  const [localEventResize, setLocalEventResize] = useState<Record<string, number>>({});
  const dayKeys = useMemo(
    () =>
      view === "week"
        ? enumerateDays(rangeFrom, rangeTo)
        : view === "day"
          ? [anchorD]
          : enumerateDays(rangeFrom, rangeTo),
    [view, rangeFrom, rangeTo, anchorD],
  );

  async function onSyncOutlook() {
    setSyncBusy(true);
    setSyncMessage(null);
    try {
      const res = await syncOutlookCalendarMonth(outlookSyncYm);
      if (!res.ok) {
        setSyncMessage(res.error);
        return;
      }
      setSyncMessage(`${res.count} Outlook-Termin(e) synchronisiert.`);
      router.refresh();
    } finally {
      setSyncBusy(false);
    }
  }

  async function moveEvent(ev: CalendarEventRow, toDay: string, startMin: number) {
    const old = getEventPlacement(ev);
    const duration = Math.max(30, old.endMin - old.startMin);
    const start = new Date(`${toDay}T${formatClock(startMin)}:00`);
    const end = new Date(start.getTime() + duration * 60_000);
    const res = await updateCalendarEvent(ev.id, {
      title: ev.title,
      description: ev.description ?? "",
      location: ev.location ?? undefined,
      is_private: ev.is_private,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      is_all_day: false,
    });
    if (res.ok) router.refresh();
  }

  async function resizeEvent(ev: CalendarEventRow, newDuration: number) {
    const start = new Date(ev.start_time);
    const end = new Date(start.getTime() + newDuration * 60_000);
    const res = await updateCalendarEvent(ev.id, {
      title: ev.title,
      description: ev.description ?? "",
      location: ev.location ?? undefined,
      is_private: ev.is_private,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      is_all_day: false,
    });
    if (res.ok) router.refresh();
  }

  async function resizeTask(taskId: string, durationMin: number) {
    const old = taskLayout[taskId];
    if (!old) return;
    await updatePlannedTaskFromCalendar(taskId, old.day, durationMin);
    router.refresh();
  }

  async function moveTask(taskId: string, day: string, startMin: number) {
    const old = taskLayout[taskId];
    const planned = plannedTasks.find((t) => t.id === taskId);
    const fromBundle = plannerBundle?.editableTasks.find((t) => t.id === taskId);
    const durationMin =
      old?.durationMin ?? Math.max(30, planned?.estimated_minutes ?? fromBundle?.estimated_minutes ?? 45);
    setTaskLayout((s) => ({ ...s, [taskId]: { day, startMin, durationMin } }));
    await updatePlannedTaskFromCalendar(taskId, day, durationMin);
    router.refresh();
  }

  async function quickCreateAt(day: string, startMin: number, title: string) {
    if (!title.trim()) return;
    const start = new Date(`${day}T${formatClock(startMin)}:00`);
    const end = new Date(start.getTime() + 60 * 60_000);
    const res = await createCalendarEvent({
      title: title.trim(),
      description: "",
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      is_all_day: false,
    });
    if (res.ok) {
      setDraftCreate(null);
      router.refresh();
    }
  }

  function pointerToMinutes(event: { currentTarget: HTMLDivElement; clientY: number }) {
    const rect = event.currentTarget.getBoundingClientRect();
    const y = "clientY" in event ? event.clientY : 0;
    const rel = Math.max(0, Math.min(rect.height, y - rect.top));
    const mins = DAY_START + rel / PX_PER_MIN;
    return snap(clampMinutes(mins));
  }

  function buildKalenderHref(overrides: Partial<{ v: KalenderView; d: string; m: string; plan: CalendarWorkMode }>) {
    const nextV = overrides.v ?? view;
    const nextD = overrides.d ?? anchorD;
    const nextM = overrides.m ?? monthYm;
    const nextPlan = overrides.plan ?? calendarWorkMode;
    const params = new URLSearchParams();
    if (nextV === "month") params.set("m", nextM);
    else {
      params.set("v", nextV);
      params.set("d", nextD);
    }
    if (nextPlan === "planen") params.set("plan", "planen");
    return `/kalender?${params.toString()}`;
  }

  const plannerDataError =
    calendarWorkMode === "planen" && plannerBundle?.loadError ? plannerBundle.loadError : null;
  const showPlannerEmbed =
    calendarWorkMode === "planen" && view === "day" && plannerBundle !== null && plannerBundle.loadError === null;
  const showWeekPlanen =
    calendarWorkMode === "planen" &&
    view === "week" &&
    plannerBundle !== null &&
    plannerBundle.loadError === null;

  const weekPlanPoolTasks = useMemo(() => {
    if (!showWeekPlanen || !plannerBundle) return [];
    const inWeek = new Set(enumerateDays(rangeFrom, rangeTo));
    return plannerBundle.editableTasks.filter((t) => {
      if (t.completed_at) return false;
      if (
        taskIsBookedInCalendar({
          completed_at: t.completed_at,
          planned_date: t.planned_date,
          status: t.raw_status,
        })
      ) {
        return false;
      }
      const pd = t.planned_date?.trim() || "";
      if (!pd) return true;
      return !inWeek.has(pd);
    });
  }, [showWeekPlanen, plannerBundle, rangeFrom, rangeTo]);

  if (loadError) return <AlertBanner variant="error">Kalender konnte nicht geladen werden: {loadError}</AlertBanner>;

  const timelineHeight = (DAY_END - DAY_START) * PX_PER_MIN;

  return (
    <div className="space-y-6">
      {outlookFlash ? (
        <AlertBanner variant={outlookFlash.kind === "error" ? "error" : "success"}>{outlookFlash.message}</AlertBanner>
      ) : null}

      <PageHeader
        title={PRODUCT_LABEL.kalender}
        description="Zentrale Zeitansicht: im Modus „Planen“ Tagesplanung wie im Planer; in der Woche zusätzlich Task-Pool und Arbeitszeit-Band zum Einplanen in die Woche."
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={!outlookLinked || syncBusy} onClick={() => void onSyncOutlook()}>
              <RefreshCw className={`size-4 ${syncBusy ? "animate-spin" : ""}`} aria-hidden />
            </Button>
          </div>
        }
      />

      {syncMessage ? <p className="rounded-md border border-leif-border bg-leif-divider/60 px-3 py-2 text-sm">{syncMessage}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Link href={buildKalenderHref({ v: "day", d: anchorD })} className={viewTabClass(view === "day")}>
          Tag
        </Link>
        <Link href={buildKalenderHref({ v: "week", d: anchorD })} className={viewTabClass(view === "week")}>
          Woche
        </Link>
        <Link href={buildKalenderHref({ v: "month", m: monthYm })} className={viewTabClass(view === "month")}>
          Monat
        </Link>
        <Link href={buildKalenderHref({ v: "agenda", d: anchorD })} className={viewTabClass(view === "agenda")}>
          Agenda
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-leif-border/50 pb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-leif-secondary">Modus</span>
        <Link href={buildKalenderHref({ plan: "anzeigen" })} className={viewTabClass(calendarWorkMode === "anzeigen")}>
          Anzeigen
        </Link>
        <Link href={buildKalenderHref({ plan: "planen" })} className={viewTabClass(calendarWorkMode === "planen")}>
          Planen
        </Link>
      </div>

      {plannerDataError ? (
        <AlertBanner variant="error">Tasks für die Planung konnten nicht geladen werden: {plannerDataError}</AlertBanner>
      ) : null}

      {calendarWorkMode === "planen" && view !== "day" && view !== "week" ? (
        <AlertBanner variant="info">
          „Automatisch planen“ und der Planer-Entwurf sind im Kalender derzeit im{" "}
          <strong>Tagesmodus</strong> verfügbar.{" "}
          <Link
            href={buildKalenderHref({ v: "day", d: anchorD, plan: "planen" })}
            className="font-medium underline underline-offset-2"
          >
            Zu Tag & Planen wechseln
          </Link>
        </AlertBanner>
      ) : null}

      {showWeekPlanen ? (
        <AlertBanner variant="info">
          <strong>Wochenplanung:</strong> Tasks aus der Liste in einen Tag ziehen (8–18&nbsp;Uhr leicht markiert). Für
          Auto-Plan mit Entwurf wechsle zum{" "}
          <Link href={buildKalenderHref({ v: "day", d: anchorD, plan: "planen" })} className="font-medium underline underline-offset-2">
            Tagesmodus
          </Link>
          .
        </AlertBanner>
      ) : null}

      {showPlannerEmbed && plannerBundle ? (
        <PlanerPageClient
          key={anchorD}
          embedInCalendar
          calendarAnchorDate={anchorD}
          initialTasks={plannerBundle.initialTasks}
          initialStandardBlocks={plannerBundle.initialStandardBlocks}
          standardBlocksLoadError={plannerBundle.standardBlocksLoadError}
          initialEvents={events}
          editableTasks={plannerBundle.editableTasks}
          taskAreas={plannerBundle.taskAreas}
        />
      ) : (
        <>
      {(view === "week" || view === "day") && (
        <div
          className={
            showWeekPlanen
              ? "grid gap-4 xl:grid-cols-[1fr_minmax(11rem,13rem)_minmax(16rem,18rem)]"
              : "grid gap-4 xl:grid-cols-[1fr_320px]"
          }
        >
          <div className="overflow-x-auto rounded-[12px] border border-leif-border p-3">
            <div className="grid min-w-[52rem] gap-0" style={{ gridTemplateColumns: `72px repeat(${dayKeys.length}, minmax(180px, 1fr))` }}>
              <div className="border-r border-leif-border" />
              {dayKeys.map((d) => (
                <div key={`h-${d}`} className="border-r border-leif-border px-2 py-1 text-xs font-medium text-leif-secondary last:border-r-0">
                  {fmtDayShort(d)}
                </div>
              ))}

              <div className="relative border-r border-leif-border">
                {Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }).map((_, i) => {
                  const min = DAY_START + i * 60;
                  return (
                    <div key={min} className="absolute left-1 top-0 -translate-y-2 text-[10px] text-leif-muted" style={{ top: (min - DAY_START) * PX_PER_MIN }}>
                      {formatClock(min)}
                    </div>
                  );
                })}
                <div style={{ height: timelineHeight }} />
              </div>

              {dayKeys.map((day) => (
                <div
                  key={day}
                  className="relative border-r border-leif-border last:border-r-0"
                  style={{ height: timelineHeight }}
                  onDoubleClick={(e) => {
                    const startMin = pointerToMinutes(e);
                    setDraftCreate({ day, startMin, title: "" });
                  }}
                  onDragLeave={() => setDropPreview((cur) => (cur?.day === day ? null : cur))}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropPreview({ day, startMin: pointerToMinutes(e) });
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const startMin = pointerToMinutes(e);
                    const poolId = e.dataTransfer.getData("text/leif-task-pool");
                    if (poolId) {
                      void moveTask(poolId, day, startMin);
                      setDropPreview(null);
                      setDraggingId(null);
                      return;
                    }
                    const payload = e.dataTransfer.getData("text/calendar-item");
                    if (!payload) return;
                    const parsed = JSON.parse(payload) as { kind: "event" | "task"; id: string };
                    if (parsed.kind === "event") {
                      const ev = events.find((it) => it.id === parsed.id);
                      if (ev) void moveEvent(ev, day, startMin);
                    } else {
                      void moveTask(parsed.id, day, startMin);
                    }
                    setDropPreview(null);
                    setDraggingId(null);
                  }}
                >
                  {showWeekPlanen ? (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-1 z-0 rounded-md bg-emerald-500/[0.07] ring-1 ring-inset ring-emerald-600/20"
                      style={{
                        top: (WORK_BAND_START_MIN - DAY_START) * PX_PER_MIN,
                        height: (WORK_BAND_END_MIN - WORK_BAND_START_MIN) * PX_PER_MIN,
                      }}
                    />
                  ) : null}
                  {Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }).map((_, i) => (
                    <div
                      key={`${day}-line-${i}`}
                      className="absolute left-0 right-0 border-t border-leif-divider/70"
                      style={{ top: i * 60 * PX_PER_MIN }}
                    />
                  ))}

                  {(() => {
                    const dayEvents = events
                      .map((ev) => ({ ev, pos: getEventPlacement(ev) }))
                      .filter(({ pos }) => pos.day === day);
                    const dayTasks = plannedTasks
                      .map((t) => ({ t, l: taskLayout[t.id] }))
                      .filter(({ t, l }) => (l?.day ?? t.planned_date) === day && l);
                    const blocks = buildDayColumns([
                        ...dayEvents.map(({ ev, pos }) => ({
                        id: ev.id,
                        kind: "event" as const,
                        startMin: pos.startMin,
                          endMin: pos.startMin + (localEventResize[ev.id] ?? Math.max(30, pos.endMin - pos.startMin)),
                      })),
                      ...dayTasks.map(({ t, l }) => ({
                        id: t.id,
                        kind: "task" as const,
                        startMin: l!.startMin,
                        endMin: l!.startMin + l!.durationMin,
                      })),
                    ]);
                    return blocks.map((blk) => {
                      const dayWidthPct = 100 / blk.colSpan;
                      const leftPct = blk.col * dayWidthPct;
                      const top = (blk.startMin - DAY_START) * PX_PER_MIN;
                      const height = Math.max(28, (blk.endMin - blk.startMin) * PX_PER_MIN);
                      if (blk.kind === "event") {
                        const ev = dayEvents.find((x) => x.ev.id === blk.id)?.ev;
                        if (!ev) return null;
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/calendar-item", JSON.stringify({ kind: "event", id: ev.id }));
                              setDraggingId(ev.id);
                            }}
                            onClick={() => setSelected({ kind: "event", item: ev })}
                            className={`absolute z-[2] rounded-md border border-leif-border bg-leif-divider px-2 py-1 text-left text-xs ${draggingId === ev.id ? "opacity-60" : ""}`}
                            style={{ top, height, left: `calc(${leftPct}% + 2px)`, width: `calc(${dayWidthPct}% - 4px)` }}
                          >
                            <div className="font-medium">{ev.title}</div>
                            <div className="text-[10px] text-leif-secondary">{formatClock(blk.startMin)}-{formatClock(blk.endMin)}</div>
                            <div
                              className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize rounded-b-md bg-leif-text/15"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setResizing({ kind: "event", id: ev.id });
                                const startY = e.clientY;
                                const baseDuration = blk.endMin - blk.startMin;
                                let latestDuration = baseDuration;
                                const onMove = (mv: MouseEvent) => {
                                  const delta = (mv.clientY - startY) / PX_PER_MIN;
                                  const d = Math.max(30, snap(baseDuration + delta));
                                  latestDuration = d;
                                  setLocalEventResize((s) => ({ ...s, [ev.id]: d }));
                                };
                                const onUp = () => {
                                  setResizing(null);
                                  window.removeEventListener("mousemove", onMove);
                                  window.removeEventListener("mouseup", onUp);
                                  setLocalEventResize((s) => {
                                    const next = { ...s };
                                    delete next[ev.id];
                                    return next;
                                  });
                                  void resizeEvent(ev, latestDuration);
                                };
                                window.addEventListener("mousemove", onMove);
                                window.addEventListener("mouseup", onUp);
                              }}
                            />
                          </button>
                        );
                      }
                      const task = dayTasks.find((x) => x.t.id === blk.id)?.t;
                      if (!task) return null;
                      return (
                        <button
                          key={task.id}
                          type="button"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/calendar-item", JSON.stringify({ kind: "task", id: task.id }));
                            setDraggingId(task.id);
                          }}
                          onClick={() => setSelected({ kind: "task", item: task })}
                          className={`absolute z-[2] rounded-md border border-leif-primary/35 bg-leif-primary-soft px-2 py-1 text-left text-xs ${draggingId === task.id ? "opacity-60" : ""}`}
                          style={{ top, height, left: `calc(${leftPct}% + 4px)`, width: `calc(${dayWidthPct}% - 8px)` }}
                        >
                          <div className="font-medium text-leif-primary-hover">Task</div>
                          <div>{task.title}</div>
                          <div className="text-[10px] text-leif-secondary">{formatClock(blk.startMin)}-{formatClock(blk.endMin)}</div>
                          <div
                            className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize rounded-b-md bg-leif-primary/20"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setResizing({ kind: "task", id: task.id });
                              const startY = e.clientY;
                              const baseDuration = blk.endMin - blk.startMin;
                              let latestDuration = baseDuration;
                              const onMove = (mv: MouseEvent) => {
                                const delta = (mv.clientY - startY) / PX_PER_MIN;
                                const d = Math.max(30, snap(baseDuration + delta));
                                latestDuration = d;
                                setTaskLayout((s) => {
                                  const old = s[task.id];
                                  if (!old) return s;
                                  return { ...s, [task.id]: { ...old, durationMin: d } };
                                });
                              };
                              const onUp = () => {
                                setResizing(null);
                                window.removeEventListener("mousemove", onMove);
                                window.removeEventListener("mouseup", onUp);
                                void resizeTask(task.id, latestDuration);
                              };
                              window.addEventListener("mousemove", onMove);
                              window.addEventListener("mouseup", onUp);
                            }}
                          />
                        </button>
                      );
                    });
                  })()}

                  {dropPreview?.day === day ? (
                    <div
                      className="pointer-events-none absolute left-1 right-1 rounded-md border border-dashed border-leif-primary/50 bg-leif-primary-soft/50"
                      style={{ top: (dropPreview.startMin - DAY_START) * PX_PER_MIN, height: 60 * PX_PER_MIN }}
                    />
                  ) : null}

                  {draftCreate?.day === day ? (
                    <form
                      className="absolute z-20 rounded-md border border-leif-primary/40 bg-leif-surface p-2 shadow-leif"
                      style={{ top: (draftCreate.startMin - DAY_START) * PX_PER_MIN, left: 6, right: 6 }}
                      onSubmit={(e) => {
                        e.preventDefault();
                        void quickCreateAt(draftCreate.day, draftCreate.startMin, draftCreate.title);
                      }}
                    >
                      <input
                        autoFocus
                        value={draftCreate.title}
                        onChange={(e) => setDraftCreate((s) => (s ? { ...s, title: e.target.value } : s))}
                        placeholder="Titel..."
                        className="w-full rounded border border-leif-border bg-white px-2 py-1 text-xs"
                      />
                      <div className="mt-2 flex justify-end gap-1">
                        <button type="button" className="rounded border border-leif-border px-2 py-0.5 text-xs" onClick={() => setDraftCreate(null)}>
                          Abbrechen
                        </button>
                        <button type="submit" className="rounded bg-leif-primary px-2 py-0.5 text-xs text-white">
                          Erstellen
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {showWeekPlanen ? (
            <aside className="max-h-[min(70vh,52rem)] overflow-y-auto rounded-[12px] border border-leif-border bg-leif-surface-soft/60 p-3">
              <h3 className="mb-1 text-sm font-semibold text-leif-text">Einplanen</h3>
              <p className="mb-3 text-xs text-leif-secondary">
                Tasks ohne Termin in dieser Woche — in eine Tagesspalte ziehen.
              </p>
              {weekPlanPoolTasks.length === 0 ? (
                <p className="text-xs text-leif-muted">Keine passenden Tasks — alle sind schon in dieser Woche geplant.</p>
              ) : (
                <ul className="space-y-2">
                  {weekPlanPoolTasks.map((t) => {
                    const dur = Math.max(15, t.estimated_minutes ?? 45);
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          draggable
                          onDragStart={(ev) => {
                            ev.dataTransfer.setData("text/leif-task-pool", t.id);
                            ev.dataTransfer.effectAllowed = "copyMove";
                            setDraggingId(t.id);
                          }}
                          onDragEnd={() => setDraggingId(null)}
                          className="w-full rounded-lg border border-leif-border bg-leif-surface px-2.5 py-2 text-left text-xs shadow-sm transition-colors hover:border-leif-primary/35 hover:bg-leif-primary-soft/40"
                        >
                          <span className="line-clamp-2 font-medium text-leif-text">{t.title}</span>
                          <span className="mt-1 block text-[10px] text-leif-muted">{dur} min</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </aside>
          ) : null}

          <aside className="rounded-[12px] border border-leif-border p-3">
            <h3 className="mb-2 text-sm font-semibold">Details</h3>
            {!selected ? (
              <p className="text-sm text-leif-muted">Termin oder Task anklicken, um rechts Details zu sehen.</p>
            ) : selected.kind === "event" ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium">{selected.item.title}</p>
                <p className="text-leif-secondary">{new Date(selected.item.start_time).toLocaleString("de-DE")} - {new Date(selected.item.end_time).toLocaleString("de-DE")}</p>
                {selected.item.description ? <p>{selected.item.description}</p> : null}
                <Button type="button" variant="danger" size="sm" onClick={() => void deleteCalendarEvent(selected.item.id).then(() => router.refresh())}>
                  Termin löschen
                </Button>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="font-medium">{selected.item.title}</p>
                <p className="text-leif-secondary">
                  {selected.item.area_name} · {selected.item.status}
                </p>
                <Link className="text-leif-primary underline-offset-2 hover:underline" href={`/tasks?task=${encodeURIComponent(selected.item.id)}`}>
                  Task öffnen
                </Link>
              </div>
            )}
            {resizing ? <p className="mt-3 text-xs text-leif-muted">Resize aktiv…</p> : null}
          </aside>
        </div>
      )}

      {view === "month" && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Link href={`/kalender?m=${encodeURIComponent(shiftYm(monthYm, -1))}`} className="rounded-md border border-leif-border px-3 py-1.5 text-sm">
              ← Monat
            </Link>
            <h2 className="text-lg font-semibold capitalize">{monthTitleDe(monthYm)}</h2>
            <Link href={`/kalender?m=${encodeURIComponent(shiftYm(monthYm, 1))}`} className="rounded-md border border-leif-border px-3 py-1.5 text-sm">
              Monat →
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
            {dayKeys.map((day) => {
              const dayEvents = events.filter((e) => getEventPlacement(e).day === day);
              const dayTasks = plannedTasks.filter((t) => t.planned_date === day);
              const all = [
                ...dayEvents.map((e) => ({ id: e.id, label: e.title })),
                ...dayTasks.map((t) => ({ id: t.id, label: `Task: ${t.title}` })),
              ];
              const shown = all.slice(0, 3);
              return (
                <button
                  key={day}
                  type="button"
                  className="min-h-[9rem] rounded-[12px] border border-leif-border p-2 text-left hover:bg-leif-divider/40"
                  onClick={() => router.push(buildKalenderHref({ v: "day", d: day }))}
                >
                  <div className="mb-2 text-sm font-semibold">{fmtDayShort(day)}</div>
                  <ul className="space-y-1 text-xs">
                    {shown.map((it) => (
                      <li key={it.id} className="truncate rounded bg-leif-divider/70 px-1.5 py-1">
                        {it.label}
                      </li>
                    ))}
                  </ul>
                  {all.length > shown.length ? <p className="mt-2 text-xs text-leif-muted">+{all.length - shown.length} weitere</p> : null}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {view === "agenda" && (
        <section className="space-y-4">
          {dayKeys.map((day) => {
            const dayEvents = events.filter((e) => getEventPlacement(e).day === day);
            const dayTasks = plannedTasks.filter((t) => t.planned_date === day);
            if (dayEvents.length === 0 && dayTasks.length === 0) return null;
            return (
              <div key={day} className="rounded-[12px] border border-leif-border">
                <div className="border-b border-leif-border px-3 py-2 text-sm font-semibold">{groupTitle(day, anchorD)}</div>
                <ul className="divide-y divide-leif-divider">
                  {dayEvents.map((ev) => (
                    <li key={ev.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <button type="button" className="text-left" onClick={() => setSelected({ kind: "event", item: ev })}>
                        <span className="font-medium">{ev.title}</span>
                        <span className="ml-2 text-xs text-leif-secondary">{new Date(ev.start_time).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>
                      </button>
                      <span className="text-xs text-leif-muted">Termin</span>
                    </li>
                  ))}
                  {dayTasks.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <button type="button" className="text-left" onClick={() => setSelected({ kind: "task", item: t })}>
                        <span className="font-medium">{t.title}</span>
                      </button>
                      <span className="text-xs text-leif-primary-hover">Task</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      )}
        </>
      )}
    </div>
  );
}
