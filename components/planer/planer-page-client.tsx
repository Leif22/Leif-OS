"use client";

import {
  deleteCalendarEvent,
  updateCalendarEvent,
} from "@/app/(app)/kalender/actions";
import {
  runCalendarHybridSync,
  type CalendarSyncMode,
  type CalendarSyncReason,
} from "@/app/(app)/kalender/sync-actions";
import { fetchPlanerDayEvents, setCalendarEventExcludeFromPlanner } from "@/app/(app)/planer/actions";
import { cn } from "@/lib/cn";
import {
  formatRecurrenceLabel,
  isRecurrenceRuleDueOn,
  normalizeRecurrenceRule,
  type LegacyPlannerFrequency,
  type PlannerRecurrenceRule,
} from "@/lib/planer/recurrence";
import type { PlannerStandardPaletteItem } from "@/lib/planer/fetch-planner-standard-blocks";
import { PLANER_STORAGE_KEY, readPlannerStorage } from "@/lib/planer/planner-storage";
import Link from "next/link";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskInlineEditor } from "@/components/tasks/task-inline-editor";
import type { AreaRow, TaskWithRelations } from "@/lib/tasks/types";
import { DEFAULT_TASK_TYPES } from "@/lib/task-types/defaults";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type FormEvent,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { CalendarEventFormPayload, CalendarEventRow } from "@/lib/calendar/types";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/control-styles";
import { AlertBanner } from "@/components/ui/alert-banner";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  ListTodo,
  Lock,
  Plus,
  Repeat,
  Shield,
  Trash2,
} from "lucide-react";

type PlanDayPreset = "today" | "tomorrow" | "date";

type PlannerTask = {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  priority: number;
  relevance: number;
  frequency?: LegacyPlannerFrequency;
  recurrenceRule?: PlannerRecurrenceRule;
  kind?: "task" | "standard";
};

type TaskStatus = "ungeplant" | "in_planung" | "geplant";

type TaskPlacement = {
  taskId: string;
  startSlot: number;
  slotCount: number;
};

type PlannerEventBlock = {
  id: string;
  title: string;
  startSlot: number;
  slotCount: number;
  endSlotExclusive: number;
  source: string;
  laneIndex: number;
  laneCount: number;
  outlook_sensitivity: string | null;
  outlook_is_recurring: boolean;
};

type PlannerEventBlockDraft = Omit<PlannerEventBlock, "laneIndex" | "laneCount">;

const PLANNER_EVENT_BAND_RIGHT = "0.5rem";

function plannerImportedEventBandStyle(
  laneIndex: number,
  laneCount: number,
): Pick<CSSProperties, "left" | "width" | "right"> {
  const L = "0.75rem + 64px + 0.75rem";
  return {
    left: `calc((${L}) + (100% - (${L}) - ${PLANNER_EVENT_BAND_RIGHT}) * ${laneIndex} / ${laneCount})`,
    width: `calc((100% - (${L}) - ${PLANNER_EVENT_BAND_RIGHT}) / ${laneCount})`,
    right: "auto",
  };
}

function assignOverlapLanes(blocks: PlannerEventBlockDraft[]): PlannerEventBlock[] {
  if (blocks.length === 0) return [];
  const n = blocks.length;
  const parent = blocks.map((_, i) => i);
  function find(i: number): number {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  }
  function union(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  }
  function overlaps(ia: number, ib: number): boolean {
    const A = blocks[ia];
    const B = blocks[ib];
    return A.startSlot < B.endSlotExclusive && B.startSlot < A.endSlotExclusive;
  }
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      if (overlaps(i, j)) union(i, j);
    }
  }
  const laneIndexArr = new Array<number>(n).fill(0);
  const laneCountArr = new Array<number>(n).fill(1);
  const rootsDone = new Set<number>();
  for (let i = 0; i < n; i += 1) {
    const root = find(i);
    if (rootsDone.has(root)) continue;
    rootsDone.add(root);
    const group: number[] = [];
    for (let j = 0; j < n; j += 1) {
      if (find(j) === root) group.push(j);
    }
    if (group.length === 1) {
      laneIndexArr[group[0]] = 0;
      laneCountArr[group[0]] = 1;
      continue;
    }
    const minS = Math.min(...group.map((idx) => blocks[idx].startSlot));
    const maxE = Math.max(...group.map((idx) => blocks[idx].endSlotExclusive));
    let maxDepth = 1;
    for (let s = minS; s < maxE; s += 1) {
      let c = 0;
      for (const idx of group) {
        const b = blocks[idx];
        if (s >= b.startSlot && s < b.endSlotExclusive) c += 1;
      }
      maxDepth = Math.max(maxDepth, c);
    }
    const sorted = [...group].sort((ia, ib) => {
      const d = blocks[ia].startSlot - blocks[ib].startSlot;
      if (d !== 0) return d;
      return blocks[ia].endSlotExclusive - blocks[ib].endSlotExclusive;
    });
    const freeAt = new Array<number>(maxDepth).fill(-1);
    for (const idx of sorted) {
      const b = blocks[idx];
      let lane = -1;
      for (let L = 0; L < maxDepth; L += 1) {
        if (freeAt[L] <= b.startSlot) {
          lane = L;
          break;
        }
      }
      if (lane === -1) lane = maxDepth - 1;
      freeAt[lane] = b.endSlotExclusive;
      laneIndexArr[idx] = lane;
      for (const idx2 of group) laneCountArr[idx2] = maxDepth;
    }
  }
  return blocks.map((b, i) => ({
    ...b,
    laneIndex: laneIndexArr[i],
    laneCount: laneCountArr[i],
  }));
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

const START_HOUR = 6;
const END_HOUR = 22;
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 18;
const SLOT_MINUTES = 15;
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * SLOTS_PER_HOUR;
const DAY_CAPACITY_MINUTES = 8 * 60;
const SLOT_ROW_HEIGHT_PX = 20;
/** Time column in slot rows; overlay blocks use the same offset (`px-3` + column + `gap-3`). */
const PLANNER_TIME_COL_PX = 64;
const PLANNER_BLOCK_LAYER_LEFT = `calc(0.75rem + ${PLANNER_TIME_COL_PX}px + 0.75rem)`;
/** List cards: hybrid height from duration, min for taps, max to avoid huge blocks; snapped to slot row height. */
const TASK_LIST_CARD_MIN_PX = 56;
const TASK_LIST_CARD_MAX_PX = 200;
function normalizeStandardBlock(block: PlannerTask): PlannerTask {
  return {
    ...block,
    kind: "standard",
    recurrenceRule: normalizeRecurrenceRule(block.recurrenceRule, block.frequency),
    frequency: undefined,
  };
}

function toYmd(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function addDaysToIso(iso: string, deltaDays: number): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return toYmd(new Date());
  d.setDate(d.getDate() + deltaDays);
  return toYmd(d);
}

function firstOfMonthIso(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return toYmd(new Date());
  return toYmd(new Date(date.getFullYear(), date.getMonth(), 1));
}

function isStandardBlockDueOn(block: PlannerTask, isoDate: string): boolean {
  const rule = normalizeRecurrenceRule(block.recurrenceRule, block.frequency);
  return isRecurrenceRuleDueOn(rule, isoDate);
}

function formatPlanningDayShort(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function normalizePlannerCalendarEvents(rows: CalendarEventRow[]): CalendarEventRow[] {
  return rows.map((ev) => ({
    ...ev,
    exclude_from_planner: Boolean(ev.exclude_from_planner),
    outlook_recurrence_group_id: ev.outlook_recurrence_group_id ?? null,
    outlook_sensitivity: ev.outlook_sensitivity ?? null,
    outlook_is_recurring: Boolean(ev.outlook_is_recurring),
  }));
}

function outlookShowsPrivateIcon(sensitivity: string | null): boolean {
  return (
    sensitivity === "private" ||
    sensitivity === "confidential" ||
    sensitivity === "personal"
  );
}

/** Unplanned task list: duration → height (UX curve, then snap to 15-min row / calendar grid). */
function plannerTaskListCardHeightPx(durationMinutes: number): number {
  const d = Math.max(1, durationMinutes);
  let h: number;
  if (d <= 15) h = 56;
  else if (d <= 30) h = 72;
  else if (d <= 45) h = 96;
  else if (d <= 60) h = 120;
  else if (d <= 90) h = 160;
  else {
    const extra30 = Math.ceil((d - 90) / 30);
    h = 160 + extra30 * 40;
  }
  h = Math.min(TASK_LIST_CARD_MAX_PX, Math.max(TASK_LIST_CARD_MIN_PX, h));
  const snapped = Math.round(h / SLOT_ROW_HEIGHT_PX) * SLOT_ROW_HEIGHT_PX;
  return Math.min(TASK_LIST_CARD_MAX_PX, Math.max(TASK_LIST_CARD_MIN_PX, snapped));
}

let plannerTransparentDragCanvas: HTMLCanvasElement | null = null;

function primePlannerTransparentDragImage(event: DragEvent<HTMLElement>) {
  if (typeof document === "undefined") return;
  if (!plannerTransparentDragCanvas) {
    plannerTransparentDragCanvas = document.createElement("canvas");
    plannerTransparentDragCanvas.width = 1;
    plannerTransparentDragCanvas.height = 1;
  }
  event.dataTransfer.setDragImage(plannerTransparentDragCanvas, 0, 0);
}

export function PlanerPageClient({
  initialTasks,
  initialStandardBlocks,
  standardBlocksLoadError = null,
  initialEvents,
  editableTasks,
  taskAreas,
  embedInCalendar = false,
  calendarAnchorDate = null,
}: {
  initialTasks: PlannerTask[];
  initialStandardBlocks: PlannerStandardPaletteItem[];
  standardBlocksLoadError?: string | null;
  initialEvents: CalendarEventRow[];
  editableTasks: TaskWithRelations[];
  taskAreas: AreaRow[];
  embedInCalendar?: boolean;
  calendarAnchorDate?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mode, setMode] = useState<"overview" | "planning">(() => (embedInCalendar ? "planning" : "overview"));
  const [dayPreset, setDayPreset] = useState<PlanDayPreset>(() => (embedInCalendar ? "date" : "today"));
  const [selectedDate, setSelectedDate] = useState(() => {
    const anchor = calendarAnchorDate?.trim();
    if (embedInCalendar && anchor && /^\d{4}-\d{2}-\d{2}$/.test(anchor)) return anchor;
    return new Date().toISOString().slice(0, 10);
  });
  const [overviewMonthIso, setOverviewMonthIso] = useState(() => firstOfMonthIso(new Date().toISOString().slice(0, 10)));
  /** Empty until client hydration — avoids SSR/localStorage mismatch (hydration errors). */
  const [dayPlans, setDayPlans] = useState<Record<string, TaskPlacement[]>>(() => ({}));
  const [finalizedByDay, setFinalizedByDay] = useState<Record<string, boolean>>(() => ({}));
  const [standardBlocks, setStandardBlocks] = useState<PlannerTask[]>(() =>
    initialStandardBlocks.map((b) => normalizeStandardBlock({ ...b, kind: "standard" as const })),
  );
  const [storageHydrated, setStorageHydrated] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dropHoverSlot, setDropHoverSlot] = useState<number | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{ taskId: string; startSlot: number; slotCount: number } | null>(null);
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);
  const [autoPlanFeedback, setAutoPlanFeedback] = useState<{ tone: "success" | "info"; message: string } | null>(null);
  const [dayClickFlashIso, setDayClickFlashIso] = useState<string | null>(null);
  const [dragEpoch, setDragEpoch] = useState(0);
  const [unplanCandidateTaskId, setUnplanCandidateTaskId] = useState<string | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventRow[]>(() =>
    normalizePlannerCalendarEvents(initialEvents),
  );
  const [calendarSyncStatus, setCalendarSyncStatus] = useState<string | null>(null);
  const plannerSyncBusyRef = useRef(false);
  const plannerLastSyncIsoRef = useRef<string | null>(null);
  const plannerLastInteractionMsRef = useRef<number>(Date.now());
  const [plannerVisibilityBusyId, setPlannerVisibilityBusyId] = useState<string | null>(null);
  const [plannerCalendarDialogOpen, setPlannerCalendarDialogOpen] = useState(false);
  const [plannerCalendarEditing, setPlannerCalendarEditing] = useState<CalendarEventRow | null>(null);
  const [calDlgTitle, setCalDlgTitle] = useState("");
  const [calDlgDescription, setCalDlgDescription] = useState("");
  const [calDlgIsAllDay, setCalDlgIsAllDay] = useState(false);
  const [calDlgDayDate, setCalDlgDayDate] = useState("");
  const [calDlgStartLocal, setCalDlgStartLocal] = useState("");
  const [calDlgEndLocal, setCalDlgEndLocal] = useState("");
  const [calDlgPending, setCalDlgPending] = useState(false);
  const [calDlgError, setCalDlgError] = useState<string | null>(null);
  const [autoPlanning, setAutoPlanning] = useState(false);
  /** Separater Auto-Plan-Entwurf für den aktiven Tag; `null` = kein Entwurf (Anzeige = gespeicherte `dayPlans`). */
  const [autoPlanDraft, setAutoPlanDraft] = useState<TaskPlacement[] | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskDialogMode, setTaskDialogMode] = useState<"create" | "edit">("create");
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);
  const [expandedInlineTaskId, setExpandedInlineTaskId] = useState<string | null>(null);
  const planDateInputRef = useRef<HTMLInputElement>(null);

  const tasks = useMemo(
    () =>
      [...initialTasks.map((task) => ({ ...task, kind: "task" as const }))].sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (a.relevance !== b.relevance) return b.relevance - a.relevance;
        return a.durationMinutes - b.durationMinutes;
      }),
    [initialTasks],
  );
  const slots = useMemo(() => Array.from({ length: TOTAL_SLOTS }, (_, idx) => idx), []);

  const eventsVisibleInPlanner = useMemo(
    () => calendarEvents.filter((ev) => !ev.exclude_from_planner),
    [calendarEvents],
  );

  /** Aus Planung ausgeblendete Outlook-Termine (pro Serie nur ein Eintrag für die Leiste). */
  const hiddenOutlookPlannerRows = useMemo(() => {
    const hidden = calendarEvents.filter((ev) => ev.exclude_from_planner && ev.source === "outlook");
    const seen = new Set<string>();
    const out: CalendarEventRow[] = [];
    for (const ev of hidden) {
      const k = ev.outlook_recurrence_group_id ?? ev.outlook_event_id ?? ev.id;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(ev);
    }
    return out;
  }, [calendarEvents]);

  const plannerItems = useMemo(() => [...standardBlocks, ...tasks], [standardBlocks, tasks]);
  const editableTasksById = useMemo(
    () => Object.fromEntries(editableTasks.map((task) => [task.id, task])),
    [editableTasks],
  );
  const plannerItemsById = useMemo(
    () => Object.fromEntries(plannerItems.map((task) => [task.id, task])),
    [plannerItems],
  );

  const activeDate = useMemo(() => {
    if (dayPreset === "date") return selectedDate;
    const source = new Date();
    if (dayPreset === "tomorrow") source.setDate(source.getDate() + 1);
    return toYmd(source);
  }, [dayPreset, selectedDate]);

  const planningDayTabHighlight = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayIso = toYmd(today);
    const tomorrowIso = toYmd(tomorrow);
    return {
      heute: activeDate === todayIso,
      morgen: activeDate === tomorrowIso,
      calendar: activeDate !== todayIso && activeDate !== tomorrowIso,
    };
  }, [activeDate]);

  const placements = useMemo(() => dayPlans[activeDate] ?? [], [dayPlans, activeDate]);
  const isDayFinalized = Boolean(finalizedByDay[activeDate]);

  const effectivePlacements = useMemo(
    () => (autoPlanDraft !== null ? autoPlanDraft : placements),
    [autoPlanDraft, placements],
  );

  const effectiveDayPlans = useMemo(() => {
    if (autoPlanDraft === null) return dayPlans;
    return { ...dayPlans, [activeDate]: autoPlanDraft };
  }, [dayPlans, activeDate, autoPlanDraft]);

  useEffect(() => {
    setAutoPlanDraft(null);
  }, [activeDate]);

  useEffect(() => {
    const persisted = readPlannerStorage();
    setDayPlans(persisted.dayPlans);
    setFinalizedByDay(persisted.finalizedByDay);
    setStorageHydrated(true);
  }, []);

  useEffect(() => {
    setStandardBlocks(
      initialStandardBlocks.map((b) => normalizeStandardBlock({ ...b, kind: "standard" as const })),
    );
  }, [initialStandardBlocks]);

  const plannerItemsRef = useRef(plannerItems);
  plannerItemsRef.current = plannerItems;
  const validPlannerItemIdsKey = useMemo(
    () =>
      [...plannerItems.map((t) => t.id)].sort().join(","),
    [plannerItems],
  );

  useEffect(() => {
    if (!storageHydrated) return;
    const valid = new Set(plannerItemsRef.current.map((t) => t.id));
    const prune = (list: TaskPlacement[]) => list.filter((p) => valid.has(p.taskId));
    setDayPlans((current) => {
      let changed = false;
      const next: Record<string, TaskPlacement[]> = {};
      for (const [day, list] of Object.entries(current)) {
        const filtered = prune(list);
        if (filtered.length !== list.length) changed = true;
        next[day] = filtered;
      }
      return changed ? next : current;
    });
    setAutoPlanDraft((draft) => {
      if (draft === null) return null;
      const filtered = prune(draft);
      return filtered.length !== draft.length ? filtered : draft;
    });
  }, [validPlannerItemIdsKey, storageHydrated]);

  useEffect(() => {
    if (!storageHydrated) return;
    try {
      window.localStorage.setItem(
        PLANER_STORAGE_KEY,
        JSON.stringify({
          dayPlans,
          finalizedByDay,
        }),
      );
    } catch {
      // Ignore storage errors (private mode/quota).
    }
  }, [dayPlans, finalizedByDay, storageHydrated]);

  const planningHeaderDate = useMemo(() => {
    const source = new Date(`${activeDate}T12:00:00`);
    if (Number.isNaN(source.getTime())) return "";
    return source.toLocaleDateString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [activeDate]);

  const occupancyBySlot = useMemo(() => {
    const bySlot: Record<number, string> = {};
    for (const placement of effectivePlacements) {
      for (let offset = 0; offset < placement.slotCount; offset += 1) {
        const slot = placement.startSlot + offset;
        bySlot[slot] = placement.taskId;
      }
    }
    return bySlot;
  }, [effectivePlacements]);

  const eventBlocks = useMemo(() => {
    const startMinutes = START_HOUR * 60;
    const endMinutes = END_HOUR * 60;
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const raw: PlannerEventBlockDraft[] = [];
    for (const ev of eventsVisibleInPlanner) {
      const sens = ev.outlook_sensitivity ?? null;
      const seriesHeuristic =
        ev.source === "outlook" &&
        Boolean(ev.outlook_event_id && ev.outlook_recurrence_group_id) &&
        ev.outlook_recurrence_group_id !== ev.outlook_event_id;
      const isRec = Boolean(ev.outlook_is_recurring) || seriesHeuristic;
      if (ev.is_all_day) {
        raw.push({
          id: ev.id,
          title: ev.title || "Termin",
          startSlot: 0,
          slotCount: TOTAL_SLOTS,
          endSlotExclusive: TOTAL_SLOTS,
          source: ev.source,
          outlook_sensitivity: sens,
          outlook_is_recurring: isRec,
        });
        continue;
      }
      const start = new Date(ev.start_time);
      const end = new Date(ev.end_time);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) continue;

      const startParts = formatter.formatToParts(start);
      const endParts = formatter.formatToParts(end);
      const startYmd = `${startParts.find((p) => p.type === "year")?.value}-${startParts.find((p) => p.type === "month")?.value}-${startParts.find((p) => p.type === "day")?.value}`;
      const endYmd = `${endParts.find((p) => p.type === "year")?.value}-${endParts.find((p) => p.type === "month")?.value}-${endParts.find((p) => p.type === "day")?.value}`;
      if (startYmd > activeDate || endYmd < activeDate) continue;

      const startHour = Number(startParts.find((p) => p.type === "hour")?.value ?? "0");
      const startMinute = Number(startParts.find((p) => p.type === "minute")?.value ?? "0");
      const endHour = Number(endParts.find((p) => p.type === "hour")?.value ?? "0");
      const endMinute = Number(endParts.find((p) => p.type === "minute")?.value ?? "0");
      let from = startYmd < activeDate ? startMinutes : startHour * 60 + startMinute;
      let to = endYmd > activeDate ? endMinutes : endHour * 60 + endMinute;
      from = Math.max(startMinutes, Math.min(endMinutes, from));
      to = Math.max(startMinutes, Math.min(endMinutes, to));
      if (to <= from) continue;

      const startSlot = Math.max(0, Math.floor((from - startMinutes) / SLOT_MINUTES));
      const endSlotExclusive = Math.min(TOTAL_SLOTS, Math.ceil((to - startMinutes) / SLOT_MINUTES));
      const slotCount = endSlotExclusive - startSlot;
      if (slotCount <= 0) continue;
      raw.push({
        id: ev.id,
        title: ev.title || "Termin",
        startSlot,
        slotCount,
        endSlotExclusive,
        source: ev.source,
        outlook_sensitivity: sens,
        outlook_is_recurring: isRec,
      });
    }
    return assignOverlapLanes(raw);
  }, [eventsVisibleInPlanner, activeDate]);

  const blockedByEvents = useMemo(() => {
    const blocked: Record<number, PlannerEventBlock> = {};
    for (const block of eventBlocks) {
      for (let i = 0; i < block.slotCount; i += 1) {
        blocked[block.startSlot + i] = block;
      }
    }
    return blocked;
  }, [eventBlocks]);

  const plannedMinutesForHeader = useMemo(() => {
    const workStartSlot = (WORK_START_HOUR - START_HOUR) * SLOTS_PER_HOUR;
    const workEndSlotExclusive = (WORK_END_HOUR - START_HOUR) * SLOTS_PER_HOUR;
    const occupied = new Set<number>();

    for (const placement of effectivePlacements) {
      for (let i = 0; i < placement.slotCount; i += 1) {
        const slot = placement.startSlot + i;
        if (slot >= workStartSlot && slot < workEndSlotExclusive) occupied.add(slot);
      }
    }

    for (const eventBlock of eventBlocks) {
      for (let i = 0; i < eventBlock.slotCount; i += 1) {
        const slot = eventBlock.startSlot + i;
        if (slot >= workStartSlot && slot < workEndSlotExclusive) occupied.add(slot);
      }
    }

    return occupied.size * SLOT_MINUTES;
  }, [effectivePlacements, eventBlocks]);

  const freeMinutes = Math.max(0, DAY_CAPACITY_MINUTES - plannedMinutesForHeader);
  const utilizationRatio = plannedMinutesForHeader / DAY_CAPACITY_MINUTES;
  const overplannedMinutes = Math.max(0, plannedMinutesForHeader - DAY_CAPACITY_MINUTES);
  const overplannedHours = Math.floor(overplannedMinutes / 60);
  const overplannedRestMinutes = overplannedMinutes % 60;
  const plannedHoursCompact = Math.round((plannedMinutesForHeader / 60) * 10) / 10;
  const freeHoursCompact = Math.round((freeMinutes / 60) * 10) / 10;
  const capacityStatus =
    utilizationRatio < 0.7 ? "low" : utilizationRatio <= 1 ? "good" : "over";
  const statusText =
    capacityStatus === "low"
      ? "Noch viel offen"
      : capacityStatus === "good"
        ? "Gut im Plan"
        : `Überplant um ${overplannedHours}h ${overplannedRestMinutes}min`;
  const progressPercent = Math.min(utilizationRatio, 1.15) * 100;

  const placementByTaskId = useMemo(
    () => Object.fromEntries(effectivePlacements.map((placement) => [placement.taskId, placement])),
    [effectivePlacements],
  );
  const taskStatusById = useMemo(() => {
    const status: Record<string, TaskStatus> = {};
    for (const task of tasks) status[task.id] = "ungeplant";

    for (const [day, dayPlacements] of Object.entries(effectiveDayPlans)) {
      const finalized = Boolean(finalizedByDay[day]);
      for (const placement of dayPlacements) {
        const current = status[placement.taskId];
        if (current === "geplant") continue;
        status[placement.taskId] = finalized ? "geplant" : "in_planung";
      }
    }

    return status;
  }, [tasks, effectiveDayPlans, finalizedByDay]);

  const taskOpenPlanningDayById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [day, dayPlacements] of Object.entries(effectiveDayPlans)) {
      if (finalizedByDay[day]) continue;
      for (const p of dayPlacements) {
        if (map[p.taskId] === undefined) map[p.taskId] = day;
      }
    }
    return map;
  }, [effectiveDayPlans, finalizedByDay]);

  type PlanningSidebarEntry = { task: PlannerTask; mode: "free" | "reserved_elsewhere"; reservedOnIso?: string };

  const planningSidebarTasks = useMemo((): PlanningSidebarEntry[] => {
    const out: PlanningSidebarEntry[] = [];
    for (const task of tasks) {
      const st = taskStatusById[task.id] ?? "ungeplant";
      if (st === "geplant") continue;
      if (st === "ungeplant") {
        out.push({ task, mode: "free" });
        continue;
      }
      const dayIso = taskOpenPlanningDayById[task.id];
      if (!dayIso) continue;
      if (dayIso === activeDate) continue;
      out.push({ task, mode: "reserved_elsewhere", reservedOnIso: dayIso });
    }
    return out;
  }, [tasks, taskStatusById, taskOpenPlanningDayById, activeDate]);

  const freePlanningTasks = useMemo(
    () => planningSidebarTasks.filter((e) => e.mode === "free").map((e) => e.task),
    [planningSidebarTasks],
  );

  const unplannedStandardBlocks = useMemo(
    () =>
      standardBlocks.filter(
        (block) => isStandardBlockDueOn(block, activeDate) && !placementByTaskId[block.id],
      ),
    [standardBlocks, placementByTaskId, activeDate],
  );

  useEffect(() => {
    if (!autoPlanFeedback) return;
    const timer = window.setTimeout(() => setAutoPlanFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [autoPlanFeedback]);

  const canPlaceTask = useCallback((basePlacements: TaskPlacement[], taskId: string, startSlot: number, slotCount: number) => {
    const endSlotExclusive = startSlot + slotCount;
    if (startSlot < 0 || endSlotExclusive > TOTAL_SLOTS) return false;
    for (let slot = startSlot; slot < endSlotExclusive; slot += 1) {
      if (blockedByEvents[slot]) return false;
    }
    const withoutTask = basePlacements.filter((placement) => placement.taskId !== taskId);
    return !withoutTask.some((placement) => {
      const existingStart = placement.startSlot;
      const existingEnd = placement.startSlot + placement.slotCount;
      return startSlot < existingEnd && endSlotExclusive > existingStart;
    });
  }, [blockedByEvents]);

  const dropRangePreview = useMemo(() => {
    if (!draggingTaskId || dropHoverSlot === null) {
      return { start: null as number | null, count: 0, valid: false };
    }
    const t = plannerItemsById[draggingTaskId];
    if (!t) return { start: null, count: 0, valid: false };
    const count = Math.max(1, Math.ceil(t.durationMinutes / SLOT_MINUTES));
    const valid = canPlaceTask(effectivePlacements, draggingTaskId, dropHoverSlot, count);
    return { start: dropHoverSlot, count, valid };
  }, [draggingTaskId, dropHoverSlot, effectivePlacements, plannerItemsById, canPlaceTask]);

  const calendarDragPreview = useMemo(() => {
    if (!draggingTaskId || dropRangePreview.start === null || !dropRangePreview.count) return null;
    const task = plannerItemsById[draggingTaskId];
    if (!task) return null;
    const heightPx = dropRangePreview.count * SLOT_ROW_HEIGHT_PX;
    return {
      task,
      valid: dropRangePreview.valid,
      topPx: dropRangePreview.start * SLOT_ROW_HEIGHT_PX,
      heightPx,
      thin: heightPx < 40,
    };
  }, [draggingTaskId, dropRangePreview, plannerItemsById]);

  function findNextFreeStartSlot(taskId: string, basePlacements: TaskPlacement[]) {
    const task = plannerItemsById[taskId];
    if (!task) return null;
    const slotCount = Math.ceil(task.durationMinutes / SLOT_MINUTES);
    const workStartSlot = (WORK_START_HOUR - START_HOUR) * SLOTS_PER_HOUR;
    const workEndSlotExclusive = (WORK_END_HOUR - START_HOUR) * SLOTS_PER_HOUR;
    const lastStart = workEndSlotExclusive - slotCount;
    for (let startSlot = workStartSlot; startSlot <= lastStart; startSlot += 1) {
      if (canPlaceTask(basePlacements, taskId, startSlot, slotCount)) {
        return { startSlot, slotCount };
      }
    }
    return null;
  }

  const hoverSuggestion =
    hoveredTaskId && taskStatusById[hoveredTaskId] === "ungeplant" && !placementByTaskId[hoveredTaskId]
      ? findNextFreeStartSlot(hoveredTaskId, effectivePlacements)
      : null;
  const unplannedTasksTotalMinutes = useMemo(
    () => freePlanningTasks.reduce((sum, task) => sum + task.durationMinutes, 0),
    [freePlanningTasks],
  );
  const calendarDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const iso = toYmd(date);
      const plannedMinutes = (effectiveDayPlans[iso] ?? []).reduce((sum, placement) => {
        const item = plannerItemsById[placement.taskId];
        return sum + (item?.durationMinutes ?? placement.slotCount * SLOT_MINUTES);
      }, 0);
      const freeMinutes = Math.max(DAY_CAPACITY_MINUTES - plannedMinutes, 0);
      return {
        iso,
        label: date.toLocaleDateString("de-DE", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
        }),
        planningStatus: finalizedByDay[iso]
          ? "geplant"
          : (effectiveDayPlans[iso]?.length ?? 0) > 0
            ? "in_planung"
            : "offen",
        dueStandardCount: standardBlocks.filter((block) => isStandardBlockDueOn(block, iso)).length,
        dueStandardMinutes: standardBlocks
          .filter((block) => isStandardBlockDueOn(block, iso))
          .reduce((sum, block) => sum + block.durationMinutes, 0),
        plannedMinutes,
        freeMinutes,
        estimatedEffortMinutes:
          standardBlocks
            .filter((block) => isStandardBlockDueOn(block, iso))
            .reduce((sum, block) => sum + block.durationMinutes, 0) + unplannedTasksTotalMinutes,
      };
    });
  }, [effectiveDayPlans, finalizedByDay, plannerItemsById, standardBlocks, unplannedTasksTotalMinutes]);
  const unplannedDays = useMemo(() => calendarDays.filter((day) => day.planningStatus !== "geplant"), [calendarDays]);
  const bestDayIso = useMemo(() => {
    if (unplannedDays.length === 0) return null;
    const ranked = [...unplannedDays].sort((a, b) => {
      if (a.estimatedEffortMinutes !== b.estimatedEffortMinutes) {
        return b.estimatedEffortMinutes - a.estimatedEffortMinutes;
      }
      return b.freeMinutes - a.freeMinutes;
    });
    return ranked[0]?.iso ?? null;
  }, [unplannedDays]);
  const relevantDays = useMemo(() => calendarDays.slice(0, 5), [calendarDays]);
  const monthDays = useMemo(() => {
    const base = new Date(`${overviewMonthIso}T12:00:00`);
    const current = Number.isNaN(base.getTime()) ? new Date() : base;
    const year = current.getFullYear();
    const month = current.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const leading = (start.getDay() + 6) % 7;
    const total = leading + end.getDate();
    const cells = Math.ceil(total / 7) * 7;
    return Array.from({ length: cells }, (_, idx) => {
      const dayNumber = idx - leading + 1;
      if (dayNumber < 1 || dayNumber > end.getDate()) return null;
      const date = new Date(year, month, dayNumber);
      const iso = toYmd(date);
      return {
        iso,
        day: dayNumber,
        planningStatus: finalizedByDay[iso]
          ? "geplant"
          : (effectiveDayPlans[iso]?.length ?? 0) > 0
            ? "in_planung"
            : "offen",
      };
    });
  }, [overviewMonthIso, effectiveDayPlans, finalizedByDay]);

  const reloadDayEvents = useCallback(async () => {
    const res = await fetchPlanerDayEvents(activeDate);
    if (res.ok) setCalendarEvents(normalizePlannerCalendarEvents(res.events));
  }, [activeDate]);

  const runPlannerHybridSync = useCallback(
    async (reason: CalendarSyncReason, mode: CalendarSyncMode) => {
      if (plannerSyncBusyRef.current) return;
      plannerSyncBusyRef.current = true;
      setCalendarSyncStatus("Kalender wird aktualisiert …");
      try {
        const res = await runCalendarHybridSync({
          fromYmd: activeDate,
          toYmd: activeDate,
          reason,
          mode,
          changedSinceIso: plannerLastSyncIsoRef.current,
        });
        if (!res.ok) {
          setCalendarSyncStatus(`Sync-Problem: ${res.error}`);
          return;
        }
        plannerLastSyncIsoRef.current = res.syncedAtIso;
        if (res.events.length > 0 || res.outlookChangedCount > 0 || mode === "full") {
          await reloadDayEvents();
        } else {
          setCalendarSyncStatus(null);
        }
      } finally {
        plannerSyncBusyRef.current = false;
      }
    },
    [activeDate, reloadDayEvents],
  );

  function openPlannerOutlookEventEdit(ev: CalendarEventRow) {
    if (ev.source !== "outlook") return;
    setPlannerCalendarEditing(ev);
    setCalDlgTitle(ev.title);
    setCalDlgDescription(ev.description ?? "");
    setCalDlgIsAllDay(ev.is_all_day);
    if (ev.is_all_day) {
      setCalDlgDayDate(localDateFromDate(new Date(ev.start_time)));
    } else {
      setCalDlgStartLocal(localDatetimeLocalFromDate(new Date(ev.start_time)));
      setCalDlgEndLocal(localDatetimeLocalFromDate(new Date(ev.end_time)));
    }
    setCalDlgError(null);
    setPlannerCalendarDialogOpen(true);
  }

  function closePlannerOutlookEventEdit() {
    setPlannerCalendarDialogOpen(false);
    setPlannerCalendarEditing(null);
    setCalDlgError(null);
  }

  function buildPlannerOutlookEventPayload():
    | { ok: true; payload: CalendarEventFormPayload }
    | { ok: false; error: string } {
    if (!calDlgTitle.trim()) return { ok: false, error: "Titel ist Pflichtfeld." };
    if (calDlgIsAllDay) {
      if (!calDlgDayDate) return { ok: false, error: "Datum wählen." };
      const [Y, M, D] = calDlgDayDate.split("-").map(Number);
      const start = new Date(Y, M - 1, D, 0, 0, 0, 0);
      const end = new Date(Y, M - 1, D, 23, 59, 59, 999);
      return {
        ok: true,
        payload: {
          title: calDlgTitle.trim(),
          description: calDlgDescription.trim(),
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          is_all_day: true,
        },
      };
    }
    const s = new Date(calDlgStartLocal);
    const e = new Date(calDlgEndLocal);
    if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime())) {
      return { ok: false, error: "Start und Ende gültig ausfüllen." };
    }
    if (e <= s) return { ok: false, error: "Ende muss nach dem Start liegen." };
    return {
      ok: true,
      payload: {
        title: calDlgTitle.trim(),
        description: calDlgDescription.trim(),
        start_time: s.toISOString(),
        end_time: e.toISOString(),
        is_all_day: false,
      },
    };
  }

  async function submitPlannerOutlookEventEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plannerCalendarEditing) return;
    const built = buildPlannerOutlookEventPayload();
    if (!built.ok) {
      setCalDlgError(built.error);
      return;
    }
    setCalDlgError(null);
    setCalDlgPending(true);
    try {
      const res = await updateCalendarEvent(plannerCalendarEditing.id, built.payload);
      if (!res.ok) {
        setCalDlgError(res.error);
        return;
      }
      closePlannerOutlookEventEdit();
      await runPlannerHybridSync("write-confirmation", "delta");
    } finally {
      setCalDlgPending(false);
    }
  }

  async function deletePlannerOutlookEvent() {
    if (!plannerCalendarEditing) return;
    if (!window.confirm("Termin wirklich löschen? Er wird auch in Outlook entfernt.")) return;
    setCalDlgPending(true);
    try {
      const res = await deleteCalendarEvent(plannerCalendarEditing.id);
      if (!res.ok) {
        setCalDlgError(res.error);
        return;
      }
      closePlannerOutlookEventEdit();
      await runPlannerHybridSync("write-confirmation", "delta");
    } finally {
      setCalDlgPending(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetchPlanerDayEvents(activeDate);
      if (cancelled) return;
      if (res.ok) setCalendarEvents(normalizePlannerCalendarEvents(res.events));
    })();
    plannerLastSyncIsoRef.current = null;
    void runPlannerHybridSync("initial", "full");
    return () => {
      cancelled = true;
    };
  }, [activeDate, runPlannerHybridSync]);

  useEffect(() => {
    const markActive = () => {
      plannerLastInteractionMsRef.current = Date.now();
    };
    const onFocus = () => void runPlannerHybridSync("focus", "delta");
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const idleMs = Date.now() - plannerLastInteractionMsRef.current;
      void runPlannerHybridSync(idleMs > 4 * 60_000 ? "resume" : "focus", "delta");
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
  }, [runPlannerHybridSync]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const idleMs = Date.now() - plannerLastInteractionMsRef.current;
      const reason: CalendarSyncReason = idleMs <= 90_000 ? "interval-active" : "interval-idle";
      void runPlannerHybridSync(reason, "delta");
    }, 60_000);
    return () => window.clearInterval(id);
  }, [runPlannerHybridSync]);

  const goPlanningDay = useCallback(
    (iso: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
      setSelectedDate(iso);
      setDayPreset("date");
      setOverviewMonthIso(firstOfMonthIso(iso));
      if (embedInCalendar) {
        const path = pathname || "/kalender";
        const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
        sp.set("v", "day");
        sp.set("d", iso);
        sp.set("plan", "planen");
        router.push(`${path}?${sp.toString()}`);
      }
    },
    [embedInCalendar, pathname, router],
  );

  useEffect(() => {
    if (!embedInCalendar) return;
    const anchor = calendarAnchorDate?.trim();
    if (!anchor || !/^\d{4}-\d{2}-\d{2}$/.test(anchor)) return;
    setSelectedDate(anchor);
    setDayPreset("date");
    setOverviewMonthIso(firstOfMonthIso(anchor));
  }, [embedInCalendar, calendarAnchorDate]);

  function handleDropTask(startSlot: number, taskId: string) {
    if (isDayFinalized) return false;
    const task = plannerItemsById[taskId];
    if (!task) return false;

    const slotCount = Math.ceil(task.durationMinutes / SLOT_MINUTES);
    const base = effectivePlacements;
    if (!canPlaceTask(base, taskId, startSlot, slotCount)) return false;

    const withoutTask = base.filter((placement) => placement.taskId !== taskId);
    const next = [...withoutTask, { taskId, startSlot, slotCount }];
    if (autoPlanDraft !== null) {
      setAutoPlanDraft(next);
    } else {
      setDayPlans((current) => ({ ...current, [activeDate]: next }));
    }
    setProposal(null);
    setHoveredTaskId(null);
    setInlineNotice(null);
    setDropHoverSlot(null);
    setUnplanCandidateTaskId(null);
    return true;
  }

  function openPlanningDay(iso: string) {
    setDayClickFlashIso(iso);
    window.setTimeout(() => {
      setDayClickFlashIso((current) => (current === iso ? null : current));
    }, 280);
    goPlanningDay(iso);
    setMode("planning");
    setInlineNotice(null);
  }

  function openCreateTaskDialog() {
    setTaskDialogMode("create");
    setEditingTask(null);
    setTaskDialogOpen(true);
  }

  function openEditTaskDialog(taskId: string) {
    const task = editableTasksById[taskId];
    if (!task) {
      setInlineNotice("Task konnte nicht geöffnet werden.");
      return;
    }
    setExpandedInlineTaskId((current) => (current === task.id ? null : task.id));
  }

  function handleUnplanTask(taskId: string) {
    if (isDayFinalized) return;
    if (autoPlanDraft !== null) {
      setAutoPlanDraft((draft) => (draft === null ? null : draft.filter((placement) => placement.taskId !== taskId)));
    } else {
      setDayPlans((current) => ({
        ...current,
        [activeDate]: (current[activeDate] ?? []).filter((placement) => placement.taskId !== taskId),
      }));
    }
    setDropHoverSlot(null);
    setProposal(null);
    setInlineNotice(null);
    setUnplanCandidateTaskId(null);
  }

  function removeTaskFromDayPlan(taskId: string, dayIso: string) {
    if (finalizedByDay[dayIso]) {
      setInlineNotice(
        "Dieser Tag ist fixiert — wechsle zu diesem Tag und wähle oben rechts „Planung bearbeiten“, um den Task zu entfernen.",
      );
      return;
    }
    if (dayIso === activeDate && autoPlanDraft !== null) {
      setAutoPlanDraft((draft) => (draft === null ? null : draft.filter((placement) => placement.taskId !== taskId)));
    } else {
      setDayPlans((current) => ({
        ...current,
        [dayIso]: (current[dayIso] ?? []).filter((placement) => placement.taskId !== taskId),
      }));
    }
    setProposal((p) => (p?.taskId === taskId ? null : p));
    setDraggingTaskId((d) => (d === taskId ? null : d));
    setHoveredTaskId((h) => (h === taskId ? null : h));
    setUnplanCandidateTaskId((u) => (u === taskId ? null : u));
    setDropHoverSlot(null);
    setInlineNotice("Task aus der Planung des anderen Tages entfernt — hier wieder nutzbar.");
  }

  function clearDayPlan() {
    if (isDayFinalized) return;
    if (autoPlanDraft !== null) {
      setAutoPlanDraft([]);
      setProposal(null);
      setUnplanCandidateTaskId(null);
      setInlineNotice("Entwurf geleert — übernehmen speichert einen leeren Tag, oder Entwurf verwerfen.");
    } else {
      setDayPlans((current) => ({ ...current, [activeDate]: [] }));
      setProposal(null);
      setUnplanCandidateTaskId(null);
      setInlineNotice("Alle eingeplanten Tasks wurden entfernt.");
    }
  }

  function startTaskDrag(taskId: string, event: DragEvent<HTMLElement>) {
    if (isDayFinalized) {
      event.preventDefault();
      setInlineNotice("Tag ist fixiert. Wähle oben rechts „Planung bearbeiten“, um wieder zu bearbeiten.");
      return;
    }
    event.dataTransfer.setData("text/task-id", taskId);
    event.dataTransfer.effectAllowed = "move";
    primePlannerTransparentDragImage(event);

    setDraggingTaskId(taskId);
    setProposal(null);
    setInlineNotice(null);
    setUnplanCandidateTaskId(null);
  }

  function endTaskDrag() {
    setDraggingTaskId(null);
    setDropHoverSlot(null);
    setDragEpoch((current) => current + 1);
  }

  function formatSlotLabel(slotIndex: number) {
    const totalMinutes = START_HOUR * 60 + slotIndex * SLOT_MINUTES;
    const hour = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  async function runAutoPlanning() {
    if (isDayFinalized || autoPlanning) return;
    setAutoPlanning(true);
    setInlineNotice(null);
    setProposal(null);
    setUnplanCandidateTaskId(null);

    const basePlacements = [...placements];
    let workingPlacements = [...basePlacements];
    let plannedCount = 0;

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const candidates = [...unplannedStandardBlocks, ...freePlanningTasks];
    for (const task of candidates) {
      const nextFree = findNextFreeStartSlot(task.id, workingPlacements);
      if (!nextFree) continue;
      workingPlacements = [
        ...workingPlacements.filter((placement) => placement.taskId !== task.id),
        { taskId: task.id, startSlot: nextFree.startSlot, slotCount: nextFree.slotCount },
      ];
      setAutoPlanDraft([...workingPlacements]);
      plannedCount += 1;
      await wait(180);
    }

    const notPlannedCount = candidates.length - plannedCount;
    if (plannedCount === 0) {
      setAutoPlanDraft(null);
      setAutoPlanFeedback({ tone: "info", message: "Kein passender Zeitraum frei." });
      setInlineNotice("Kein passender Zeitraum frei");
    } else if (notPlannedCount > 0) {
      const plannedLabel = plannedCount === 1 ? "1 Block eingeplant" : `${plannedCount} Blöcke eingeplant`;
      const remainingLabel =
        notPlannedCount === 1
          ? "1 Block passt heute nicht mehr rein."
          : `${notPlannedCount} Blöcke passen heute nicht mehr rein.`;
      setAutoPlanFeedback({ tone: "info", message: `${plannedLabel}, ${remainingLabel}` });
      setInlineNotice(
        `Planungsentwurf: ${notPlannedCount} Task(s) passen nicht mehr in den Tag. Anpassen, übernehmen oder verwerfen.`,
      );
    } else {
      const plannedLabel = plannedCount === 1 ? "1 Block eingeplant" : `${plannedCount} Blöcke eingeplant`;
      setAutoPlanFeedback({ tone: "success", message: `${plannedLabel}. Entwurf prüfen und übernehmen.` });
      setInlineNotice("Planungsentwurf erstellt — mit „Entwurf übernehmen“ speichern oder anpassen.");
    }
    setAutoPlanning(false);
  }

  function commitAutoPlanDraft() {
    if (autoPlanDraft === null) return;
    setDayPlans((current) => ({ ...current, [activeDate]: autoPlanDraft }));
    setAutoPlanDraft(null);
    setProposal(null);
    setUnplanCandidateTaskId(null);
    setAutoPlanFeedback(null);
    setInlineNotice("Planungsentwurf übernommen und gespeichert.");
  }

  function discardAutoPlanDraft() {
    if (autoPlanDraft === null) return;
    setAutoPlanDraft(null);
    setProposal(null);
    setUnplanCandidateTaskId(null);
    setAutoPlanFeedback(null);
    setInlineNotice("Planungsentwurf verworfen — gespeicherte Planung unverändert.");
  }

  return (
    <div
      className="space-y-6"
      onDragEndCapture={() => {
        endTaskDrag();
      }}
      onDragOver={(event) => {
        if (draggingTaskId && placementByTaskId[draggingTaskId]) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }
      }}
      onDrop={(event) => {
        const draggingPlannedTaskId =
          draggingTaskId && placementByTaskId[draggingTaskId] ? draggingTaskId : null;
        if (!draggingPlannedTaskId) return;

        const dropTarget = event.target as HTMLElement | null;
        const isInsideCalendar = Boolean(dropTarget?.closest('[data-planner-calendar="true"]'));
        if (isInsideCalendar) {
          endTaskDrag();
          return;
        }

        event.preventDefault();
        handleUnplanTask(draggingPlannedTaskId);
        endTaskDrag();
      }}
    >
      {mode === "overview" ? (
        <>
          <div className="flex flex-col gap-3 border-b border-leif-border pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-leif-text">Planer</h1>
              <p className="text-sm text-leif-secondary">Übersicht über nicht geplante Tasks und offene Kalendertage.</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <section className="space-y-3 lg:col-span-4 lg:order-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-leif-secondary">
                <CalendarDays className="h-4 w-4 text-leif-secondary" />
                Monat
              </h2>
              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-leif-secondary">
                  <button
                    type="button"
                    onClick={() => {
                      const date = new Date(`${overviewMonthIso}T12:00:00`);
                      date.setMonth(date.getMonth() - 1);
                      setOverviewMonthIso(toYmd(new Date(date.getFullYear(), date.getMonth(), 1)));
                    }}
                    className="rounded border border-transparent px-1.5 py-0.5 transition-colors hover:border-slate-300 hover:bg-white"
                    aria-label="Vorheriger Monat"
                  >
                    &lt;
                  </button>
                  <span>{new Date(`${overviewMonthIso}T12:00:00`).toLocaleDateString("de-DE", { month: "long", year: "numeric" })}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const date = new Date(`${overviewMonthIso}T12:00:00`);
                      date.setMonth(date.getMonth() + 1);
                      setOverviewMonthIso(toYmd(new Date(date.getFullYear(), date.getMonth(), 1)));
                    }}
                    className="rounded border border-transparent px-1.5 py-0.5 transition-colors hover:border-slate-300 hover:bg-white"
                    aria-label="Nächster Monat"
                  >
                    &gt;
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-leif-muted">
                  {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((label) => (
                    <div key={label}>{label}</div>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {monthDays.map((cell, idx) =>
                    cell ? (
                      <button
                        key={cell.iso}
                        type="button"
                        onClick={() => openPlanningDay(cell.iso)}
                        className={cn(
                          "relative h-8 rounded-md border border-slate-200 bg-white text-xs text-slate-700 transition-colors hover:bg-slate-50",
                          cell.iso === selectedDate ? "border-[#456990] ring-1 ring-[#456990]/30" : "",
                        )}
                      >
                        {cell.day}
                        <span
                          className={cn(
                            "absolute bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full",
                            cell.iso === bestDayIso
                              ? "bg-[#456990]"
                              : cell.planningStatus === "geplant"
                                ? "bg-emerald-500"
                                : cell.planningStatus === "in_planung"
                                  ? "bg-amber-400"
                                  : "bg-slate-300",
                          )}
                        />
                      </button>
                    ) : (
                      <div key={`empty-${idx}`} className="h-8" />
                    ),
                  )}
                </div>
              </div>
            </section>
            <section className="space-y-4 lg:col-span-8 lg:order-1">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-leif-secondary">
                <CalendarDays className="h-4 w-4 text-leif-secondary" />
                Nächste Planungstage
              </h2>
              {unplannedDays.length === 0 ? (
                <div className="rounded-xl border border-dashed border-leif-border bg-leif-canvas/60 p-4 text-sm text-leif-secondary">
                  Alle kommenden Tage sind bereits geplant.
                </div>
              ) : (
                <div className="space-y-3">
                  {relevantDays.map((day) => {
                    const plannedHours = Math.round((day.plannedMinutes / 60) * 10) / 10;
                    const freeHours = Math.round((Math.max(day.freeMinutes, 0) / 60) * 10) / 10;
                    return (
                      <div
                        key={day.iso}
                        onClick={() => openPlanningDay(day.iso)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openPlanningDay(day.iso);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className={cn(
                          "flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-800 transition-all duration-150 hover:bg-slate-50",
                          day.iso === bestDayIso && day.iso !== selectedDate
                            ? "border-[#456990] bg-[rgba(69,105,144,0.08)]"
                            : "",
                          day.iso === selectedDate ? "border-[#456990] shadow-[0_4px_14px_-10px_rgba(69,105,144,0.45)]" : "",
                          dayClickFlashIso === day.iso ? "ring-2 ring-leif-primary/40" : "",
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-2 font-medium">
                            <span>{new Date(`${day.iso}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}</span>
                            {day.planningStatus === "geplant" ? <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden /> : null}
                            {day.iso === bestDayIso ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-[#456990] bg-[rgba(69,105,144,0.08)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#456990]">
                                <span aria-hidden>★</span>
                                Empfohlen
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-0.5 text-xs text-leif-secondary">Geplant: {plannedHours}h / 8h</div>
                          <div className="text-xs text-leif-secondary">Frei: {freeHours}h</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              day.planningStatus === "in_planung"
                                ? "border-amber-300 bg-amber-50 text-amber-800"
                                : "border-slate-300 bg-slate-100 text-slate-700",
                            )}
                          >
                            {day.planningStatus === "in_planung" ? "In Planung" : "Offen"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </>
      ) : (
        <div className="space-y-1.5">
          {standardBlocksLoadError ? (
            <AlertBanner variant="error">Standardblöcke konnten nicht geladen werden: {standardBlocksLoadError}</AlertBanner>
          ) : null}
          <div className="border-b border-leif-border pb-0">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setMode("overview")}
                className="text-xs font-medium text-leif-secondary underline-offset-2 transition-colors hover:text-leif-text hover:underline"
              >
                Zur Übersicht
              </button>
              <h1 className="text-2xl font-semibold tracking-tight text-leif-text sm:text-3xl">Planer</h1>
            </div>
            <div className="mt-2 space-y-1">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs font-semibold",
                        capacityStatus === "over"
                          ? "border-red-300 bg-red-50 text-red-700"
                          : capacityStatus === "good"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-amber-300 bg-amber-50 text-amber-700",
                      )}
                    >
                      {statusText}
                    </span>
                    <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-leif-secondary">
                      Geplant: {plannedHoursCompact}h / 8h
                    </span>
                    <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-leif-secondary">
                      {capacityStatus === "over" ? "Frei: 0h" : `Frei: ${freeHoursCompact}h`}
                    </span>
                  </div>
                  <p className="shrink-0 text-right text-xl font-semibold tracking-tight text-leif-text sm:text-2xl">
                    {planningHeaderDate}
                  </p>
                </div>
                <div className="h-4 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={cn(
                      "h-full transition-all duration-200 ease-out",
                      capacityStatus === "over" ? "bg-red-500" : "bg-[#456990]",
                    )}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          {autoPlanFeedback ? (
            <div
              className={cn(
                "flex items-center justify-between rounded-md border px-3 py-2 text-sm",
                autoPlanFeedback.tone === "success"
                  ? "border-blue-200 bg-blue-50 text-blue-800"
                  : "border-slate-200 bg-slate-50 text-slate-700",
              )}
            >
              <span>{autoPlanFeedback.message}</span>
              <button
                type="button"
                onClick={() => setAutoPlanFeedback(null)}
                className="ml-3 text-xs font-medium text-current/80 transition-opacity hover:opacity-70"
                aria-label="Hinweis schließen"
              >
                Schließen
              </button>
            </div>
          ) : null}

          {autoPlanDraft !== null ? (
            <div className="rounded-md border border-amber-300/90 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 shadow-sm">
              <p className="font-semibold">Planungsentwurf aktiv</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
                Der automatische Plan ist noch nicht gespeichert. Du kannst Blöcke verschieben oder entfernen — erst
                „Entwurf übernehmen“ schreibt in die gespeicherte Tagesplanung.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => commitAutoPlanDraft()}>
                  Entwurf übernehmen
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => discardAutoPlanDraft()}>
                  Entwurf verwerfen
                </Button>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-y-2 lg:grid-cols-12 lg:items-center lg:gap-x-8">
            <div className="flex flex-wrap items-center gap-2 lg:col-span-8">
              <button
                type="button"
                onClick={() => {
                  void runAutoPlanning();
                }}
                disabled={isDayFinalized || autoPlanning}
                className={cn(
                  "inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors",
                  isDayFinalized || autoPlanning
                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                    : "border-slate-300 bg-white text-leif-secondary hover:border-slate-400 hover:bg-slate-50 hover:text-leif-text",
                )}
              >
                {autoPlanning ? "Automatisch planen…" : "Automatisch planen"}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearDayPlan();
                }}
                disabled={isDayFinalized || effectivePlacements.length === 0}
                title="Alle Tasks aus dem Kalender entfernen"
                aria-label="Alle Tasks aus dem Kalender entfernen"
                className={cn(
                  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-red-600 transition-colors",
                  isDayFinalized || effectivePlacements.length === 0
                    ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                    : "border-red-200 bg-red-50 hover:border-red-300 hover:bg-red-100",
                )}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
              {autoPlanning ? (
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-leif-secondary animate-pulse">
                  Verteile Tasks...
                </span>
              ) : null}
            </div>
            <div className="flex justify-start lg:col-span-4 lg:justify-end">
              <button
                type="button"
                disabled={!isDayFinalized && autoPlanDraft !== null}
                title={
                  !isDayFinalized && autoPlanDraft !== null
                    ? "Zuerst Planungsentwurf übernehmen oder verwerfen."
                    : undefined
                }
                onClick={() =>
                  setFinalizedByDay((current) => ({
                    ...current,
                    [activeDate]: !Boolean(current[activeDate]),
                  }))
                }
                className={cn(
                  "inline-flex h-9 shrink-0 items-center justify-center rounded-md border px-3 text-sm font-semibold transition-colors",
                  !isDayFinalized && autoPlanDraft !== null
                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                    : isDayFinalized
                      ? "border-slate-300 bg-white text-[#456990] hover:border-slate-400 hover:bg-slate-50"
                      : "border-[#456990] bg-[#456990] text-white hover:bg-[#456990]/90",
                )}
              >
                {isDayFinalized ? "Planung bearbeiten" : "Planung durchführen"}
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-x-0 gap-y-2.5 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-2.5 lg:items-stretch">
            <div className="order-3 flex min-h-9 items-center justify-between lg:order-none lg:col-span-4 lg:col-start-9 lg:row-start-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-leif-secondary">Standardblöcke</h3>
              <Link
                href="/einstellungen#standard-bloecke"
                className="rounded-md border border-leif-border bg-leif-surface p-1 text-leif-secondary transition-colors hover:text-leif-text"
                aria-label="Standardblöcke in Einstellungen verwalten"
                title="In Einstellungen anlegen oder bearbeiten"
              >
                <Plus className="h-4 w-4" />
              </Link>
            </div>
            <div className="order-1 flex min-h-9 flex-wrap items-center justify-between gap-x-2 gap-y-2 lg:order-none lg:col-span-8 lg:col-start-1 lg:row-start-1">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-leif-secondary">Tageskalender</h3>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {[
                  { value: "today", label: "Heute" },
                  { value: "tomorrow", label: "Morgen" },
                ].map((option) => {
                  const isActive =
                    option.value === "today" ? planningDayTabHighlight.heute : planningDayTabHighlight.morgen;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        if (embedInCalendar) {
                          const todayIso = toYmd(new Date());
                          const iso = option.value === "today" ? todayIso : addDaysToIso(todayIso, 1);
                          goPlanningDay(iso);
                          return;
                        }
                        setDayPreset(option.value as PlanDayPreset);
                      }}
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
                        isActive
                          ? "border-[#456990] bg-[rgba(69,105,144,0.08)] text-[#456990]"
                          : "border-slate-200 bg-white text-leif-secondary hover:border-slate-300 hover:text-leif-text",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
                <input
                  ref={planDateInputRef}
                  type="date"
                  value={selectedDate}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) return;
                    goPlanningDay(next);
                  }}
                  className="sr-only"
                  tabIndex={-1}
                  aria-label="Planungsdatum"
                />
                <button
                  type="button"
                  onClick={() => {
                    const el = planDateInputRef.current;
                    if (!el) return;
                    if (typeof el.showPicker === "function") {
                      try {
                        el.showPicker();
                      } catch {
                        el.click();
                      }
                    } else {
                      el.click();
                    }
                  }}
                  className={cn(
                    "rounded-md border p-1.5 transition-colors",
                    planningDayTabHighlight.calendar
                      ? "border-[#456990] bg-[rgba(69,105,144,0.08)] text-[#456990]"
                      : "border-slate-200 bg-white text-leif-secondary hover:border-slate-300 hover:text-leif-text",
                  )}
                  title="Datum wählen"
                  aria-label="Datum wählen"
                >
                  <Calendar className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    goPlanningDay(addDaysToIso(selectedDate, -1));
                  }}
                  className="shrink-0 rounded-md border border-slate-200 bg-white p-1 text-leif-secondary transition-colors hover:border-slate-300 hover:text-leif-text"
                  title="Vorheriger Tag"
                  aria-label="Vorheriger Tag"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    goPlanningDay(addDaysToIso(selectedDate, 1));
                  }}
                  className="shrink-0 rounded-md border border-slate-200 bg-white p-1 text-leif-secondary transition-colors hover:border-slate-300 hover:text-leif-text"
                  title="Nächster Tag"
                  aria-label="Nächster Tag"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
            <div className="order-4 flex min-h-0 flex-col gap-4 lg:order-none lg:col-span-4 lg:col-start-9 lg:row-start-2 lg:h-full lg:min-h-0 lg:border-l lg:border-slate-200/70 lg:pl-8">
              <div className="space-y-2">
              {unplannedStandardBlocks.map((block) => {
                const standardListCardHeightPx = plannerTaskListCardHeightPx(block.durationMinutes);
                return (
                <article
                  key={block.id}
                  draggable={!isDayFinalized}
                  style={{ height: standardListCardHeightPx }}
                  onClick={() => {
                    if (isDayFinalized) {
                      setInlineNotice("Tag ist fixiert. Wähle oben rechts „Planung bearbeiten“, um wieder zu bearbeiten.");
                      return;
                    }
                    if (proposal?.taskId === block.id) {
                      const planned = handleDropTask(proposal.startSlot, block.id);
                      if (!planned) setInlineNotice("Kein passender Zeitraum frei");
                      return;
                    }
                    const nextFree = findNextFreeStartSlot(block.id, effectivePlacements);
                    if (!nextFree) {
                      setProposal(null);
                      setInlineNotice("Kein passender Zeitraum frei");
                      return;
                    }
                    setInlineNotice(null);
                    setProposal({ taskId: block.id, startSlot: nextFree.startSlot, slotCount: nextFree.slotCount });
                  }}
                  onDragStart={(event) => {
                    startTaskDrag(block.id, event);
                  }}
                  onDragEnd={endTaskDrag}
                  className={cn(
                    "group flex min-h-0 cursor-grab flex-col justify-between gap-1 overflow-hidden rounded-lg border border-dashed border-slate-300/90 bg-slate-50/60 px-2.5 py-2 transition-[height,box-shadow,opacity,transform] duration-200 ease-out active:cursor-grabbing",
                    isDayFinalized ? "cursor-not-allowed opacity-80" : "",
                    draggingTaskId === block.id ? "scale-[0.99] opacity-70" : "",
                    proposal?.taskId === block.id ? "border-leif-primary/40" : "",
                  )}
                >
                  <div className="flex min-h-0 flex-1 items-start gap-2">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <h4 className="line-clamp-3 text-sm font-medium leading-snug text-slate-700 [overflow-wrap:anywhere]">
                        {block.title}
                      </h4>
                      <p className="line-clamp-2 text-[10px] leading-snug text-slate-500">
                        {formatRecurrenceLabel(normalizeRecurrenceRule(block.recurrenceRule, block.frequency))}
                        {block.description ? ` · ${block.description}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-slate-200 bg-white px-1.5 py-px text-[10px] font-semibold tabular-nums leading-none text-slate-600">
                      {block.durationMinutes} min
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center border-t border-transparent pt-0.5">
                    <Link
                      href="/einstellungen#standard-bloecke"
                      onClick={(event) => event.stopPropagation()}
                      className="text-xs font-medium text-leif-secondary opacity-0 transition-opacity underline-offset-2 group-hover:opacity-100 hover:text-leif-text hover:underline focus:opacity-100"
                    >
                      In Einstellungen
                    </Link>
                  </div>
                </article>
                );
              })}
            </div>
              <div className="flex min-h-0 flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-leif-secondary">Tasks</h3>
              <button
                type="button"
                onClick={() => openCreateTaskDialog()}
                className="rounded-md border border-leif-border bg-leif-surface p-1 text-leif-secondary transition-colors hover:text-leif-text"
                aria-label="Neuen Task erstellen"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {inlineNotice ? (
              <div className="rounded-md border border-leif-primary/30 bg-leif-primary-soft px-3 py-2 text-xs text-leif-text">
                {inlineNotice}
              </div>
            ) : null}
            {calendarSyncStatus ? (
              <div className="rounded-md border border-leif-border bg-leif-divider/60 px-3 py-2 text-xs text-leif-secondary">
                {calendarSyncStatus}
              </div>
            ) : null}
            {planningSidebarTasks.map(({ task, mode, reservedOnIso }) => {
              const isFree = mode === "free";
              const listCardHeightPx = plannerTaskListCardHeightPx(task.durationMinutes);
              const firstFreeId = freePlanningTasks[0]?.id ?? null;
              return (
              <article
                key={task.id}
                draggable={isFree && !isDayFinalized}
                style={{ height: listCardHeightPx }}
                onMouseEnter={() => {
                  if (isFree) setHoveredTaskId(task.id);
                }}
                onMouseLeave={() => setHoveredTaskId((current) => (current === task.id ? null : current))}
                onClick={() => {
                  if (isFree) {
                    if (isDayFinalized) {
                      setInlineNotice("Tag ist fixiert. Wähle oben rechts „Planung bearbeiten“, um wieder zu bearbeiten.");
                      return;
                    }
                    if (proposal?.taskId === task.id) {
                      const planned = handleDropTask(proposal.startSlot, task.id);
                      if (!planned) {
                        setInlineNotice("Kein passender Zeitraum frei");
                      }
                      return;
                    }

                    const nextFree = findNextFreeStartSlot(task.id, effectivePlacements);
                    if (!nextFree) {
                      setProposal(null);
                      setInlineNotice("Kein passender Zeitraum frei");
                      return;
                    }
                    setInlineNotice(null);
                    setProposal({ taskId: task.id, startSlot: nextFree.startSlot, slotCount: nextFree.slotCount });
                    return;
                  }
                  if (reservedOnIso) {
                    openPlanningDay(reservedOnIso);
                  }
                }}
                onDragStart={(event) => {
                  if (!isFree) return;
                  startTaskDrag(task.id, event);
                }}
                onDragEnd={endTaskDrag}
                className={cn(
                  "flex min-h-0 flex-col justify-between gap-1 overflow-hidden rounded-lg border px-2.5 py-2 transition-[height,box-shadow,opacity,transform] duration-200 ease-out",
                  isFree
                    ? cn(
                        "cursor-grab border-leif-border/80 bg-leif-surface/90 active:cursor-grabbing",
                        isDayFinalized ? "cursor-not-allowed opacity-80" : "",
                        task.id === firstFreeId ? "bg-leif-canvas/90 shadow-sm ring-1 ring-leif-primary/20" : "shadow-sm",
                        draggingTaskId === task.id ? "scale-[0.99] opacity-70" : "",
                        proposal?.taskId === task.id ? "border-leif-primary/40" : "",
                      )
                    : "cursor-pointer border-dashed border-slate-300/70 bg-slate-50/80 opacity-80 hover:border-slate-400/80 hover:bg-slate-50",
                )}
              >
                <div className="flex min-h-0 flex-1 items-start gap-2">
                  <h4
                    className={cn(
                      "min-w-0 flex-1 truncate whitespace-nowrap text-sm font-semibold leading-snug",
                      isFree ? "text-leif-text" : "text-leif-secondary",
                    )}
                  >
                    {task.title}
                  </h4>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="rounded-full border border-leif-border bg-leif-canvas px-1.5 py-px text-[10px] font-semibold tabular-nums leading-none text-leif-secondary">
                      {task.durationMinutes} min
                    </span>
                  </div>
                </div>
                {!isFree && reservedOnIso ? (
                  <p className="shrink-0 text-[10px] leading-snug text-leif-secondary">
                    In Planung am {formatPlanningDayShort(reservedOnIso)} (noch nicht fixiert). Kachel: Planungstag
                    öffnen. Schloss: Eintrag dort entfernen und hier wieder freigeben.
                  </p>
                ) : null}
                {isFree ? (
                  <div className="flex shrink-0 items-center justify-between gap-2 border-t border-transparent pt-0.5">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditTaskDialog(task.id);
                      }}
                      className="text-xs font-medium text-leif-secondary underline-offset-2 hover:text-leif-text hover:underline"
                    >
                      Bearbeiten
                    </button>
                    {task.id === firstFreeId ? (
                      <span className="rounded-full border border-leif-primary/35 bg-leif-primary-soft px-1.5 py-px text-[9px] font-semibold uppercase leading-tight tracking-wide text-leif-text">
                        Empfohlen
                      </span>
                    ) : null}
                  </div>
                ) : reservedOnIso ? (
                  <div className="mt-auto flex shrink-0 justify-end border-t border-transparent pt-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeTaskFromDayPlan(task.id, reservedOnIso);
                      }}
                      className="inline-flex shrink-0 rounded-md border border-slate-300/80 bg-white p-1 text-slate-600 transition-colors hover:border-[#456990]/50 hover:bg-[rgba(69,105,144,0.06)] hover:text-[#456990]"
                      title="Task aus Planung des anderen Tages entfernen"
                      aria-label="Task aus Planung des anderen Tages entfernen"
                    >
                      <Lock className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                ) : null}
                {isFree && expandedInlineTaskId === task.id && editableTasksById[task.id] ? (
                  <div
                    className="mt-2 border-t border-leif-border/60 pt-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <TaskInlineEditor
                      task={editableTasksById[task.id]}
                      taskTypes={DEFAULT_TASK_TYPES.map((type) => ({
                        id: type.key,
                        key: type.key,
                        label: type.label,
                        sort_order: type.sort_order,
                      }))}
                      documents={[]}
                      onRequestClose={() => setExpandedInlineTaskId(null)}
                      className="bg-white"
                    />
                  </div>
                ) : null}
              </article>
            );
            })}
            {planningSidebarTasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-leif-border/80 bg-leif-canvas/50 p-2.5 text-xs text-leif-secondary">
                Alle Tasks sind eingeplant.
              </div>
            ) : null}
              </div>
            </div>

            <div
              className="order-2 flex min-h-[min(58vh,520px)] flex-1 flex-col gap-2.5 lg:order-none lg:min-h-0 lg:col-span-8 lg:col-start-1 lg:row-start-2 lg:h-full"
              data-planner-calendar="true"
            >
          {draggingTaskId && placementByTaskId[draggingTaskId] ? (
            <p className="text-xs text-leif-secondary">Loslassen außerhalb = entfernen</p>
          ) : null}
          <div
            key={dragEpoch}
            className={cn(
              "relative min-h-0 flex-1 rounded-xl border border-leif-border/80 bg-white px-0.5 pt-0.5 shadow-[var(--leif-shadow)] transition-shadow duration-200",
              draggingTaskId && !placementByTaskId[draggingTaskId] ? "ring-1 ring-[#456990]/15" : "",
            )}
          >
            {hiddenOutlookPlannerRows.length > 0 ? (
              <div className="mb-1.5 space-y-1.5 rounded-md border border-slate-200/90 bg-slate-50/80 px-2 py-2 text-[11px] text-leif-secondary">
                <p className="font-medium text-leif-text">Aus Planung ausgeblendet (Outlook)</p>
                <ul className="flex flex-wrap gap-1.5">
                  {hiddenOutlookPlannerRows.map((ev) => (
                    <li key={ev.outlook_recurrence_group_id ?? ev.outlook_event_id ?? ev.id}>
                      <button
                        type="button"
                        disabled={plannerVisibilityBusyId === ev.id}
                        onClick={async () => {
                          setPlannerVisibilityBusyId(ev.id);
                          try {
                            const res = await setCalendarEventExcludeFromPlanner(ev.id, false);
                            if (!res.ok) {
                              setInlineNotice(res.error);
                              return;
                            }
                            await reloadDayEvents();
                            setInlineNotice(null);
                          } finally {
                            setPlannerVisibilityBusyId(null);
                          }
                        }}
                        className="max-w-[14rem] truncate rounded border border-slate-200 bg-white px-2 py-0.5 text-left font-medium text-[#456990] transition-colors hover:border-[#456990]/40 hover:bg-[rgba(69,105,144,0.06)] disabled:opacity-50"
                        title="Termin wieder in der Planung anzeigen"
                      >
                        {ev.title || "Termin"} — einblenden
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {slots.map((slot) => {
              const occupiedTaskId = occupancyBySlot[slot];
              const occupiedTask = occupiedTaskId ? plannerItemsById[occupiedTaskId] : null;
              const blockedEvent = blockedByEvents[slot];
              const hasFixedEvent = Boolean(blockedEvent);
              const isImportedEvent = blockedEvent?.source === "outlook";
              const hoveredPlacement = hoveredTaskId ? placementByTaskId[hoveredTaskId] : null;
              const isInsideHoveredPlacement =
                hoveredPlacement && slot >= hoveredPlacement.startSlot && slot < hoveredPlacement.startSlot + hoveredPlacement.slotCount;
              const isInsideHoverSuggestion =
                hoverSuggestion &&
                slot >= hoverSuggestion.startSlot &&
                slot < hoverSuggestion.startSlot + hoverSuggestion.slotCount;
              const isInsideProposal =
                proposal && slot >= proposal.startSlot && slot < proposal.startSlot + proposal.slotCount;
              const isHourStart = slot % SLOTS_PER_HOUR === 0;
              const hourForSlot = START_HOUR + Math.floor(slot / SLOTS_PER_HOUR);
              const isWorktimeSlot = hourForSlot >= WORK_START_HOUR && hourForSlot < WORK_END_HOUR;
              const occupiedByOtherTask =
                Boolean(occupiedTask && occupiedTask.id !== draggingTaskId) || hasFixedEvent;
              return (
                <div
                  key={slot}
                  onMouseEnter={() => {
                    if (draggingTaskId && !occupiedByOtherTask) setDropHoverSlot(slot);
                  }}
                  onMouseLeave={() => {
                    if (draggingTaskId) setDropHoverSlot((current) => (current === slot ? null : current));
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = isDayFinalized ? "none" : "move";
                    if (!occupiedByOtherTask) setDropHoverSlot(slot);
                  }}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    if (!occupiedByOtherTask) setDropHoverSlot(slot);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (isDayFinalized) {
                      setInlineNotice("Tag ist fixiert. Wähle oben rechts „Planung bearbeiten“, um wieder zu bearbeiten.");
                      endTaskDrag();
                      return;
                    }
                    const droppedTaskId = event.dataTransfer.getData("text/task-id");
                    const placed = handleDropTask(slot, droppedTaskId);
                    if (!placed) {
                      setInlineNotice("Kein passender Zeitraum frei");
                    }
                    endTaskDrag();
                  }}
                  className={cn(
                    "grid h-5 grid-cols-[64px_1fr] gap-3 border-b border-leif-border/70 px-3 transition-colors duration-200 ease-out last:border-b-0",
                    isHourStart ? "border-t border-leif-border" : "",
                    isWorktimeSlot ? "bg-leif-primary-soft/35" : "",
                  )}
                >
                  <span className={cn("self-start pt-1 text-[11px] text-leif-secondary", isHourStart ? "font-medium" : "opacity-60")}>
                    {isHourStart ? formatSlotLabel(slot) : ""}
                  </span>
                  <div className="relative h-5">
                    {(isInsideHoverSuggestion ||
                      isInsideProposal ||
                      isInsideHoveredPlacement) &&
                    !occupiedTask && !hasFixedEvent ? (
                      <div
                        className={cn(
                          "absolute inset-0 rounded-md",
                          isInsideHoverSuggestion ? "bg-leif-primary-soft/28" : "",
                          isInsideProposal ? "border border-dashed border-leif-primary/40 bg-leif-primary-soft/35" : "",
                          isInsideHoveredPlacement ? "bg-leif-primary-soft/28" : "",
                        )}
                      />
                    ) : null}
                    {hasFixedEvent ? (
                      <div
                        className={cn(
                          "absolute inset-0 rounded-sm",
                          isImportedEvent ? "bg-emerald-200/45" : "bg-slate-300/35",
                        )}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
            <div className="pointer-events-none absolute inset-0 z-20">
              {eventBlocks.map((eventBlock) => {
                const top = eventBlock.startSlot * SLOT_ROW_HEIGHT_PX;
                const height = eventBlock.slotCount * SLOT_ROW_HEIGHT_PX;
                const isImported = eventBlock.source === "outlook";
                const band = plannerImportedEventBandStyle(eventBlock.laneIndex, eventBlock.laneCount);
                const showPrivate = outlookShowsPrivateIcon(eventBlock.outlook_sensitivity);
                const showSeries = eventBlock.outlook_is_recurring;
                return (
                  <div
                    key={`event-${eventBlock.id}`}
                    role={isImported ? "button" : undefined}
                    tabIndex={isImported ? 0 : undefined}
                    onKeyDown={
                      isImported
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              const row = calendarEvents.find((x) => x.id === eventBlock.id);
                              if (row) openPlannerOutlookEventEdit(row);
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      "absolute z-[21] select-none rounded-md py-1 text-xs font-medium",
                      isImported
                        ? "cursor-pointer border border-emerald-300/80 bg-emerald-100/75 px-1 text-emerald-900 shadow-sm hover:bg-emerald-100/90"
                        : "pointer-events-none border border-slate-300/80 bg-slate-200/70 px-2 text-slate-700",
                      isImported ? "pointer-events-auto" : "",
                    )}
                    style={{
                      top: `${top}px`,
                      height: `${Math.max(height, SLOT_ROW_HEIGHT_PX)}px`,
                      ...band,
                    }}
                  >
                    <div
                      className="relative flex h-full min-h-0 flex-col overflow-visible"
                      onClick={
                        isImported
                          ? () => {
                              const row = calendarEvents.find((x) => x.id === eventBlock.id);
                              if (row) openPlannerOutlookEventEdit(row);
                            }
                          : undefined
                      }
                    >
                      <span className="line-clamp-4 min-h-0 min-w-0 flex-1 pr-[4.75rem] leading-snug [overflow-wrap:anywhere]">
                        {eventBlock.title}
                      </span>
                      <div className="absolute right-0.5 top-0.5 z-[1] flex max-w-[min(100%,7rem)] flex-wrap items-center justify-end gap-0.5">
                        {showSeries ? (
                          <span
                            title="Serientermin"
                            className="inline-flex shrink-0 rounded p-0.5 text-emerald-950"
                            aria-hidden
                          >
                            <Repeat className="h-3.5 w-3.5" strokeWidth={2.35} />
                          </span>
                        ) : null}
                        {showPrivate ? (
                          <span
                            title="Persönlich, privat oder vertraulich"
                            className="inline-flex shrink-0 rounded p-0.5 text-emerald-950"
                            aria-hidden
                          >
                            <Shield className="h-3.5 w-3.5" strokeWidth={2.35} />
                          </span>
                        ) : null}
                        {isImported ? (
                          <button
                            type="button"
                            className="shrink-0 rounded p-0.5 text-emerald-800 transition-colors hover:bg-emerald-200/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 disabled:opacity-50"
                            title="In Planung ausblenden (Serie: alle Vorkommen)"
                            aria-label="Outlook-Termin in Planung ausblenden"
                            disabled={plannerVisibilityBusyId === eventBlock.id}
                            onClick={async (e) => {
                              e.stopPropagation();
                              setPlannerVisibilityBusyId(eventBlock.id);
                              try {
                                const res = await setCalendarEventExcludeFromPlanner(eventBlock.id, true);
                                if (!res.ok) {
                                  setInlineNotice(res.error);
                                  return;
                                }
                                await reloadDayEvents();
                                setInlineNotice(null);
                              } finally {
                                setPlannerVisibilityBusyId(null);
                              }
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        ) : null}
                        <CalendarDays
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            isImported ? "text-emerald-800" : "text-slate-500",
                          )}
                          aria-hidden
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {effectivePlacements.map((placement) => {
                const task = plannerItemsById[placement.taskId];
                if (!task) return null;
                const top = placement.startSlot * SLOT_ROW_HEIGHT_PX;
                const height = placement.slotCount * SLOT_ROW_HEIGHT_PX;
                const isDragged = draggingTaskId === task.id;
                const isUnplanCandidate = unplanCandidateTaskId === task.id;
                return (
                  <div
                    key={task.id}
                    draggable={!isDayFinalized}
                    onClick={() => {
                      if (isDayFinalized) return;
                      if (unplanCandidateTaskId === task.id) {
                        handleUnplanTask(task.id);
                        return;
                      }
                      setUnplanCandidateTaskId(task.id);
                    }}
                    onDragStart={(event) => startTaskDrag(task.id, event)}
                    onDragEnd={endTaskDrag}
                    className={cn(
                      "pointer-events-auto absolute right-2 z-[22] cursor-grab select-none rounded-md border border-leif-primary/30 bg-leif-primary-soft px-2 py-1 text-xs font-medium text-leif-text transition-all duration-200 ease-out active:cursor-grabbing",
                      isDayFinalized ? "cursor-not-allowed" : "",
                      isUnplanCandidate ? "bg-leif-primary-soft/35 border-leif-primary/50" : "",
                      isDragged ? "opacity-70" : "",
                      autoPlanDraft !== null ? "ring-2 ring-amber-400/70" : "",
                    )}
                    style={{ top: `${top}px`, height: `${Math.max(height, SLOT_ROW_HEIGHT_PX)}px`, left: PLANNER_BLOCK_LAYER_LEFT }}
                  >
                    <span className="pr-5">
                      {task.title} ({task.durationMinutes} min)
                    </span>
                    <ListTodo className="absolute right-1.5 top-1 h-3.5 w-3.5 text-leif-secondary" aria-hidden />
                  </div>
                );
              })}
              {calendarDragPreview ? (
                <div
                  key="planner-drag-slot-preview"
                  aria-hidden
                  className={cn(
                    "absolute z-[25] overflow-hidden rounded-md px-2 py-1",
                    "border border-dashed shadow-none outline-none",
                    calendarDragPreview.valid
                      ? "border-[rgba(69,105,144,0.6)] bg-[rgba(69,105,144,0.12)]"
                      : "border-amber-500/55 bg-amber-50/30",
                    calendarDragPreview.thin ? "flex items-center justify-center" : "flex flex-col justify-start gap-0.5",
                  )}
                  style={{
                    top: `${calendarDragPreview.topPx}px`,
                    height: `${Math.max(calendarDragPreview.heightPx, SLOT_ROW_HEIGHT_PX)}px`,
                    left: PLANNER_BLOCK_LAYER_LEFT,
                    right: 8,
                  }}
                >
                  {calendarDragPreview.thin ? (
                    <span className="truncate text-center text-[10px] font-semibold tabular-nums text-slate-700">
                      {calendarDragPreview.task.durationMinutes} min
                    </span>
                  ) : (
                    <>
                      <span className="line-clamp-2 text-xs font-semibold leading-snug text-slate-800">
                        {calendarDragPreview.task.title}
                      </span>
                      <span className="text-[10px] font-semibold tabular-nums text-slate-600">
                        {calendarDragPreview.task.durationMinutes} min
                      </span>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
            </div>
          </div>
        </div>
      )}
      {plannerCalendarDialogOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closePlannerOutlookEventEdit();
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-leif-border bg-leif-surface p-4 shadow-[var(--leif-shadow)]"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <form onSubmit={submitPlannerOutlookEventEdit} className="space-y-4">
              <h3 className="text-base font-semibold text-leif-text">Outlook-Termin bearbeiten</h3>
              {calDlgError ? <AlertBanner variant="error">{calDlgError}</AlertBanner> : null}
              <p className="text-xs text-leif-muted">
                Änderungen werden gespeichert und mit Microsoft Outlook synchronisiert.
              </p>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-leif-secondary">Titel</span>
                <input
                  value={calDlgTitle}
                  onChange={(e) => setCalDlgTitle(e.target.value)}
                  required
                  className={controlClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-leif-secondary">Beschreibung</span>
                <textarea
                  value={calDlgDescription}
                  onChange={(e) => setCalDlgDescription(e.target.value)}
                  rows={3}
                  className={`${controlClass} h-auto min-h-[5rem] resize-y py-2.5`}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={calDlgIsAllDay}
                  onChange={(e) => setCalDlgIsAllDay(e.target.checked)}
                />
                Ganztägig
              </label>
              {calDlgIsAllDay ? (
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-leif-secondary">Datum</span>
                  <input
                    type="date"
                    value={calDlgDayDate}
                    onChange={(e) => setCalDlgDayDate(e.target.value)}
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
                      value={calDlgStartLocal}
                      onChange={(e) => setCalDlgStartLocal(e.target.value)}
                      required
                      className={controlClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-leif-secondary">Ende</span>
                    <input
                      type="datetime-local"
                      value={calDlgEndLocal}
                      onChange={(e) => setCalDlgEndLocal(e.target.value)}
                      required
                      className={controlClass}
                    />
                  </label>
                </div>
              )}
              <div className="flex flex-wrap justify-between gap-2 border-t border-leif-border pt-4">
                <Button
                  type="button"
                  variant="danger"
                  disabled={calDlgPending}
                  onClick={() => void deletePlannerOutlookEvent()}
                >
                  Löschen
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={calDlgPending}
                    onClick={closePlannerOutlookEventEdit}
                  >
                    Abbrechen
                  </Button>
                  <Button type="submit" variant="primary" disabled={calDlgPending}>
                    Speichern
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      <TaskFormDialog
        open={taskDialogOpen}
        mode={taskDialogMode}
        task={taskDialogMode === "edit" ? editingTask : null}
        areas={taskAreas}
        onClose={() => {
          setTaskDialogOpen(false);
          setEditingTask(null);
        }}
      />
    </div>
  );
}
