"use client";

import {
  logRecommendationFeedback,
  updateTaskStatus,
  type RecommendationFeedbackInput,
} from "@/app/(app)/tasks/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/ui/page-header";
import { StatusChip } from "@/components/ui/status-chip";
import { taskPriorityChipTone, taskStatusChipTone } from "@/lib/tasks/chip-tones";
import type { TaskTypeRow } from "@/lib/task-types/defaults";
import type { RecommendationBreakdown } from "@/lib/tasks/recommended";
import type { AreaRow, TaskWithRelations } from "@/lib/tasks/types";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/tasks/types";
import { ListTodo } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  taskTypes?: TaskTypeRow[];
  projects?: { id: string; name: string }[];
  recommendationError?: string | null;
  heading?: string;
};

export function RecommendedTaskBlock({
  task,
  breakdown,
  areas,
  taskTypes,
  projects = [],
  recommendationError,
  heading = "Empfohlene Aufgabe",
}: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const feedbackAccepted = task && breakdown ? acceptedFeedback(task.id, breakdown) : null;

  async function runStatus(newStatus: "done" | "open") {
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
    <section className="space-y-4" aria-labelledby="recommended-task-heading">
      <SectionTitle id="recommended-task-heading">{heading}</SectionTitle>

      {recommendationError ? (
        <AlertBanner variant="error">Empfehlung konnte nicht geladen werden: {recommendationError}</AlertBanner>
      ) : null}

      {actionError ? <AlertBanner variant="error">{actionError}</AlertBanner> : null}

      {!recommendationError && !task ? (
        <EmptyState
          illustration={<ListTodo />}
          title="Keine empfohlene Aufgabe"
          description='Keine offenen Tasks – oder es gibt aktuell nichts zu empfehlen. Lege Tasks an oder setze den Status auf "Offen".'
        />
      ) : null}

      {task && breakdown ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <h3 className="text-[16px] font-semibold leading-snug tracking-tight text-leif-text">{task.title}</h3>
              <div className="flex flex-wrap gap-2">
                <StatusChip tone={taskPriorityChipTone(task.priority)}>{priorityLabel(task.priority)}</StatusChip>
                <StatusChip tone={taskStatusChipTone(task.status)}>{statusLabel(task.status)}</StatusChip>
              </div>
              <div className="space-y-1 text-[13px] text-leif-secondary">
                <p>
                  Geplant: <span className="tabular-nums text-leif-text">{formatDate(task.planned_date)}</span>
                </p>
              </div>
            </div>
            <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => setDialogOpen(true)}>
              Bearbeiten
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 border-t border-leif-divider pt-5">
            {task.status !== "erledigt" ? (
              <>
                <Button type="button" variant="primary" size="sm" disabled={pending} onClick={() => runStatus("done")}>
                  Erledigt
                </Button>
                <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => runStatus("open")}>
                  Wieder offen
                </Button>
              </>
            ) : null}
            <div className="flex basis-full justify-end pt-1">
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => runSkip()}>
                Nicht dieser Task
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {task && feedbackAccepted ? (
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
