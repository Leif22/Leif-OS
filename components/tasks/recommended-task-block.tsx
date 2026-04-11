"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  logRecommendationFeedback,
  updateTaskStatus,
  type RecommendationFeedbackInput,
} from "@/app/(app)/tasks/actions";
import type { RecommendationBreakdown } from "@/lib/tasks/recommended";
import type { AreaRow, TaskStatus, TaskWithRelations } from "@/lib/tasks/types";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/tasks/types";
import { TaskFormDialog } from "./task-form-dialog";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("de-DE", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function statusLabel(s: string): string {
  return TASK_STATUSES.find((x) => x.value === s)?.label ?? s;
}

function priorityLabel(p: string): string {
  return TASK_PRIORITIES.find((x) => x.value === p)?.label ?? p;
}

function acceptedFeedback(
  taskId: string,
  b: RecommendationBreakdown,
): RecommendationFeedbackInput {
  return {
    recommended_task_id: taskId,
    score: b.score,
    score_priority: b.score_priority,
    score_due: b.score_due,
    score_today: b.score_today,
    score_age: b.score_age,
    action: "accepted",
  };
}

type Props = {
  task: TaskWithRelations | null;
  breakdown: RecommendationBreakdown | null;
  areas: AreaRow[];
  recommendationError?: string | null;
  heading?: string;
};

export function RecommendedTaskBlock({
  task,
  breakdown,
  areas,
  recommendationError,
  heading = "Empfohlene nächste Aufgabe",
}: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const feedbackAccepted =
    task && breakdown ? acceptedFeedback(task.id, breakdown) : null;

  async function runStatus(newStatus: TaskStatus) {
    if (!task || !feedbackAccepted) return;
    setActionError(null);
    setPending(true);
    try {
      const res = await updateTaskStatus(task.id, newStatus, feedbackAccepted);
      if (!res.ok) setActionError(res.error);
      else router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function runSkip() {
    if (!task || !breakdown) return;
    setActionError(null);
    setPending(true);
    try {
      const res = await logRecommendationFeedback({
        recommended_task_id: task.id,
        score: breakdown.score,
        score_priority: breakdown.score_priority,
        score_due: breakdown.score_due,
        score_today: breakdown.score_today,
        score_age: breakdown.score_age,
        action: "skipped",
      });
      if (!res.ok) setActionError(res.error);
      else router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-3" aria-labelledby="recommended-task-heading">
      <h2 id="recommended-task-heading" className="text-lg font-semibold tracking-tight">
        {heading}
      </h2>

      {recommendationError ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          Empfehlung konnte nicht geladen werden: {recommendationError}
        </p>
      ) : null}

      {actionError ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {actionError}
        </p>
      ) : null}

      {!recommendationError && !task ? (
        <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
          Keine offenen oder geplanten Tasks – oder es gibt nichts zu empfehlen. Lege Tasks an oder
          setze den Status auf „Offen“ oder „Geplant“.
        </p>
      ) : null}

      {task && breakdown ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{task.title}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {task.area_name}
                <span className="mx-2 text-zinc-300 dark:text-zinc-600">·</span>
                {priorityLabel(task.priority)}
                <span className="mx-2 text-zinc-300 dark:text-zinc-600">·</span>
                {statusLabel(task.status)}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Fällig: <span className="tabular-nums">{formatDate(task.due_date)}</span>
                {task.tags.length > 0 ? (
                  <>
                    <span className="mx-2 text-zinc-300 dark:text-zinc-600">·</span>
                    {task.tags.join(", ")}
                  </>
                ) : null}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setDialogOpen(true)}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-900"
              >
                Bearbeiten
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            {task.status === "open" ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => runStatus("done")}
                  className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  Erledigt
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => runStatus("planned")}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-900"
                >
                  Geplant
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => runStatus("canceled")}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Abbrechen
                </button>
              </>
            ) : null}
            {task.status === "planned" ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => runStatus("done")}
                  className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  Erledigt
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => runStatus("canceled")}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Abbrechen
                </button>
              </>
            ) : null}
            <div className="flex basis-full justify-end pt-1">
              <button
                type="button"
                disabled={pending}
                onClick={() => runSkip()}
                className="rounded-md px-3 py-1.5 text-sm text-zinc-500 underline-offset-2 hover:underline disabled:opacity-50 dark:text-zinc-400"
              >
                Nicht dieser Task
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {task && feedbackAccepted ? (
        <TaskFormDialog
          open={dialogOpen}
          mode="edit"
          task={task}
          areas={areas}
          onClose={() => setDialogOpen(false)}
          recommendationFeedback={feedbackAccepted}
        />
      ) : null}
    </section>
  );
}
