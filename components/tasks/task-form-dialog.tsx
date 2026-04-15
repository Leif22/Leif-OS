"use client";

import {
  createTask,
  updateTask,
  type RecommendationFeedbackInput,
  type TaskFormPayload,
} from "@/app/(app)/tasks/actions";
import { Button } from "@/components/ui/button";
import { controlClass, textareaClass } from "@/components/ui/control-styles";
import { PRODUCT_COPY } from "@/lib/product-labels";
import { DEFAULT_TASK_TYPES } from "@/lib/task-types/defaults";
import type { SparringTaskDraft } from "@/lib/sparring/task-draft";
import type { TaskTypeRow } from "@/lib/task-types/defaults";
import type { AreaRow, TaskPriority, TaskType, TaskWithRelations } from "@/lib/tasks/types";
import { TASK_PRIORITIES } from "@/lib/tasks/types";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

type Mode = "create" | "edit";
type PlanChoice = "inbox" | "today" | "tomorrow" | "date";

type Props = {
  open: boolean;
  mode: Mode;
  task: TaskWithRelations | null;
  areas: AreaRow[];
  taskTypes?: TaskTypeRow[];
  documents?: { id: string; title: string }[];
  onClose: () => void;
  /** Bei Bearbeitung aus dem Empfehlungsblock: Feedback „accepted“ nach Speichern loggen */
  recommendationFeedback?: RecommendationFeedbackInput | null;
  /** Vorausfüllung + Verknüpfung beim Anlegen aus Sparring */
  sparringCreateContext?: SparringTaskDraft | null;
  /** Create-Modus: Bereich aus z. B. `/tasks?new=1&area=` */
  initialCreateAreaId?: string | null;
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

function toPayload(fd: FormData): TaskFormPayload {
  const est = fd.get("estimated_minutes");
  const estStr = typeof est === "string" ? est.trim() : "";
  let estimated: number | null = null;
  if (estStr !== "") {
    const n = Number(estStr);
    estimated = Number.isFinite(n) ? Math.round(n) : null;
  }
  const planChoice = String(fd.get("plan_choice") ?? "inbox") as PlanChoice;
  const customDate = String(fd.get("planned_date") ?? "").trim();
  const today = ymdFromLocalDate(new Date());
  let plannedDate: string | null = null;
  if (planChoice === "today") plannedDate = today;
  else if (planChoice === "tomorrow") plannedDate = addDaysYmd(today, 1);
  else if (planChoice === "date") plannedDate = customDate || null;

  return {
    title: String(fd.get("title") ?? ""),
    description: String(fd.get("description") ?? ""),
    task_type: (String(fd.get("task_type") ?? "").trim() || null) as TaskType | null,
    priority: String(fd.get("priority") ?? "normal") as TaskPriority,
    planned_date: plannedDate,
    estimated_minutes: estimated,
    document_id: String(fd.get("document_id") ?? "").trim() || null,
  };
}

export function TaskFormDialog({
  open,
  mode,
  task,
  areas,
  taskTypes = DEFAULT_TASK_TYPES.map((t) => ({
    id: t.key,
    key: t.key,
    label: t.label,
    sort_order: t.sort_order,
  })),
  documents = [],
  onClose,
  recommendationFeedback = null,
  sparringCreateContext = null,
  initialCreateAreaId = null,
}: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formId = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [planChoice, setPlanChoice] = useState<PlanChoice>("inbox");

  useEffect(() => {
    if (!open) return;
    if (task?.planned_date) setPlanChoice("date");
    else setPlanChoice("inbox");
  }, [open, task?.planned_date]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      setError(null);
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = toPayload(fd);
    setPending(true);
    try {
      const res =
        mode === "create"
          ? await createTask(
              payload,
              sparringCreateContext
                ? { source_sparring_chat_id: sparringCreateContext.chat_id }
                : undefined,
            )
          : task
            ? await updateTask(
                task.id,
                payload,
                recommendationFeedback
                  ? { recommendationFeedback }
                  : undefined,
              )
            : { ok: false as const, error: "Kein Task ausgewählt." };
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="w-[min(100vw-2rem,32rem)] max-h-[min(90vh,40rem)] overflow-hidden rounded-[12px] border border-leif-border bg-leif-surface p-0 text-leif-text shadow-leif [&::backdrop]:bg-black/25"
      onClose={() => {
        onClose();
      }}
    >
      <div className="flex max-h-[min(90vh,40rem)] flex-col">
        <header className="border-b border-leif-divider px-6 py-4">
          <h2 className="text-base font-semibold tracking-tight text-leif-text">
            {mode === "create" ? "Task anlegen" : "Task bearbeiten"}
          </h2>
          {mode === "create" && sparringCreateContext ? (
            <p className="mt-1 text-[12px] text-leif-muted">
              {PRODUCT_COPY.taskFromKiHint}
            </p>
          ) : null}
        </header>
        <form
          id={formId}
          key={
            mode === "create"
              ? `new-${sparringCreateContext?.chat_id ?? initialCreateAreaId ?? "plain"}`
              : (task?.id ?? "edit")
          }
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-4 overflow-y-auto p-6"
        >
          {error ? (
            <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              {error}
            </p>
          ) : null}

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-leif-secondary">
              Titel <span className="text-leif-error">*</span>
            </span>
            <input
              name="title"
              type="text"
              required
              autoComplete="off"
              defaultValue={task?.title ?? sparringCreateContext?.title ?? ""}
              className={`${controlClass} text-base`}
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-leif-secondary">
                Dauer (Min.) {planChoice !== "inbox" ? <span className="text-leif-error">*</span> : null}
              </span>
              <input
                name="estimated_minutes"
                type="number"
                min={0}
                step={5}
                placeholder={planChoice === "inbox" ? "optional" : "z. B. 30"}
                defaultValue={task?.estimated_minutes ?? ""}
                className={controlClass}
                required={planChoice !== "inbox"}
              />
            </label>
            <div className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-leif-secondary">Wann</span>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={controlClass} onClick={() => setPlanChoice("today")}>
                  Heute
                </button>
                <button type="button" className={controlClass} onClick={() => setPlanChoice("tomorrow")}>
                  Morgen
                </button>
                <button type="button" className={controlClass} onClick={() => setPlanChoice("date")}>
                  Datum
                </button>
                <button type="button" className={controlClass} onClick={() => setPlanChoice("inbox")}>
                  Inbox
                </button>
              </div>
              <input type="hidden" name="plan_choice" value={planChoice} />
            </div>
          </div>

          {planChoice === "date" ? (
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-leif-secondary">Datum</span>
              <input
                name="planned_date"
                type="date"
                defaultValue={task?.planned_date ?? ""}
                className={controlClass}
                required
              />
            </label>
          ) : (
            <input type="hidden" name="planned_date" value={task?.planned_date ?? ""} />
          )}

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-leif-secondary">Art</span>
              <select
                name="task_type"
                defaultValue={task?.task_type ?? ""}
                className={controlClass}
              >
                <option value="">—</option>
                {taskTypes.map((t) => (
                  <option key={t.id} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-leif-secondary">Priorität</span>
              <select name="priority" defaultValue={task?.priority ?? "normal"} className={controlClass}>
                {TASK_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-leif-secondary">Beschreibung</span>
            <textarea
              name="description"
              rows={3}
              defaultValue={task?.description ?? sparringCreateContext?.description ?? ""}
              className={textareaClass}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-leif-secondary">Dokument (optional)</span>
            <select name="document_id" defaultValue={task?.document_id ?? ""} className={controlClass}>
              <option value="">—</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </label>
        </form>
        <footer className="flex justify-end gap-2 border-t border-leif-divider px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
          <Button type="submit" form={formId} variant="primary" disabled={pending}>
            {pending ? "Speichern…" : "Speichern"}
          </Button>
        </footer>
      </div>
    </dialog>
  );
}
