"use client";

import {
  applyInboxAiSuggestion,
  createCalendarEventFromInboxItem,
  createNoteFromInboxItem,
  createSparringFromInboxItem,
  createDocumentFromInboxItem,
  createTaskFromInbox,
  discardInboxItem,
  rejectInboxAiSuggestion,
  type CreateTaskFromInboxInput,
} from "@/app/(app)/inbox/actions";
import { Button, buttonClassName } from "@/components/ui/button";
import { controlClass, textareaClass } from "@/components/ui/control-styles";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/ui/page-header";
import type { InboxAiSuggestion, InboxListItem } from "@/lib/inbox/types";
import type { CalendarEventFormPayload } from "@/lib/calendar/types";
import { cn } from "@/lib/cn";
import { hrefForProcessedInboxItem } from "@/lib/inbox/inbox-processed-href";
import { PRODUCT_COPY, PRODUCT_LABEL } from "@/lib/product-labels";
import type { TaskTypeRow } from "@/lib/task-types/defaults";
import { TASK_PRIORITIES, type AreaRow } from "@/lib/tasks/types";
import {
  Bot,
  CalendarPlus,
  CheckSquare,
  ChevronDown,
  FileUp,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** Dashboard-Kachel: gleiche Vorschau wie zuvor in `dashboard-inbox-client`. */
function dashboardPreviewFromContent(content: string): string {
  const line = content.split("\n").find((l) => l.trim()) ?? content.trim();
  const base = line || content.trim();
  return base.length > 220 ? `${base.slice(0, 217)}…` : base;
}

function dashboardFormatCreated(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function DashboardQuickAction({
  label,
  onClick,
  disabled,
  active = false,
  children,
}: {
  label: string;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent text-leif-muted transition-colors hover:bg-leif-canvas/70 hover:text-leif-text disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-[16px]",
        active && "border-[#456990]/50 bg-[rgba(69,105,144,0.12)] text-[#456990]",
      )}
    >
      {children}
    </button>
  );
}

function defaultTitleFromContent(content: string): string {
  const line = content.split("\n")[0]?.trim() ?? "";
  const base = line || content.trim();
  return base.length > 200 ? `${base.slice(0, 197)}…` : base;
}

function splitInboxContent(content: string): { title: string; preview: string | null } {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { title: "Ohne Inhalt", preview: null };
  const titleRaw = lines[0];
  const previewRaw = lines.slice(1).join(" ");
  const title = titleRaw.length > 140 ? `${titleRaw.slice(0, 137)}…` : titleRaw;
  const preview = previewRaw ? (previewRaw.length > 240 ? `${previewRaw.slice(0, 237)}…` : previewRaw) : null;
  return { title, preview };
}

function defaultCalendarDatetimeLocals(): { start: string; end: string } {
  const start = new Date();
  start.setSeconds(0, 0);
  start.setMinutes(0);
  if (start.getHours() >= 22) {
    start.setDate(start.getDate() + 1);
    start.setHours(9, 0, 0, 0);
  } else {
    start.setHours(start.getHours() + 1);
  }
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const toLocal = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { start: toLocal(start), end: toLocal(end) };
}

function toolLabel(tool: "task" | "calendar" | "note"): string {
  if (tool === "calendar") return "Termin";
  if (tool === "note") return "Notiz";
  return "Task";
}

function formatYmdDisplay(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return ymd;
  const [, y, mo, d] = m;
  return `${d}.${mo}.${y}`;
}

function formatLocalDateTimeDisplay(localIso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(localIso.trim());
  if (!m) return localIso;
  const [, y, mo, d, h, min] = m;
  return `${d}.${mo}.${y} - ${h}:${min}`;
}

function aiFilledFieldsSummary(suggestion: InboxAiSuggestion): string[] {
  if (suggestion.tool === "task") {
    const out: string[] = [];
    if (suggestion.task?.due_choice) {
      const due =
        suggestion.task.due_choice === "today"
          ? "Heute"
          : suggestion.task.due_choice === "tomorrow"
            ? "Morgen"
            : suggestion.task?.due_date
              ? formatYmdDisplay(suggestion.task.due_date)
              : "Datum";
      out.push(`Fälligkeit: ${due}`);
    }
    if (suggestion.task?.duration_minutes) out.push(`Dauer: ${suggestion.task.duration_minutes} min`);
    if (suggestion.task?.priority) out.push(`Priorität: ${suggestion.task.priority}`);
    if (suggestion.task?.task_type) out.push(`Art: ${suggestion.task.task_type}`);
    if (suggestion.task?.description) out.push("Beschreibung");
    if (suggestion.task?.document_id) out.push("Dokument");
    return out;
  }
  if (suggestion.tool === "calendar") {
    const out: string[] = [];
    if (suggestion.calendar?.start_local) out.push(`Start: ${formatLocalDateTimeDisplay(suggestion.calendar.start_local)}`);
    if (suggestion.calendar?.end_local) out.push(`Ende: ${formatLocalDateTimeDisplay(suggestion.calendar.end_local)}`);
    if (suggestion.calendar?.is_all_day) out.push("Ganztägig");
    if (suggestion.calendar?.location) out.push(`Ort: ${suggestion.calendar.location}`);
    if (suggestion.calendar?.is_private) out.push("Privat");
    if (suggestion.calendar?.description) out.push("Beschreibung");
    return out;
  }
  const out: string[] = [];
  if (suggestion.note?.type) out.push(`Art: ${suggestion.note.type}`);
  if (suggestion.note?.description) out.push("Beschreibung");
  if (suggestion.note?.document_id) out.push("Dokument");
  return out;
}

type Props = {
  pending: InboxListItem[];
  areas: AreaRow[];
  taskTypes?: TaskTypeRow[];
  loadError: string | null;
  /** Kompaktere Zeilen (z. B. Dashboard). */
  compact?: boolean;
  /**
   * Steuert den Block oberhalb der Tabelle. `undefined` = Standard „Offene Eingänge“ + Kurztext.
   * `null` = kein Kopf (Überschrift liegt bei der aufrufenden Seite).
   */
  heading?: ReactNode | null;
  /** Tabellenansicht (Inbox-Seite) oder Dashboard-Kartenliste. */
  variant?: "table" | "dashboard";
  /** Nach „In KI öffnen“ nicht navigieren (nur bei `variant="dashboard"`). */
  stayOnPageAfterSparring?: boolean;
  /** Inbox-Seite: zuletzt verarbeitete Einträge (read-only Karten, typ. letzte 10). */
  recentCompleted?: InboxListItem[];
  /** Inbox-Seite: Gesamtzahl aller `processed`-Einträge (für Überschrift). */
  completedTotalCount?: number;
  /** Inbox-Seite: verworfene Einträge (einklappbare Liste). */
  discarded?: InboxListItem[];
  /** Fehler beim Laden der geschlossenen Inbox-Einträge. */
  closedLoadError?: string | null;
};

type InlineEditKind = "task" | "note" | "calendar";

const actionPickerBtnBase =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#456990]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-[18px]";

function ActionPickerBtn({
  label,
  icon,
  disabled,
  onClick,
  variant,
  className,
}: {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  variant: "primary" | "standard" | "danger";
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        actionPickerBtnBase,
        variant === "primary" &&
          "border-transparent bg-[#456990] text-white hover:bg-[#3d5d82] active:bg-[#385574]",
        variant === "standard" &&
          "border-[#e5e7eb] bg-white text-[#374151] hover:border-[#dce0e5] hover:bg-[#f9fafb]",
        variant === "danger" &&
          "border-red-200 bg-white text-red-800 hover:border-red-300 hover:bg-red-50/90 active:bg-red-50",
        className,
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export function InboxPendingTableWithWorkflows({
  pending,
  areas,
  taskTypes = [],
  loadError,
  compact = false,
  heading,
  variant = "table",
  stayOnPageAfterSparring = false,
  recentCompleted = [],
  completedTotalCount = 0,
  discarded = [],
  closedLoadError = null,
}: Props) {
  const SETTLE_HOLD_MS = 1000;
  const EXIT_ANIM_MS = 220;
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [sourceFilter, setSourceFilter] = useState<"all" | string>("all");
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
  const sourceMenuRef = useRef<HTMLDivElement>(null);
  const [discardedOpen, setDiscardedOpen] = useState(false);
  const [completedQuery, setCompletedQuery] = useState("");
  const [dashboardPendingItems, setDashboardPendingItems] = useState<InboxListItem[]>(pending);
  const [aiSuggestionById, setAiSuggestionById] = useState<Record<string, InboxAiSuggestion | null>>(() =>
    Object.fromEntries(pending.map((item) => [item.id, item.ai_suggestion ?? null])),
  );
  const [rejectedById, setRejectedById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(pending.map((item) => [item.id, item.ai_suggestion_rejected])),
  );
  const [inlinePrefillById, setInlinePrefillById] = useState<Record<string, InboxAiSuggestion | null>>({});
  const [settlingIds, setSettlingIds] = useState<Set<string>>(new Set());
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [successId, setSuccessId] = useState<string | null>(null);

  const [inlineEdit, setInlineEdit] = useState<{ itemId: string; kind: InlineEditKind } | null>(null);

  const [documentDialogItem, setDocumentDialogItem] = useState<InboxListItem | null>(null);
  const documentDialogRef = useRef<HTMLDialogElement>(null);
  const documentFormId = useId();

  const [actionPickerItem, setActionPickerItem] = useState<InboxListItem | null>(null);
  const actionPickerRef = useRef<HTMLDialogElement>(null);
  const inboxHashHandledRef = useRef(false);
  const pickerOpenedFromHashRef = useRef(false);

  const dismissPickerThen = useCallback((fn: () => void) => {
    setActionPickerItem(null);
    queueMicrotask(fn);
  }, []);

  useEffect(() => {
    if (variant !== "dashboard") return;
    setDashboardPendingItems(pending);
    setAiSuggestionById(Object.fromEntries(pending.map((item) => [item.id, item.ai_suggestion ?? null])));
    setRejectedById(Object.fromEntries(pending.map((item) => [item.id, item.ai_suggestion_rejected])));
    setSettlingIds(new Set());
    setExitingIds(new Set());
    setSuccessId(null);
  }, [pending, variant]);

  useEffect(() => {
    setAiSuggestionById((current) => ({
      ...current,
      ...Object.fromEntries(pending.map((item) => [item.id, item.ai_suggestion ?? null])),
    }));
    setRejectedById((current) => ({
      ...current,
      ...Object.fromEntries(pending.map((item) => [item.id, item.ai_suggestion_rejected])),
    }));
  }, [pending]);

  useEffect(() => {
    const el = documentDialogRef.current;
    if (!el) return;
    if (documentDialogItem) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [documentDialogItem]);

  useEffect(() => {
    const el = actionPickerRef.current;
    if (!el) return;
    if (actionPickerItem) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [actionPickerItem]);

  useEffect(() => {
    if (variant === "dashboard") return;
    if (inboxHashHandledRef.current) return;
    if (typeof window === "undefined") return;
    const m = /^#inbox-item-(.+)$/.exec(window.location.hash);
    if (!m) return;
    inboxHashHandledRef.current = true;
    const id = m[1];
    const hit = pending.find((p) => p.id === id);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    if (hit) {
      pickerOpenedFromHashRef.current = true;
      setActionPickerItem(hit);
    }
  }, [pending, variant]);

  useEffect(() => {
    if (!actionPickerItem || !pickerOpenedFromHashRef.current) return;
    pickerOpenedFromHashRef.current = false;
    document.getElementById(`inbox-item-${actionPickerItem.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [actionPickerItem]);

  async function run(
    id: string,
    fn: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>,
  ) {
    setActionError(null);
    setBusyId(id);
    try {
      const res = await fn(id);
      if (!res.ok) setActionError(res.error ?? "Fehler");
      else await animateCompletion(id);
    } finally {
      setBusyId(null);
    }
  }

  function suggestedToolForItem(item: InboxListItem): InlineEditKind {
    const suggestion =
      !rejectedById[item.id] && aiSuggestionById[item.id] ? aiSuggestionById[item.id] : inlinePrefillById[item.id];
    const suggested = suggestion?.tool;
    if (suggested === "calendar" || suggested === "note" || suggested === "task") return suggested;
    return "task";
  }

  function toggleInlineEdit(item: InboxListItem, kind?: InlineEditKind) {
    const nextKind = kind ?? suggestedToolForItem(item);
    setActionPickerItem(null);
    setInlineEdit((current) => {
      if (current?.itemId === item.id && current.kind === nextKind) return null;
      return { itemId: item.id, kind: nextKind };
    });
  }

  async function approveAiSuggestion(item: InboxListItem) {
    setActionError(null);
    setBusyId(item.id);
    try {
      const res = await applyInboxAiSuggestion(item.id);
      if (!res.ok) {
        setActionError(res.error);
        return;
      }
      setInlineEdit(null);
      await animateCompletion(item.id);
    } finally {
      setBusyId(null);
    }
  }

  async function rejectAiSuggestion(item: InboxListItem) {
    const prefill = aiSuggestionById[item.id];
    setActionError(null);
    setBusyId(item.id);
    try {
      const res = await rejectInboxAiSuggestion(item.id);
      if (!res.ok) {
        setActionError(res.error);
        return;
      }
      setRejectedById((current) => ({ ...current, [item.id]: true }));
      setAiSuggestionById((current) => ({ ...current, [item.id]: null }));
      if (prefill) {
        setInlinePrefillById((current) => ({ ...current, [item.id]: prefill }));
        setInlineEdit({ itemId: item.id, kind: prefill.tool });
      } else {
        setInlineEdit({ itemId: item.id, kind: "task" });
      }
    } finally {
      setBusyId(null);
    }
  }

  function animateCompletion(id: string): Promise<void> {
    if (variant !== "dashboard") {
      router.refresh();
      return Promise.resolve();
    }
    setSuccessId(id);
    setSettlingIds((prev) => new Set(prev).add(id));
    return new Promise((resolve) => {
      window.setTimeout(() => {
        setExitingIds((prev) => new Set(prev).add(id));
        window.setTimeout(() => {
          setDashboardPendingItems((prev) => prev.filter((it) => it.id !== id));
          setSettlingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          setExitingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          setSuccessId((cur) => (cur === id ? null : cur));
          router.refresh();
          resolve();
        }, EXIT_ANIM_MS);
      }, SETTLE_HOLD_MS);
    });
  }

  async function submitTaskFromInbox(item: InboxListItem, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const today = new Date();
    const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate(),
    ).padStart(2, "0")}`;
    const tomorrowDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 12, 0, 0);
    const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, "0")}-${String(
      tomorrowDate.getDate(),
    ).padStart(2, "0")}`;
    const planChoice = String(fd.get("plan_choice") ?? "today");
    const plannedDateRaw = String(fd.get("planned_date") ?? "").trim();
    const plannedDate =
      planChoice === "today" ? ymd : planChoice === "tomorrow" ? tomorrow : planChoice === "date" ? plannedDateRaw : null;
    const estRaw = String(fd.get("estimated_minutes") ?? "").trim();
    const estNum = estRaw === "" ? null : Number(estRaw);
    const documentRaw = String(fd.get("document_id") ?? "").trim();
    const documentId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(documentRaw)
      ? documentRaw
      : null;
    const input: CreateTaskFromInboxInput = {
      inbox_item_id: item.id,
      title: String(fd.get("title") ?? ""),
      description: String(fd.get("description") ?? ""),
      task_type: (String(fd.get("task_type") ?? "").trim() || null) as CreateTaskFromInboxInput["task_type"],
      priority: String(fd.get("priority") ?? "normal") as CreateTaskFromInboxInput["priority"],
      planned_date: plannedDate,
      estimated_minutes: estNum != null && Number.isFinite(estNum) ? estNum : null,
      document_id: documentId,
    };
    setActionError(null);
    setBusyId(item.id);
    try {
      const res = await createTaskFromInbox(input);
      if (!res.ok) {
        setActionError(res.error);
        return;
      }
      setInlineEdit(null);
      await animateCompletion(item.id);
    } finally {
      setBusyId(null);
    }
  }

  async function runSparringFromInbox(itemId: string) {
    setActionError(null);
    setBusyId(itemId);
    try {
      const res = await createSparringFromInboxItem(itemId);
      if (!res.ok) {
        setActionError(res.error);
        return;
      }
      if (stayOnPageAfterSparring) {
        router.refresh();
      } else {
        router.push(`/sparring/${res.chatId}`);
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function submitNoteFromInbox(item: InboxListItem, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    const description = String(fd.get("description") ?? "").trim();
    const documentRef = String(fd.get("document_ref") ?? "").trim();
    const documentId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(documentRef)
      ? documentRef
      : null;
    const fallbackType = taskTypes[0]?.key ?? "note";
    const type = String(fd.get("type") ?? fallbackType).trim() || fallbackType;
    setActionError(null);
    setBusyId(item.id);
    try {
      const res = await createNoteFromInboxItem({
        inbox_item_id: item.id,
        title,
        description,
        type,
        area_id: null,
        document_id: documentId,
      });
      if (!res.ok) {
        setActionError(res.error);
        return;
      }
      setInlineEdit(null);
      await animateCompletion(item.id);
    } finally {
      setBusyId(null);
    }
  }

  async function submitCalendarFromInbox(item: InboxListItem, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    const description = String(fd.get("description") ?? "");
    const location = String(fd.get("location") ?? "").trim();
    const isPrivate = fd.get("is_private") === "on";
    const isAllDay = fd.get("is_all_day") === "on";
    const startLocal = String(fd.get("start_local") ?? "");
    const endLocal = String(fd.get("end_local") ?? "");
    let payload: CalendarEventFormPayload;
    if (isAllDay) {
      const day = String(fd.get("all_day_date") ?? "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        setActionError("Datum (TT.MM.JJJJ als yyyy-mm-dd) prüfen.");
        return;
      }
      const [Y, M, D] = day.split("-").map(Number);
      const start = new Date(Y, M - 1, D, 0, 0, 0, 0);
      const end = new Date(Y, M - 1, D, 23, 59, 59, 999);
      payload = {
        title,
        description,
        location,
        is_private: isPrivate,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        is_all_day: true,
      };
    } else {
      const s = new Date(startLocal);
      const en = new Date(endLocal);
      if (!Number.isFinite(s.getTime()) || !Number.isFinite(en.getTime()) || en <= s) {
        setActionError("Start und Ende gültig ausfüllen; Ende nach Start.");
        return;
      }
      payload = {
        title,
        description,
        location,
        is_private: isPrivate,
        start_time: s.toISOString(),
        end_time: en.toISOString(),
        is_all_day: false,
      };
    }
    setActionError(null);
    setBusyId(item.id);
    try {
      const res = await createCalendarEventFromInboxItem(item.id, payload);
      if (!res.ok) {
        setActionError(res.error);
        return;
      }
      setInlineEdit(null);
      await animateCompletion(item.id);
    } finally {
      setBusyId(null);
    }
  }

  async function submitDocumentFromInbox(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!documentDialogItem) return;
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    setActionError(null);
    setBusyId(documentDialogItem.id);
    try {
      const res = await createDocumentFromInboxItem({
        inbox_item_id: documentDialogItem.id,
        title,
      });
      if (!res.ok) {
        setActionError(res.error);
        return;
      }
      setDocumentDialogItem(null);
      await animateCompletion(documentDialogItem.id);
    } finally {
      setBusyId(null);
    }
  }

  const noAreas = areas.length === 0;
  const availableSources = Array.from(new Set(pending.map((item) => item.source).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "de"),
  );
  const filteredAndSortedPending = pending
    .filter((item) => (sourceFilter === "all" ? true : item.source === sourceFilter))
    .sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      const av = Number.isFinite(ta) ? ta : 0;
      const bv = Number.isFinite(tb) ? tb : 0;
      return sortOrder === "newest" ? bv - av : av - bv;
    });

  const recentCompletedSorted = useMemo(
    () =>
      [...recentCompleted].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      ),
    [recentCompleted],
  );

  const completedFiltered = useMemo(() => {
    const q = completedQuery.trim().toLowerCase();
    if (!q) return recentCompletedSorted;
    return recentCompletedSorted.filter((item) => {
      const bits = splitInboxContent(item.content);
      const hay = [bits.title, bits.preview ?? "", item.source, item.content].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [recentCompletedSorted, completedQuery]);

  const discardedSorted = [...discarded].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );

  useEffect(() => {
    if (!sourceMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const node = sourceMenuRef.current;
      if (!node || !(e.target instanceof Node)) return;
      if (!node.contains(e.target)) setSourceMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSourceMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [sourceMenuOpen]);

  useEffect(() => {
    if (!actionPickerItem) return;
    const hit = pending.find((p) => p.id === actionPickerItem.id);
    const passesFilter = sourceFilter === "all" || hit?.source === sourceFilter;
    if (!hit || !passesFilter) setActionPickerItem(null);
  }, [pending, sourceFilter, actionPickerItem]);

  useEffect(() => {
    if (!inlineEdit) return;
    const hit = pending.find((p) => p.id === inlineEdit.itemId);
    const passesFilter = sourceFilter === "all" || hit?.source === sourceFilter;
    if (!hit || !passesFilter) setInlineEdit(null);
  }, [pending, sourceFilter, inlineEdit]);

  useEffect(() => {
    if (!inlineEdit) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node)) return;
      const row = document.getElementById(`inbox-item-${inlineEdit.itemId}`);
      if (!row) {
        setInlineEdit(null);
        return;
      }
      if (!row.contains(e.target)) setInlineEdit(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [inlineEdit]);

  const headingBlock =
    heading === undefined ? (
      <SectionTitle id="inbox-pending-heading" className="text-[14px] font-medium tracking-normal text-leif-muted">
        Offene Eingänge
      </SectionTitle>
    ) : (
      heading
    );

  function renderInlineEditor(item: InboxListItem): ReactNode {
    if (!inlineEdit || inlineEdit.itemId !== item.id) return null;
    const busy = busyId === item.id;
    const suggestion =
      !rejectedById[item.id] && aiSuggestionById[item.id] ? aiSuggestionById[item.id] : inlinePrefillById[item.id];
    if (inlineEdit.kind === "task") {
      return (
        <form
          onSubmit={(e) => void submitTaskFromInbox(item, e)}
          className="mt-2 space-y-3 rounded-lg border border-leif-border bg-white p-3"
        >
          <label className="block text-sm font-medium text-leif-secondary">
            Titel *
            <input
              name="title"
              type="text"
              required
              defaultValue={suggestion?.tool === "task" ? suggestion.title : defaultTitleFromContent(item.content)}
              className={`${controlClass} mt-1.5`}
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-leif-secondary">
              Fälligkeit *
              <select
                name="plan_choice"
                defaultValue={suggestion?.tool === "task" ? (suggestion.task?.due_choice ?? "today") : "today"}
                className={`${controlClass} mt-1.5`}
                required
              >
                <option value="today">Heute</option>
                <option value="tomorrow">Morgen</option>
                <option value="date">Datum…</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-leif-secondary">
              Dauer (Minuten) *
              <input
                name="estimated_minutes"
                type="number"
                min={1}
                step={1}
                required
                defaultValue={suggestion?.tool === "task" ? (suggestion.task?.duration_minutes ?? 30) : 30}
                className={`${controlClass} mt-1.5`}
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-leif-secondary">
            Datum (bei „Datum…“)
            <input
              name="planned_date"
              type="date"
              defaultValue={suggestion?.tool === "task" ? (suggestion.task?.due_date ?? "") : ""}
              className={`${controlClass} mt-1.5`}
            />
          </label>
          <details className="rounded-md border border-leif-border/70 bg-leif-canvas/30 p-2">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-leif-secondary">
              <span>Optional</span>
              <ChevronDown className="size-4 shrink-0 text-[#9ca3af]" />
            </summary>
            <div className="mt-2 space-y-3">
            <label className="block text-sm font-medium text-leif-secondary">
              Priorität
              <select
                name="priority"
                defaultValue={suggestion?.tool === "task" ? (suggestion.task?.priority ?? "normal") : "normal"}
                className={`${controlClass} mt-1.5`}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-leif-secondary">
              Art
              <select
                name="task_type"
                defaultValue={suggestion?.tool === "task" ? (suggestion.task?.task_type ?? "") : ""}
                className={`${controlClass} mt-1.5`}
              >
                <option value="">—</option>
                {taskTypes.map((t) => (
                  <option key={t.id} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-leif-secondary">
              Beschreibung
              <textarea
                name="description"
                rows={3}
                defaultValue={suggestion?.tool === "task" ? (suggestion.task?.description ?? item.content) : item.content}
                className={`${textareaClass} mt-1.5`}
              />
            </label>
            <label className="block text-sm font-medium text-leif-secondary">
              Dokument (UUID)
              <input
                name="document_id"
                type="text"
                defaultValue={suggestion?.tool === "task" ? (suggestion.task?.document_id ?? "") : ""}
                placeholder="optional"
                className={`${controlClass} mt-1.5`}
              />
            </label>
            </div>
          </details>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setInlineEdit(null)} disabled={busy}>
              Abbrechen
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? "Speichern…" : "Anlegen"}
            </Button>
          </div>
        </form>
      );
    }
    if (inlineEdit.kind === "note") {
      const noteTypeOptions = taskTypes.length > 0 ? taskTypes : [{ id: "note", key: "note", label: "Notiz", sort_order: 0 }];
      const fallbackType = noteTypeOptions[0]?.key ?? "note";
      return (
        <form
          onSubmit={(e) => void submitNoteFromInbox(item, e)}
          className="mt-2 space-y-3 rounded-lg border border-leif-border bg-white p-3"
        >
          <label className="block text-sm font-medium text-leif-secondary">
            Titel *
            <input
              name="title"
              type="text"
              required
              defaultValue={suggestion?.tool === "note" ? suggestion.title : defaultTitleFromContent(item.content)}
              className={`${controlClass} mt-1.5`}
            />
          </label>
          <details className="rounded-md border border-leif-border/70 bg-leif-canvas/30 p-2">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-leif-secondary">
              <span>Optional</span>
              <ChevronDown className="size-4 shrink-0 text-[#9ca3af]" />
            </summary>
            <div className="mt-2 space-y-3">
          <label className="block text-sm font-medium text-leif-secondary">
            Beschreibung
            <textarea
              name="description"
              rows={6}
              defaultValue={suggestion?.tool === "note" ? (suggestion.note?.description ?? "") : ""}
              className={`${textareaClass} mt-1.5`}
            />
          </label>
          <label className="block text-sm font-medium text-leif-secondary">
            Art
            <select
              name="type"
              defaultValue={suggestion?.tool === "note" ? (suggestion.note?.type ?? fallbackType) : fallbackType}
              className={`${controlClass} mt-1.5`}
            >
              {noteTypeOptions.map((type) => (
                <option key={type.id} value={type.key}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-leif-secondary">
            Dokument
            <input
              name="document_ref"
              type="text"
              defaultValue={suggestion?.tool === "note" ? (suggestion.note?.document_id ?? "") : ""}
              placeholder="optional"
              className={`${controlClass} mt-1.5`}
            />
          </label>
            </div>
          </details>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setInlineEdit(null)} disabled={busy}>
              Abbrechen
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? "Speichern…" : "Speichern"}
            </Button>
          </div>
        </form>
      );
    }
    const defaults = defaultCalendarDatetimeLocals();
    const todayYmd = new Date().toISOString().slice(0, 10);
    return (
      <form
        onSubmit={(e) => void submitCalendarFromInbox(item, e)}
        className="mt-2 space-y-3 rounded-lg border border-leif-border bg-white p-3"
      >
        <label className="block text-sm font-medium text-leif-secondary">
          Titel *
          <input
            name="title"
            type="text"
            required
            defaultValue={suggestion?.tool === "calendar" ? suggestion.title : defaultTitleFromContent(item.content)}
            className={`${controlClass} mt-1.5`}
          />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-leif-secondary">
            Start *
            <input
              name="start_local"
              type="datetime-local"
              defaultValue={suggestion?.tool === "calendar" ? (suggestion.calendar?.start_local ?? defaults.start) : defaults.start}
              required
              className={`${controlClass} mt-1.5`}
            />
          </label>
          <label className="block text-sm font-medium text-leif-secondary">
            Ende *
            <input
              name="end_local"
              type="datetime-local"
              defaultValue={suggestion?.tool === "calendar" ? (suggestion.calendar?.end_local ?? defaults.end) : defaults.end}
              required
              className={`${controlClass} mt-1.5`}
            />
          </label>
        </div>
        <details className="rounded-md border border-leif-border/70 bg-leif-canvas/30 p-2">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-leif-secondary">
            <span>Optional</span>
            <ChevronDown className="size-4 shrink-0 text-[#9ca3af]" />
          </summary>
          <div className="mt-2 space-y-3">
            <label className="block text-sm font-medium text-leif-secondary">
              Beschreibung
              <textarea
                name="description"
                rows={4}
                defaultValue={suggestion?.tool === "calendar" ? (suggestion.calendar?.description ?? item.content) : item.content}
                className={`${textareaClass} mt-1.5`}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-leif-text">
              <input
                type="checkbox"
                name="is_all_day"
                defaultChecked={suggestion?.tool === "calendar" ? Boolean(suggestion.calendar?.is_all_day) : false}
                className="rounded border-leif-border text-leif-primary"
              />
              <span>Ganztägig</span>
            </label>
            <label className="block text-sm font-medium text-leif-secondary">
              Datum (nur Ganztägig)
              <input
                name="all_day_date"
                type="date"
                defaultValue={suggestion?.tool === "calendar" ? (suggestion.calendar?.date ?? todayYmd) : todayYmd}
                className={`${controlClass} mt-1.5`}
              />
            </label>
            <label className="block text-sm font-medium text-leif-secondary">
              Ort
              <input
                name="location"
                type="text"
                defaultValue={suggestion?.tool === "calendar" ? (suggestion.calendar?.location ?? "") : ""}
                placeholder="optional"
                className={`${controlClass} mt-1.5`}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-leif-text">
              <input
                type="checkbox"
                name="is_private"
                defaultChecked={suggestion?.tool === "calendar" ? Boolean(suggestion.calendar?.is_private) : false}
                className="rounded border-leif-border text-leif-primary"
              />
              <span>Privat</span>
            </label>
          </div>
        </details>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setInlineEdit(null)} disabled={busy}>
            Abbrechen
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Speichern…" : "Termin speichern"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <>
      {actionError ? <AlertBanner variant="error">{actionError}</AlertBanner> : null}

      <dialog
        ref={actionPickerRef}
        className="w-[min(100vw-2rem,28rem)] max-h-[min(92vh,44rem)] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white p-0 text-leif-text shadow-[0_24px_64px_rgba(15,23,42,0.2)] [&::backdrop]:bg-black/30"
        onClose={() => setActionPickerItem(null)}
      >
        {actionPickerItem ? (
          <div className="flex max-h-[min(92vh,44rem)] flex-col">
            <header className="px-7 pb-1 pt-7">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[1.0625rem] font-medium leading-snug tracking-tight text-[#111827]">
                  Was soll daraus werden?
                </h3>
                <button
                  type="button"
                  aria-label="Schließen"
                  onClick={() => actionPickerRef.current?.close()}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-[#374151] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#456990]/20"
                >
                  <X className="size-5" strokeWidth={2} />
                </button>
              </div>
              <p className="mt-3 max-h-[5.5rem] overflow-y-auto whitespace-pre-wrap text-[12px] font-normal leading-relaxed text-[#9ca3af]">
                {actionPickerItem.content}
              </p>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-7 pt-5">
              {(() => {
                const item = actionPickerItem;
                const b = busyId === item.id;
                const groupLabel = "text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]";
                return (
                  <div className="space-y-7">
                    <section className="space-y-2">
                      <p className={groupLabel}>Aktion</p>
                      <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-2.5">
                        <ActionPickerBtn
                          variant="primary"
                          label="Task"
                          icon={<CheckSquare strokeWidth={2} />}
                          disabled={b || noAreas}
                          onClick={() => dismissPickerThen(() => toggleInlineEdit(item, "task"))}
                          className="w-full sm:flex-1"
                        />
                        <ActionPickerBtn
                          variant="primary"
                          label="Termin"
                          icon={<CalendarPlus strokeWidth={2} />}
                          disabled={b}
                          onClick={() => dismissPickerThen(() => toggleInlineEdit(item, "calendar"))}
                          className="w-full sm:flex-1"
                        />
                      </div>
                    </section>
                    <section className="space-y-2">
                      <p className={groupLabel}>Weiteres</p>
                      <div className="flex flex-wrap gap-2.5">
                        <ActionPickerBtn
                          variant="standard"
                          label="Notiz"
                          icon={<StickyNote strokeWidth={2} />}
                          disabled={b}
                          onClick={() => dismissPickerThen(() => toggleInlineEdit(item, "note"))}
                          className="min-w-[7.5rem] flex-1 sm:min-w-[8.5rem]"
                        />
                        <ActionPickerBtn
                          variant="standard"
                          label="Dokument"
                          icon={<FileUp strokeWidth={2} />}
                          disabled={b}
                          onClick={() => dismissPickerThen(() => setDocumentDialogItem(item))}
                          className="min-w-[7.5rem] flex-1 sm:min-w-[8.5rem]"
                        />
                        <ActionPickerBtn
                          variant="standard"
                          label={PRODUCT_LABEL.ki}
                          icon={<Bot strokeWidth={2} />}
                          disabled={b}
                          onClick={() => dismissPickerThen(() => void runSparringFromInbox(item.id))}
                          className="min-w-[7.5rem] flex-1 sm:min-w-[8.5rem]"
                        />
                      </div>
                    </section>
                    <section className="space-y-2 pt-1">
                      <ActionPickerBtn
                        variant="danger"
                        label="Verwerfen"
                        icon={<Trash2 strokeWidth={2} />}
                        disabled={b}
                        onClick={() => dismissPickerThen(() => void run(item.id, discardInboxItem))}
                        className="w-full"
                      />
                    </section>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : null}
      </dialog>

      {variant === "dashboard" ? (
        <div className="min-w-0 space-y-4">
          {headingBlock}
          {loadError ? <AlertBanner variant="error">{loadError}</AlertBanner> : null}
          {!loadError && pending.length > 0 ? (
            <ul className="space-y-2.5">
              {(variant === "dashboard" ? dashboardPendingItems : pending).map((item) => {
                const b = busyId === item.id;
                const settling = settlingIds.has(item.id);
                const exiting = exitingIds.has(item.id);
                const isInlineOpen = inlineEdit?.itemId === item.id;
                const activeInlineKind = isInlineOpen ? inlineEdit?.kind : null;
                const suggestion = aiSuggestionById[item.id];
                const hasActiveSuggestion = Boolean(suggestion) && !rejectedById[item.id];
                const stop = (e: MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  e.stopPropagation();
                };
                return (
                  <li
                    key={item.id}
                    id={`inbox-item-${item.id}`}
                    className={cn(
                      "group relative overflow-hidden rounded-lg border border-leif-border/45 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-[max-height,opacity,transform,margin,border-color,box-shadow,background-color] duration-220 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
                      isInlineOpen ? "max-h-[120rem] opacity-100" : "max-h-40 opacity-100",
                      "hover:border-leif-border/65 hover:bg-[#FCFDFE] hover:shadow-[0_6px_16px_rgba(15,23,42,0.14)]",
                      successId === item.id && "ring-1 ring-leif-success/35",
                      settling && "bg-leif-surface-soft opacity-65 scale-[0.99]",
                      exiting && "pointer-events-none -translate-x-1 scale-[0.98] opacity-0 max-h-0 my-0 border-transparent",
                    )}
                  >
                    <div className="relative flex flex-row items-start">
                      <button
                        type="button"
                        aria-label={`Eingang verarbeiten: ${defaultTitleFromContent(item.content)}`}
                        disabled={b}
                        onClick={() => {
                          if (b) return;
                          if (typeof window !== "undefined" && window.getSelection()?.toString().trim()) return;
                          if (hasActiveSuggestion) return;
                          toggleInlineEdit(item, "task");
                        }}
                        className="min-w-0 flex-1 cursor-pointer px-3 py-2.5 text-left transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 sm:pr-24"
                      >
                        <p className="break-words text-[16px] font-medium leading-snug tracking-tight text-leif-text">
                          {dashboardPreviewFromContent(item.content)}
                        </p>
                        <p className="mt-1 text-[10px] font-normal leading-relaxed text-leif-muted/70">
                          <span>{item.source}</span>
                          <span className="text-leif-muted/55"> · {dashboardFormatCreated(item.created_at)}</span>
                        </p>
                        {hasActiveSuggestion && suggestion ? (
                          <p className="mt-1 truncate text-[10px] text-[#6b7280]">
                            KI: {toolLabel(suggestion.tool)} · {aiFilledFieldsSummary(suggestion).slice(0, 3).join(" · ") || "Titel"}
                          </p>
                        ) : null}
                      </button>
                      {hasActiveSuggestion && suggestion ? (
                        <div className="absolute bottom-1.5 right-2 z-[2] flex items-center gap-1.5 text-[10px]">
                          <button
                            type="button"
                            disabled={b}
                            onClick={(e) => {
                              stop(e);
                              void approveAiSuggestion(item);
                            }}
                            className="inline-flex size-5 items-center justify-center rounded border border-leif-success/40 bg-leif-success/10 text-leif-success hover:bg-leif-success/20"
                            title="KI-Vorschlag bestätigen"
                            aria-label="KI-Vorschlag bestätigen"
                          >
                            <CheckSquare className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={b}
                            onClick={(e) => {
                              stop(e);
                              void rejectAiSuggestion(item);
                            }}
                            className="inline-flex size-5 items-center justify-center rounded border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                            title="KI-Vorschlag ablehnen"
                            aria-label="KI-Vorschlag ablehnen"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ) : null}
                      <div
                        className={cn(
                          "z-[1] flex items-center gap-0 px-0.5 py-0.5 transition-opacity duration-150",
                          "pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 opacity-0",
                          "group-hover:pointer-events-auto group-hover:opacity-100",
                          "group-focus-within:pointer-events-auto group-focus-within:opacity-100",
                          hasActiveSuggestion && "hidden",
                          "max-sm:pointer-events-auto max-sm:static max-sm:translate-y-0 max-sm:self-center max-sm:opacity-100",
                        )}
                        role="group"
                        aria-label="Schnellaktionen"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DashboardQuickAction
                          label="Erledigen"
                          disabled={b}
                          onClick={(e) => {
                            stop(e);
                            void run(item.id, discardInboxItem);
                          }}
                        >
                          <Trash2 strokeWidth={2} />
                        </DashboardQuickAction>
                        <DashboardQuickAction
                          label="Als Task planen"
                          disabled={b || noAreas}
                          active={activeInlineKind === "task"}
                          onClick={(e) => {
                            stop(e);
                            toggleInlineEdit(item, "task");
                          }}
                        >
                          <CheckSquare strokeWidth={2} />
                        </DashboardQuickAction>
                        <DashboardQuickAction
                          label="Termin erstellen"
                          disabled={b}
                          active={activeInlineKind === "calendar"}
                          onClick={(e) => {
                            stop(e);
                            toggleInlineEdit(item, "calendar");
                          }}
                        >
                          <CalendarPlus strokeWidth={2} />
                        </DashboardQuickAction>
                        <DashboardQuickAction
                          label="Notiz"
                          disabled={b}
                          active={activeInlineKind === "note"}
                          onClick={(e) => {
                            stop(e);
                            toggleInlineEdit(item, "note");
                          }}
                        >
                          <StickyNote strokeWidth={2} />
                        </DashboardQuickAction>
                      </div>
                    </div>
                    {renderInlineEditor(item)}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : (
        <section
          className="space-y-4"
          aria-labelledby={heading === null ? undefined : "inbox-pending-heading"}
          aria-label={heading === null ? "Offene Inbox-Einträge" : undefined}
        >
          {headingBlock}

          {loadError ? <AlertBanner variant="error">{loadError}</AlertBanner> : null}

          {!loadError && pending.length === 0 ? (
            <EmptyState title="Inbox ist leer" description="Keine offenen Inbox-Einträge." />
          ) : null}

          {!loadError && pending.length > 0 ? (
            <div className="space-y-4">
              <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-y-3 gap-x-4">
                <div className="inline-flex shrink-0 items-center gap-2" role="group" aria-label="Sortierung">
                  <button
                    type="button"
                    onClick={() => setSortOrder("newest")}
                    className={buttonClassName(sortOrder === "newest" ? "primary" : "secondary", "sm")}
                  >
                    Neueste
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortOrder("oldest")}
                    className={buttonClassName(sortOrder === "oldest" ? "primary" : "secondary", "sm")}
                  >
                    Älteste
                  </button>
                </div>
                <div ref={sourceMenuRef} className="relative shrink-0">
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={sourceMenuOpen}
                    aria-label="Quelle filtern"
                    onClick={() => setSourceMenuOpen((o) => !o)}
                    className="inline-flex items-center gap-2 rounded-lg py-1.5 pl-2 pr-1.5 text-left transition-colors hover:bg-[#f3f4f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leif-primary/20"
                  >
                    <span className="text-[12px] text-[#9ca3af]">Quelle</span>
                    <span className="text-[13px] font-medium text-[#111827]">
                      {sourceFilter === "all" ? "Alle" : sourceFilter}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-3.5 shrink-0 text-[#b4bcc8] transition-transform duration-200",
                        sourceMenuOpen && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>
                  {sourceMenuOpen ? (
                    <div
                      role="listbox"
                      className="absolute right-0 top-[calc(100%+0.375rem)] z-50 min-w-[12.5rem] overflow-hidden rounded-xl border border-[#e8eaed] bg-white py-1.5 pl-1.5 pr-1.5 shadow-[0_10px_40px_rgba(15,23,42,0.14),0_2px_8px_rgba(15,23,42,0.06)]"
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={sourceFilter === "all"}
                        onClick={() => {
                          setSourceFilter("all");
                          setSourceMenuOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center rounded-md px-3 py-2.5 text-left text-[13px] font-medium text-[#111827] transition-colors",
                          sourceFilter === "all" ? "bg-[#f0f1f3]" : "hover:bg-[#f3f4f6]",
                        )}
                      >
                        Alle
                      </button>
                      {availableSources.length > 0 ? (
                        <>
                          <div className="mx-1 my-1.5 h-px bg-[#eef0f3]" role="separator" />
                          {availableSources.map((source) => (
                            <button
                              key={source}
                              type="button"
                              role="option"
                              aria-selected={sourceFilter === source}
                              onClick={() => {
                                setSourceFilter(source);
                                setSourceMenuOpen(false);
                              }}
                              className={cn(
                                "flex w-full items-center rounded-md px-3 py-2.5 text-left text-[13px] font-medium text-[#111827] transition-colors",
                                sourceFilter === source ? "bg-[#f0f1f3]" : "hover:bg-[#f3f4f6]",
                              )}
                            >
                              {source}
                            </button>
                          ))}
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
              <ul className={cn("space-y-2.5", compact && "space-y-2")}>
              {filteredAndSortedPending.map((item, index) => {
                const b = busyId === item.id;
                const isPickerForItem = actionPickerItem?.id === item.id;
                const hasOpenPicker = actionPickerItem !== null;
                const isInlineOpen = inlineEdit?.itemId === item.id;
                const activeInlineKind = isInlineOpen ? inlineEdit?.kind : null;
                const suggestion = aiSuggestionById[item.id];
                const hasActiveSuggestion = Boolean(suggestion) && !rejectedById[item.id];
                const isLeadCard = index === 0 && !hasOpenPicker && !isPickerForItem;
                const contentBits = splitInboxContent(item.content);
                const stop = (e: MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  e.stopPropagation();
                };
                return (
                  <li
                    id={`inbox-item-${item.id}`}
                    key={item.id}
                    aria-label={`Eingang verarbeiten: ${defaultTitleFromContent(item.content)}`}
                    className={cn(
                      "group relative overflow-hidden rounded-lg border transition-[border-color,box-shadow,background-color,opacity] duration-200 ease-out",
                      isLeadCard &&
                        "z-[1] border-[#eaecef] bg-[#fafbfc] shadow-[0_2px_10px_rgba(15,23,42,0.08)] hover:border-[#e2e5ea] hover:bg-[#f6f7f9] hover:shadow-[0_4px_14px_rgba(15,23,42,0.1)]",
                      !isLeadCard &&
                        !isPickerForItem &&
                        "scale-100 border-[#e5e7eb] bg-[#ffffff] shadow-[0_1px_4px_rgba(15,23,42,0.055)] hover:border-[#d1d5db] hover:shadow-[0_5px_16px_rgba(15,23,42,0.10)]",
                      hasOpenPicker && !isPickerForItem && "opacity-65",
                      isPickerForItem &&
                        "z-[2] scale-100 border-[#456990]/70 bg-[#f9fbfd] shadow-[0_9px_24px_rgba(69,105,144,0.18)] hover:shadow-[0_11px_26px_rgba(69,105,144,0.2)]",
                      isInlineOpen && "z-[2] border-[#456990]/55 bg-[#f9fbfd]",
                    )}
                    data-active={isPickerForItem ? "true" : "false"}
                  >
                    <div className="relative flex flex-row items-start">
                      <button
                        type="button"
                        disabled={b}
                        onClick={() => {
                          if (b) return;
                          if (typeof window !== "undefined" && window.getSelection()?.toString().trim()) return;
                          if (hasActiveSuggestion) return;
                          toggleInlineEdit(item, "task");
                        }}
                        className={cn(
                          "min-w-0 flex-1 cursor-pointer text-left transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 sm:pr-24",
                          compact ? "px-3 py-2.5" : "px-[18px] py-4",
                        )}
                      >
                        <p className="line-clamp-2 break-words text-[16px] font-semibold leading-relaxed tracking-tight text-[#111827]">
                          {contentBits.title}
                        </p>
                        {contentBits.preview ? (
                          <p className="mt-1 line-clamp-2 break-words text-[13px] leading-relaxed text-[#6b7280]">
                            {contentBits.preview}
                          </p>
                        ) : null}
                        <p className="mt-1.5 text-sm font-normal leading-relaxed text-[#9ca3af]">
                          <span>{item.source}</span>
                          <span className="text-[#9ca3af]"> · {formatWhen(item.created_at)}</span>
                        </p>
                        {hasActiveSuggestion && suggestion ? (
                          <p className="mt-2 line-clamp-1 text-[11px] text-[#6b7280]">
                            KI: {toolLabel(suggestion.tool)} · {aiFilledFieldsSummary(suggestion).slice(0, 4).join(" · ") || "Titel"}
                          </p>
                        ) : null}
                      </button>
                      {hasActiveSuggestion && suggestion ? (
                        <div className="absolute bottom-2 right-2 z-[2] flex items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            disabled={b}
                            onClick={(e) => {
                              stop(e);
                              void approveAiSuggestion(item);
                            }}
                            className="inline-flex size-5 items-center justify-center rounded border border-leif-success/40 bg-leif-success/10 text-leif-success hover:bg-leif-success/20"
                            title="KI-Vorschlag bestätigen"
                            aria-label="KI-Vorschlag bestätigen"
                          >
                            <CheckSquare className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={b}
                            onClick={(e) => {
                              stop(e);
                              void rejectAiSuggestion(item);
                            }}
                            className="inline-flex size-5 items-center justify-center rounded border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                            title="KI-Vorschlag ablehnen"
                            aria-label="KI-Vorschlag ablehnen"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ) : null}
                      <div
                        className={cn(
                          "z-[1] flex items-center gap-0 px-1 py-0.5 transition-opacity duration-150",
                          "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-0",
                          "group-hover:pointer-events-auto group-hover:opacity-100",
                          "group-focus-within:pointer-events-auto group-focus-within:opacity-100",
                          hasActiveSuggestion && "hidden",
                          isPickerForItem && "pointer-events-auto opacity-100",
                          "max-sm:pointer-events-auto max-sm:static max-sm:translate-y-0 max-sm:self-center max-sm:opacity-100",
                        )}
                        role="group"
                        aria-label="Schnellaktionen"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DashboardQuickAction
                          label="Verwerfen"
                          disabled={b}
                          onClick={(e) => {
                            stop(e);
                            void run(item.id, discardInboxItem);
                          }}
                        >
                          <Trash2 strokeWidth={2} />
                        </DashboardQuickAction>
                        <DashboardQuickAction
                          label="Task"
                          disabled={b || noAreas}
                          active={activeInlineKind === "task"}
                          onClick={(e) => {
                            stop(e);
                            toggleInlineEdit(item, "task");
                          }}
                        >
                          <CheckSquare strokeWidth={2} />
                        </DashboardQuickAction>
                        <DashboardQuickAction
                          label="Termin"
                          disabled={b}
                          active={activeInlineKind === "calendar"}
                          onClick={(e) => {
                            stop(e);
                            toggleInlineEdit(item, "calendar");
                          }}
                        >
                          <CalendarPlus strokeWidth={2} />
                        </DashboardQuickAction>
                        <DashboardQuickAction
                          label="Notiz"
                          disabled={b}
                          active={activeInlineKind === "note"}
                          onClick={(e) => {
                            stop(e);
                            toggleInlineEdit(item, "note");
                          }}
                        >
                          <StickyNote strokeWidth={2} />
                        </DashboardQuickAction>
                        <DashboardQuickAction
                          label="Mehr…"
                          disabled={b}
                          onClick={(e) => {
                            stop(e);
                            setActionPickerItem(item);
                          }}
                        >
                          <Bot strokeWidth={2} />
                        </DashboardQuickAction>
                      </div>
                    </div>
                    {renderInlineEditor(item)}
                  </li>
                );
              })}
              </ul>
            </div>
          ) : null}

          {closedLoadError ? (
            <AlertBanner variant="error">Geschlossene Einträge: {closedLoadError}</AlertBanner>
          ) : null}

          <div className="space-y-3 border-t border-[#e5e7eb] pt-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <h3 className="text-[14px] font-semibold tracking-tight text-[#374151]">
                Erledigt ({completedTotalCount})
              </h3>
              <input
                type="search"
                value={completedQuery}
                onChange={(e) => setCompletedQuery(e.target.value)}
                placeholder="Erledigte durchsuchen…"
                disabled={Boolean(closedLoadError) || recentCompletedSorted.length === 0}
                className="w-full min-w-0 rounded-lg border-0 bg-[#f3f4f6] px-3 py-2 text-[12px] text-[#374151] outline-none transition-colors placeholder:text-[#9ca3af] focus-visible:bg-[#eceef2] disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-[240px] sm:shrink-0"
                aria-label="Erledigte Einträge filtern"
              />
            </div>
            {!closedLoadError && completedTotalCount === 0 ? (
              <p className="text-[13px] text-[#9ca3af]">Noch keine erledigten Einträge.</p>
            ) : null}
            {!closedLoadError && recentCompletedSorted.length > 0 && completedFiltered.length === 0 ? (
              <p className="text-[13px] text-[#9ca3af]">Keine Treffer.</p>
            ) : null}
            {!closedLoadError && completedFiltered.length > 0 ? (
              <ul className={cn("space-y-2", compact && "space-y-1.5")}>
                {completedFiltered.map((item) => {
                  const bits = splitInboxContent(item.content);
                  const href = hrefForProcessedInboxItem(item);
                  const body = (
                    <>
                      <p className="line-clamp-2 break-words text-[16px] font-semibold leading-relaxed tracking-tight text-[#111827]">
                        {bits.title}
                      </p>
                      {bits.preview ? (
                        <p className="mt-1 line-clamp-2 break-words text-[13px] leading-relaxed text-[#6b7280]">
                          {bits.preview}
                        </p>
                      ) : null}
                      <p className="mt-1.5 text-sm font-normal leading-relaxed text-[#9ca3af]">
                        <span>{item.source}</span>
                        <span> · {formatWhen(item.updated_at)}</span>
                      </p>
                    </>
                  );
                  return (
                    <li key={item.id} className="list-none">
                      {href ? (
                        <Link
                          href={href}
                          className="block rounded-lg border border-[#e5e7eb] bg-[#F7F8FA] px-[18px] py-4 shadow-[0_1px_4px_rgba(15,23,42,0.05)] transition-[box-shadow,background-color,border-color] duration-150 hover:border-[#dce0e5] hover:bg-[#f1f3f6] hover:shadow-[0_2px_8px_rgba(15,23,42,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leif-primary/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                        >
                          {body}
                        </Link>
                      ) : (
                        <div className="rounded-lg border border-[#e5e7eb] bg-[#F7F8FA] px-[18px] py-4 shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
                          {body}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          <div className="space-y-2 border-t border-[#e5e7eb] pt-4">
            <button
              type="button"
              onClick={() => setDiscardedOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-2 py-1 text-left text-[13px] font-medium text-[#6b7280] transition-colors hover:text-[#374151]"
              aria-expanded={discardedOpen}
            >
              <span>Gelöscht ({discardedSorted.length})</span>
              <ChevronDown
                className={cn("size-4 shrink-0 text-[#9ca3af] transition-transform", discardedOpen && "rotate-180")}
                aria-hidden
              />
            </button>
            {discardedOpen && !closedLoadError ? (
              discardedSorted.length === 0 ? (
                <p className="pb-1 text-[12px] text-[#9ca3af]">Keine gelöschten Einträge.</p>
              ) : (
                <ul className="divide-y divide-[#e5e7eb] border-t border-[#e5e7eb]">
                  {discardedSorted.map((item) => (
                    <li key={item.id} className="py-2.5 pr-1">
                      <p className="line-clamp-1 text-[12px] leading-snug text-[#6b7280]">{item.content.trim() || "—"}</p>
                      <p className="mt-0.5 text-[11px] text-[#9ca3af]">
                        {item.source} · {formatWhen(item.updated_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </div>
        </section>
      )}

      <dialog
        ref={documentDialogRef}
        className="w-[min(100vw-2rem,28rem)] rounded-[12px] border border-leif-border bg-leif-surface p-0 text-leif-text shadow-leif [&::backdrop]:bg-black/25"
        onClose={() => setDocumentDialogItem(null)}
      >
        {documentDialogItem ? (
          <div className="flex flex-col">
            <header className="border-b border-leif-divider px-6 py-4">
              <h3 className="text-base font-semibold text-leif-text">{PRODUCT_COPY.inboxDocumentDialogTitle}</h3>
              <p className="mt-1 text-[12px] text-leif-muted">{PRODUCT_COPY.inboxDocumentDialogBody}</p>
            </header>
            <form
              id={documentFormId}
              key={documentDialogItem.id}
              onSubmit={(e) => void submitDocumentFromInbox(e)}
              className="space-y-4 p-6"
            >
              <label className="block text-sm font-medium text-leif-secondary">
                Titel
                <input
                  name="title"
                  type="text"
                  required
                  defaultValue={defaultTitleFromContent(documentDialogItem.content)}
                  className={`${controlClass} mt-2`}
                />
              </label>
            </form>
            <footer className="flex justify-end gap-2 border-t border-leif-divider px-6 py-4">
              <Button type="button" variant="secondary" onClick={() => setDocumentDialogItem(null)}>
                Abbrechen
              </Button>
              <Button
                type="submit"
                form={documentFormId}
                variant="primary"
                disabled={busyId === documentDialogItem.id}
              >
                {busyId === documentDialogItem.id ? "Speichern…" : "Dokument anlegen"}
              </Button>
            </footer>
          </div>
        ) : null}
      </dialog>

    </>
  );
}
