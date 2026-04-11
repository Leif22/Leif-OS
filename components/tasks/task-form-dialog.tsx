"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createTask,
  updateTask,
  type RecommendationFeedbackInput,
  type TaskFormPayload,
} from "@/app/(app)/tasks/actions";
import type { AreaRow, TaskPriority, TaskStatus, TaskWithRelations } from "@/lib/tasks/types";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/tasks/types";

type Mode = "create" | "edit";

type Props = {
  open: boolean;
  mode: Mode;
  task: TaskWithRelations | null;
  areas: AreaRow[];
  onClose: () => void;
  /** Bei Bearbeitung aus dem Empfehlungsblock: Feedback „accepted“ nach Speichern loggen */
  recommendationFeedback?: RecommendationFeedbackInput | null;
};

function toPayload(fd: FormData): TaskFormPayload {
  const est = fd.get("estimated_minutes");
  const estStr = typeof est === "string" ? est.trim() : "";
  let estimated: number | null = null;
  if (estStr !== "") {
    const n = Number(estStr);
    estimated = Number.isFinite(n) ? Math.round(n) : null;
  }
  return {
    title: String(fd.get("title") ?? ""),
    description: String(fd.get("description") ?? ""),
    area_id: String(fd.get("area_id") ?? ""),
    status: String(fd.get("status") ?? "open") as TaskStatus,
    priority: String(fd.get("priority") ?? "medium") as TaskPriority,
    tagsRaw: String(fd.get("tags") ?? ""),
    due_date: String(fd.get("due_date") ?? "") || null,
    planned_date: String(fd.get("planned_date") ?? "") || null,
    estimated_minutes: estimated,
  };
}

export function TaskFormDialog({
  open,
  mode,
  task,
  areas,
  onClose,
  recommendationFeedback = null,
}: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formId = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = toPayload(fd);
    setPending(true);
    try {
      const res =
        mode === "create"
          ? await createTask(payload)
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
      className="w-[min(100vw-2rem,32rem)] max-h-[min(90vh,40rem)] overflow-hidden rounded-lg border border-zinc-200 bg-background p-0 text-foreground shadow-xl dark:border-zinc-800 [&::backdrop]:bg-zinc-950/50"
      onClose={() => {
        onClose();
      }}
    >
      <div className="flex max-h-[min(90vh,40rem)] flex-col">
        <header className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-base font-semibold tracking-tight">
            {mode === "create" ? "Task anlegen" : "Task bearbeiten"}
          </h2>
        </header>
        <form
          id={formId}
          key={mode === "create" ? "new" : task?.id ?? "edit"}
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
        >
          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          ) : null}

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Titel <span className="text-red-600">*</span>
            </span>
            <input
              name="title"
              type="text"
              required
              autoComplete="off"
              defaultValue={task?.title ?? ""}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Beschreibung</span>
            <textarea
              name="description"
              rows={3}
              defaultValue={task?.description ?? ""}
              className="resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Bereich <span className="text-red-600">*</span>
            </span>
            <select
              name="area_id"
              required
              defaultValue={task?.area_id ?? areas[0]?.id ?? ""}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            >
              {areas.length === 0 ? (
                <option value="">Keine Bereiche</option>
              ) : (
                areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))
              )}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Status</span>
              <select
                name="status"
                defaultValue={task?.status ?? "open"}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Priorität</span>
              <select
                name="priority"
                defaultValue={task?.priority ?? "medium"}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Tags</span>
            <input
              name="tags"
              type="text"
              placeholder="z. B. steuer, dringend"
              defaultValue={task?.tags.join(", ") ?? ""}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <span className="text-xs text-zinc-500">Kommagetrennt</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Fälligkeit</span>
              <input
                name="due_date"
                type="date"
                defaultValue={task?.due_date ?? ""}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Geplanter Tag</span>
              <input
                name="planned_date"
                type="date"
                defaultValue={task?.planned_date ?? ""}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Geschätzte Dauer (Minuten)
            </span>
            <input
              name="estimated_minutes"
              type="number"
              min={0}
              step={1}
              placeholder="optional"
              defaultValue={task?.estimated_minutes ?? ""}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
        </form>
        <footer className="flex justify-end gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <button
            type="button"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-900"
            onClick={onClose}
            disabled={pending}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            form={formId}
            disabled={pending || areas.length === 0}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {pending ? "Speichern…" : "Speichern"}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
