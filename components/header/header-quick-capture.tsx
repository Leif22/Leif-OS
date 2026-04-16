"use client";

import { createInboxItemFromTaskDraft } from "@/app/(app)/inbox/actions";
import { createCalendarEvent } from "@/app/(app)/kalender/actions";
import { createNote } from "@/app/(app)/notizen/actions";
import { createTask, listProjects, type TaskFormPayload } from "@/app/(app)/tasks/actions";
import { CaptureModeSelect } from "@/components/header/capture-mode-select";
import type { HeaderCaptureMode } from "@/components/header/capture-modes";
import { cn } from "@/lib/cn";
import { PRODUCT_COPY } from "@/lib/product-labels";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

const fieldClass = cn(
  "h-10 min-w-0 flex-1 rounded-[10px] border border-leif-border/60 bg-leif-surface px-2.5 text-[13px] text-leif-text",
  "placeholder:text-leif-muted",
  "shadow-[0_1px_2px_rgba(15,23,42,0.045)] transition-[border-color,box-shadow] duration-200 ease-out",
  "hover:border-leif-border/75 focus:border-leif-border/70 focus:outline-none",
  "focus:shadow-[0_0_0_2px_color-mix(in_srgb,var(--leif-primary)_14%,transparent),0_2px_8px_-2px_rgba(15,23,42,0.08)]",
);

const compactFieldClass = cn(
  "h-10 shrink-0 rounded-[10px] border border-leif-border/60 bg-leif-surface px-2 text-[13px] text-leif-text tabular-nums",
  "placeholder:text-leif-muted shadow-[0_1px_2px_rgba(15,23,42,0.045)]",
  "hover:border-leif-border/75 focus:border-leif-border/70 focus:outline-none",
  "focus:shadow-[0_0_0_2px_color-mix(in_srgb,var(--leif-primary)_14%,transparent)]",
);

/** Dauer-Schnellauswahl (15er-Takt, bis 90 min); Standard 30. */
const HEADER_TASK_DURATION_MINUTES = [15, 30, 45, 60, 75, 90] as const;

function addHoursIso(isoStart: string, hours: number): string {
  const t = new Date(isoStart).getTime();
  return new Date(t + hours * 3600000).toISOString();
}

function parseTaskDurationMinutes(raw: string): number {
  const n = Math.floor(Number(raw));
  if (HEADER_TASK_DURATION_MINUTES.includes(n as (typeof HEADER_TASK_DURATION_MINUTES)[number])) return n;
  return 30;
}

export function HeaderQuickCapture() {
  const router = useRouter();
  const primaryFieldRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<HeaderCaptureMode>("inbox");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskMinutes, setTaskMinutes] = useState("30");
  const [taskDue, setTaskDue] = useState("");

  const [evTitle, setEvTitle] = useState("");
  const [evStartLocal, setEvStartLocal] = useState("");

  const [noteTitle, setNoteTitle] = useState("");
  const [noteProjectId, setNoteProjectId] = useState("");
  const [noteProjects, setNoteProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    setError(null);
    queueMicrotask(() => primaryFieldRef.current?.focus());
  }, [mode]);

  useEffect(() => {
    if (mode !== "notiz") return;
    let cancelled = false;
    void listProjects().then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setNoteProjects(res.projects);
        return;
      }
      setNoteProjects([]);
      setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    if (mode === "inbox") {
      const fd = new FormData(e.currentTarget);
      const title = String(fd.get("inbox_title") ?? "").trim();
      if (!title) return;
      setPending(true);
      try {
        const res = await createInboxItemFromTaskDraft({ title, createdFrom: "header_inbox" });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        e.currentTarget.reset();
        primaryFieldRef.current?.focus();
        router.refresh();
      } finally {
        setPending(false);
      }
      return;
    }

    if (mode === "task") {
      const title = taskTitle.trim();
      if (!title) return;
      const planned = taskDue.trim() || null;
      const minutes = parseTaskDurationMinutes(taskMinutes);
      const payload: TaskFormPayload = {
        title,
        description: "",
        task_type: null,
        priority: "normal",
        planned_date: planned,
        estimated_minutes: minutes,
        document_id: null,
        project_id: null,
      };
      setPending(true);
      try {
        const res = await createTask(payload);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setTaskTitle("");
        setTaskMinutes("30");
        setTaskDue("");
        router.refresh();
      } finally {
        setPending(false);
      }
      return;
    }

    if (mode === "termin") {
      const title = evTitle.trim();
      if (!title) return;
      const local = evStartLocal.trim();
      if (!local) {
        setError("Bitte Beginn (Datum/Zeit) wählen.");
        return;
      }
      const start = new Date(local);
      if (!Number.isFinite(start.getTime())) {
        setError("Ungültiges Datum/Zeit.");
        return;
      }
      const start_time = start.toISOString();
      const end_time = addHoursIso(start_time, 1);
      setPending(true);
      try {
        const res = await createCalendarEvent({
          title,
          description: "",
          start_time,
          end_time,
          is_all_day: false,
          is_private: false,
          writeToOutlook: false,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setEvTitle("");
        setEvStartLocal("");
        router.refresh();
      } finally {
        setPending(false);
      }
      return;
    }

    if (mode === "notiz") {
      const title = noteTitle.trim();
      if (!title) return;
      setPending(true);
      try {
        const res = await createNote({
          title,
          description: null,
          content: "",
          type: "note",
          area_id: null,
          project_id: noteProjectId.trim() || null,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setNoteTitle("");
        setNoteProjectId("");
        router.refresh();
      } finally {
        setPending(false);
      }
    }
  }

  const disabled = pending;

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="w-full">
      <div
        className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2"
        data-header-capture-root
      >
        <CaptureModeSelect value={mode} onChange={setMode} disabled={disabled} />

        {/*
          Erweiterungspunkt KI (nur Inbox): unterhalb dieser Zeile später z. B. Vorschläge/Chips einbinden,
          ohne den Modus „KI“ im Dropdown — z. B. {mode === "inbox" && <HeaderInboxAiHints … />}.
        */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5" data-header-capture-fields>
          {mode === "inbox" ? (
            <>
              <label htmlFor="header-capture-inbox-title" className="sr-only">
                {PRODUCT_COPY.headerCaptureModeInbox}
              </label>
              <input
                ref={primaryFieldRef}
                id="header-capture-inbox-title"
                name="inbox_title"
                type="text"
                autoComplete="off"
                disabled={disabled}
                placeholder={pending ? "Wird angelegt…" : PRODUCT_COPY.headerCapturePlaceholderInbox}
                className={cn(fieldClass, pending && "cursor-wait opacity-80", error && "border-leif-error/60")}
              />
            </>
          ) : null}

          {mode === "task" ? (
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <input
                ref={primaryFieldRef}
                id="header-capture-task-title"
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                autoComplete="off"
                disabled={disabled}
                placeholder={PRODUCT_COPY.headerCapturePlaceholderTask}
                className={cn(fieldClass, pending && "opacity-80", error && "border-leif-error/60")}
              />
              <div className="flex shrink-0 flex-wrap gap-2 sm:flex-nowrap">
                <select
                  value={taskMinutes}
                  onChange={(e) => setTaskMinutes(e.target.value)}
                  disabled={disabled}
                  aria-label={PRODUCT_COPY.headerCaptureDurationHint}
                  className={cn(compactFieldClass, "min-w-[5.25rem] max-w-[6.5rem] cursor-pointer")}
                >
                  {HEADER_TASK_DURATION_MINUTES.map((m) => (
                    <option key={m} value={String(m)}>
                      {m} min
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={taskDue}
                  onChange={(e) => setTaskDue(e.target.value)}
                  disabled={disabled}
                  aria-label={PRODUCT_COPY.headerCaptureDueHint}
                  className={cn(compactFieldClass, "min-w-[9.5rem] max-w-[11rem]")}
                />
              </div>
            </div>
          ) : null}

          {mode === "termin" ? (
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <input
                ref={primaryFieldRef}
                type="text"
                value={evTitle}
                onChange={(e) => setEvTitle(e.target.value)}
                autoComplete="off"
                disabled={disabled}
                placeholder={PRODUCT_COPY.headerCapturePlaceholderTermin}
                className={cn(fieldClass, pending && "opacity-80", error && "border-leif-error/60")}
              />
              <input
                type="datetime-local"
                value={evStartLocal}
                onChange={(e) => setEvStartLocal(e.target.value)}
                disabled={disabled}
                aria-label={PRODUCT_COPY.headerCaptureStartHint}
                className={cn(compactFieldClass, "min-w-0 sm:min-w-[11.25rem]")}
              />
            </div>
          ) : null}

          {mode === "notiz" ? (
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <input
                ref={primaryFieldRef}
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                autoComplete="off"
                disabled={disabled}
                placeholder={PRODUCT_COPY.headerCapturePlaceholderNotiz}
                className={cn(fieldClass, pending && "opacity-80", error && "border-leif-error/60")}
              />
              <select
                value={noteProjectId}
                onChange={(e) => setNoteProjectId(e.target.value)}
                disabled={disabled}
                aria-label={PRODUCT_COPY.headerCaptureNoteProjectHint}
                className={cn(
                  compactFieldClass,
                  "min-w-0 max-w-full cursor-pointer sm:max-w-[14rem] sm:min-w-[10rem]",
                )}
              >
                <option value="">{PRODUCT_COPY.headerCaptureNoteNoProject}</option>
                {noteProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-1 text-xs text-leif-error">{error}</p> : null}
    </form>
  );
}
