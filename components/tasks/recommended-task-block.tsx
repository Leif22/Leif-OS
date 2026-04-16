"use client";

import {
  logRecommendationFeedback,
  type RecommendationFeedbackInput,
} from "@/app/(app)/tasks/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import type { TaskTypeRow } from "@/lib/task-types/defaults";
import {
  breakdownForRecommendationLog,
  type RecommendationBreakdown,
} from "@/lib/tasks/recommended";
import { todayYmdInRecommendationTz } from "@/lib/tasks/recommended";
import { formatRecommendedTaskTriple } from "@/lib/tasks/task-meta-line";
import type { AreaRow, TaskWithRelations } from "@/lib/tasks/types";
import { ListTodo } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { TaskFormDialog } from "./task-form-dialog";
import { cn } from "@/lib/cn";

function acceptedFeedback(
  taskId: string,
  b: RecommendationBreakdown,
): RecommendationFeedbackInput {
  return {
    recommended_task_id: taskId,
    ...breakdownForRecommendationLog(b),
    action: "accepted",
  };
}

function skippedFeedback(taskId: string, b: RecommendationBreakdown): RecommendationFeedbackInput {
  return {
    recommended_task_id: taskId,
    ...breakdownForRecommendationLog(b),
    action: "skipped",
  };
}

type Props = {
  task: TaskWithRelations | null;
  breakdown: RecommendationBreakdown | null;
  areas: AreaRow[];
  taskTypes?: TaskTypeRow[];
  projects?: { id: string; name: string }[];
  recommendationError?: string | null;
  heading?: string;
  /** Wenn gesetzt: Klick öffnet das Seitenpanel statt Dialog (Task-Seite). */
  onOpenTaskInPanel?: (task: TaskWithRelations) => void;
};

export function RecommendedTaskBlock({
  task,
  breakdown,
  areas,
  taskTypes,
  projects = [],
  recommendationError,
  heading = "Empfohlene Aufgabe",
  onOpenTaskInPanel,
}: Props) {
  const router = useRouter();
  const todayYmd = useMemo(() => todayYmdInRecommendationTz(), []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const feedbackAccepted = task && breakdown ? acceptedFeedback(task.id, breakdown) : null;

  const recommendedTriple = useMemo(() => {
    if (!task) return null;
    const tl = taskTypes?.find((x) => x.key === task.task_type)?.label;
    return formatRecommendedTaskTriple(task, tl, todayYmd);
  }, [task, taskTypes, todayYmd]);

  function openTask() {
    if (!task || pending) return;
    if (onOpenTaskInPanel) onOpenTaskInPanel(task);
    else setDialogOpen(true);
  }

  const hasRecommendationReasons = Boolean(breakdown?.reasons.length);

  async function handleSkip(e: React.MouseEvent) {
    e.stopPropagation();
    if (!task || !breakdown || pending) return;
    setPending(true);
    setActionError(null);
    try {
      const res = await logRecommendationFeedback(skippedFeedback(task.id, breakdown));
      if (!res.ok) setActionError(res.error ?? "Konnte Vorschlag nicht überspringen.");
      else void Promise.resolve(router.refresh()).catch(() => {});
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className="mb-8 space-y-2.5 lg:mb-10"
      aria-labelledby="recommended-task-heading"
    >
      <h2
        id="recommended-task-heading"
        className="text-[13px] font-bold uppercase tracking-wide text-leif-text"
      >
        {heading}
      </h2>

      {recommendationError ? (
        <AlertBanner variant="error">Empfehlung konnte nicht geladen werden: {recommendationError}</AlertBanner>
      ) : null}

      {actionError ? <AlertBanner variant="error">{actionError}</AlertBanner> : null}

      {!recommendationError && !task ? (
        <div className="flex items-start gap-2 rounded-lg border border-dashed border-leif-border/90 bg-white px-3 py-2">
          <ListTodo className="mt-0.5 size-4 shrink-0 text-leif-muted" aria-hidden />
          <p className="text-[12px] leading-snug text-leif-secondary">
            Keine empfohlene Aufgabe — nichts zu empfehlen oder keine passenden offenen Tasks.
          </p>
        </div>
      ) : null}

      {task && breakdown && recommendedTriple ? (
        <div
          role="button"
          tabIndex={0}
          onClick={openTask}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openTask();
            }
          }}
          aria-label={`${task.title} öffnen`}
          className={cn(
            "rounded-2xl border border-[#F2C94C] bg-[#FFF9E6] px-4 py-4",
            "shadow-[0_4px_14px_rgba(15,23,42,0.08)] transition-[background-color,box-shadow,transform,opacity] duration-200",
            "hover:bg-[#FFF3D6] hover:shadow-[0_8px_22px_rgba(15,23,42,0.12)]",
            "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2C94C]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF9E6]",
            pending && "opacity-70",
          )}
        >
          <div className="flex min-w-0 flex-col gap-2.5">
            <div className="flex min-w-0 items-center gap-1.5 rounded-lg py-0.5 text-left">
              <span className="shrink-0 text-[16px] leading-none text-amber-600/90" aria-hidden>
                ⭐
              </span>
              <h3 className="min-w-0 text-[17px] font-semibold leading-snug text-leif-text">{task.title}</h3>
            </div>

            <p className="text-[13px] font-medium leading-snug text-leif-secondary">{recommendedTriple}</p>

            {hasRecommendationReasons ? (
              <p className="rounded-lg bg-amber-100/55 px-2.5 py-1.5 text-[12px] leading-snug text-leif-text">
                <span className="font-semibold text-leif-secondary">Warum jetzt:</span>{" "}
                {breakdown.reasons.join(" · ")}
              </p>
            ) : null}

            <div
              className="flex items-center justify-end gap-2 pt-0.5"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                disabled={pending}
                onClick={handleSkip}
                className="shrink-0 text-right text-[11px] font-medium text-leif-muted underline decoration-leif-border/80 underline-offset-2 transition-colors hover:text-leif-secondary hover:decoration-leif-secondary/60"
              >
                Nicht dieser Task
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {task && feedbackAccepted && !onOpenTaskInPanel ? (
        <TaskFormDialog
          open={dialogOpen}
          mode="edit"
          task={task}
          areas={areas}
          taskTypes={taskTypes}
          projects={projects}
          onClose={() => setDialogOpen(false)}
          recommendationFeedback={feedbackAccepted}
        />
      ) : null}
    </section>
  );
}
