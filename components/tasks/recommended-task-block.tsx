"use client";

import { updateTaskStatus, type RecommendationFeedbackInput } from "@/app/(app)/tasks/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Card } from "@/components/ui/card";
import type { TaskTypeRow } from "@/lib/task-types/defaults";
import type { RecommendationBreakdown } from "@/lib/tasks/recommended";
import { todayYmdInRecommendationTz } from "@/lib/tasks/recommended";
import { formatTaskMetaLine } from "@/lib/tasks/task-meta-line";
import type { AreaRow, TaskWithRelations } from "@/lib/tasks/types";
import { ListTodo } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { TaskCompleteToggle } from "./task-complete-toggle";
import { TaskFormDialog } from "./task-form-dialog";
import { cn } from "@/lib/cn";

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
  const [optimisticDone, setOptimisticDone] = useState<boolean | null>(null);

  const feedbackAccepted = task && breakdown ? acceptedFeedback(task.id, breakdown) : null;

  useEffect(() => {
    setOptimisticDone(null);
  }, [task?.id, task?.completed_at]);

  const displayDone =
    optimisticDone !== null ? optimisticDone : Boolean(task?.completed_at);

  const recommendedMeta = useMemo(() => {
    if (!task) return null;
    const tl = taskTypes?.find((x) => x.key === task.task_type)?.label ?? "—";
    return formatTaskMetaLine(task, tl, todayYmd);
  }, [task, taskTypes, todayYmd]);

  function openTask() {
    if (!task || pending) return;
    if (onOpenTaskInPanel) onOpenTaskInPanel(task);
    else setDialogOpen(true);
  }

  async function handleCompleteToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!task || !feedbackAccepted || pending) return;
    const next = !displayDone;
    setOptimisticDone(next);
    setActionError(null);
    setPending(true);
    try {
      const res = await updateTaskStatus(
        task.id,
        next ? "done" : "open",
        next ? feedbackAccepted : undefined,
      );
      if (!res.ok) {
        setActionError(res.error);
        setOptimisticDone(null);
      } else {
        void Promise.resolve(router.refresh()).catch(() => {});
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-2.5" aria-labelledby="recommended-task-heading">
      <h2
        id="recommended-task-heading"
        className="text-xs font-semibold uppercase tracking-wide text-leif-muted"
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

      {task && breakdown ? (
        <div className="group -mx-2 rounded-xl px-2 py-0.5 transition-[background-color] duration-200 hover:bg-leif-primary-soft/50 lg:-mx-4 lg:px-4">
          <Card
            className={cn(
              "rounded-xl border border-leif-primary/20 bg-leif-primary/[0.04] px-3.5 py-3.5 shadow-sm transition-[border-color,box-shadow] duration-200",
              "group-hover:border-leif-primary/30 group-hover:shadow-md",
              displayDone && "opacity-[0.78]",
            )}
          >
          <div className="flex gap-3">
            <TaskCompleteToggle
              done={displayDone}
              disabled={pending}
              onClick={handleCompleteToggle}
              size="md"
            />
            <button
              type="button"
              disabled={pending}
              onClick={openTask}
              aria-label={`${task.title} öffnen`}
              className={cn(
                "min-w-0 flex-1 rounded-lg px-1 py-0.5 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leif-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                pending && "pointer-events-none opacity-60",
              )}
            >
              <h3
                className={cn(
                  "line-clamp-3 text-[15px] font-semibold leading-snug text-leif-text",
                  displayDone && "text-leif-muted line-through decoration-leif-muted/80",
                )}
              >
                {task.title}
              </h3>
              {recommendedMeta ? (
                <p className="mt-1.5 text-[13px] leading-snug text-leif-muted">{recommendedMeta}</p>
              ) : null}
            </button>
          </div>
          </Card>
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
