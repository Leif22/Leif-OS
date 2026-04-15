"use client";

import { updateTask, type TaskFormPayload } from "@/app/(app)/tasks/actions";
import { Button } from "@/components/ui/button";
import { controlClass, textareaClass } from "@/components/ui/control-styles";
import { cn } from "@/lib/cn";
import type { TaskTypeRow } from "@/lib/task-types/defaults";
import { TASK_PRIORITIES, type TaskPriority, type TaskType, type TaskWithRelations } from "@/lib/tasks/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

type PlanChoice = "inbox" | "today" | "tomorrow" | "date";

type Props = {
  task: TaskWithRelations;
  taskTypes: TaskTypeRow[];
  documents: { id: string; title: string }[];
  onRequestClose: () => void;
  className?: string;
};

type DraftState = {
  title: string;
  estimated_minutes: string;
  planChoice: PlanChoice;
  planned_date: string;
  task_type: string;
  priority: TaskPriority;
  description: string;
  document_id: string;
};

function ymdFromLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta, 12, 0, 0, 0);
  return ymdFromLocalDate(dt);
}

function initialDraft(task: TaskWithRelations): DraftState {
  return {
    title: task.title,
    estimated_minutes: task.estimated_minutes ? String(task.estimated_minutes) : "",
    planChoice: task.planned_date ? "date" : "inbox",
    planned_date: task.planned_date ?? "",
    task_type: task.task_type ?? "",
    priority: task.priority,
    description: task.description ?? "",
    document_id: task.document_id ?? "",
  };
}

function toPayload(draft: DraftState): TaskFormPayload {
  const estStr = draft.estimated_minutes.trim();
  let estimated: number | null = null;
  if (estStr !== "") {
    const n = Number(estStr);
    estimated = Number.isFinite(n) ? Math.round(n) : null;
  }

  const today = ymdFromLocalDate(new Date());
  let plannedDate: string | null = null;
  if (draft.planChoice === "today") plannedDate = today;
  else if (draft.planChoice === "tomorrow") plannedDate = addDaysYmd(today, 1);
  else if (draft.planChoice === "date") plannedDate = draft.planned_date.trim() || null;

  return {
    title: draft.title,
    description: draft.description,
    task_type: (draft.task_type.trim() || null) as TaskType | null,
    priority: draft.priority,
    planned_date: plannedDate,
    estimated_minutes: estimated,
    document_id: draft.document_id.trim() || null,
  };
}

export function TaskInlineEditor({ task, taskTypes, documents, onRequestClose, className }: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<DraftState>(() => initialDraft(task));
  const [lastSaved, setLastSaved] = useState<TaskFormPayload>(() => toPayload(initialDraft(task)));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    const nextDraft = initialDraft(task);
    setDraft(nextDraft);
    setLastSaved(toPayload(nextDraft));
    setError(null);
    setPending(false);
    setDetailsOpen(false);
  }, [task]);

  const payload = useMemo(() => toPayload(draft), [draft]);
  const hasChanges = JSON.stringify(payload) !== JSON.stringify(lastSaved);

  async function persist(closeAfterSave = false) {
    if (pending) return;
    if (!hasChanges) {
      if (closeAfterSave) onRequestClose();
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await updateTask(task.id, payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setLastSaved(payload);
      router.refresh();
      if (closeAfterSave) onRequestClose();
    } finally {
      setPending(false);
    }
  }

  function handleRootBlur(event: React.FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (next instanceof Node && rootRef.current?.contains(next)) return;
    void persist(false);
  }

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      void persist(true);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  });

  function onTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void persist(true);
  }

  return (
    <div
      ref={rootRef}
      onBlurCapture={handleRootBlur}
      className={cn("rounded-lg border border-leif-border bg-leif-surface p-4 shadow-sm", className)}
    >
      <div className="space-y-4">
        {error ? (
          <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
        ) : null}
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-leif-secondary">Titel</span>
          <input
            value={draft.title}
            onChange={(e) => setDraft((current) => ({ ...current, title: e.target.value }))}
            onKeyDown={onTitleKeyDown}
            className={`${controlClass} text-base`}
            autoFocus
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-leif-secondary">Dauer</span>
            <select
              value={draft.estimated_minutes}
              onChange={(e) => setDraft((current) => ({ ...current, estimated_minutes: e.target.value }))}
              className={controlClass}
            >
              <option value="">—</option>
              {[15, 30, 45, 60].map((minutes) => (
                <option key={minutes} value={String(minutes)}>
                  {minutes} min
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-leif-secondary">Wann</span>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={draft.planChoice === "today" ? "primary" : "secondary"}
                onClick={() => setDraft((current) => ({ ...current, planChoice: "today" }))}
              >
                Heute
              </Button>
              <Button
                type="button"
                size="sm"
                variant={draft.planChoice === "tomorrow" ? "primary" : "secondary"}
                onClick={() => setDraft((current) => ({ ...current, planChoice: "tomorrow" }))}
              >
                Morgen
              </Button>
              <Button
                type="button"
                size="sm"
                variant={draft.planChoice === "date" ? "primary" : "secondary"}
                onClick={() => setDraft((current) => ({ ...current, planChoice: "date" }))}
              >
                Datum
              </Button>
              <Button
                type="button"
                size="sm"
                variant={draft.planChoice === "inbox" ? "primary" : "secondary"}
                onClick={() => setDraft((current) => ({ ...current, planChoice: "inbox" }))}
              >
                Inbox
              </Button>
            </div>
            {draft.planChoice === "date" ? (
              <input
                type="date"
                value={draft.planned_date}
                onChange={(e) => setDraft((current) => ({ ...current, planned_date: e.target.value }))}
                className={controlClass}
              />
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
          <div className="space-y-2">
            <p className="text-sm font-medium text-leif-secondary">Art</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={draft.task_type === "" ? "primary" : "secondary"}
                onClick={() => setDraft((current) => ({ ...current, task_type: "" }))}
              >
                —
              </Button>
              {taskTypes.map((type) => (
                <Button
                  key={type.id}
                  type="button"
                  size="sm"
                  variant={draft.task_type === type.key ? "primary" : "secondary"}
                  onClick={() => setDraft((current) => ({ ...current, task_type: type.key }))}
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-2 text-sm sm:max-w-[10rem]">
            <span className="font-medium text-leif-secondary">Priorität</span>
            <select
              value={draft.priority}
              onChange={(e) => setDraft((current) => ({ ...current, priority: e.target.value as TaskPriority }))}
              className={controlClass}
            >
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setDetailsOpen((current) => !current)}
            className="text-xs font-medium text-leif-secondary underline-offset-2 hover:text-leif-text hover:underline"
          >
            {detailsOpen ? "Details einklappen" : "Beschreibung & Dokument"}
          </button>
          {detailsOpen ? (
            <div className="grid gap-3">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-leif-secondary">Beschreibung</span>
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft((current) => ({ ...current, description: e.target.value }))}
                  className={textareaClass}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-leif-secondary">Dokument</span>
                <select
                  value={draft.document_id}
                  onChange={(e) => setDraft((current) => ({ ...current, document_id: e.target.value }))}
                  className={controlClass}
                >
                  <option value="">—</option>
                  {documents.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>
      </div>
      {pending ? <p className="mt-3 text-xs text-leif-secondary">Speichern…</p> : null}
    </div>
  );
}
