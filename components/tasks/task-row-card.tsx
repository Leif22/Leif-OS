"use client";

import { TaskCompleteToggle } from "@/components/tasks/task-complete-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getTaskCardVisualState,
  taskCardSurfaceClass,
} from "@/lib/tasks/task-card-visual";
import { addBerlinCalendarDays } from "@/lib/calendar/berlin-ymd";
import { formatTaskMetaLine } from "@/lib/tasks/task-meta-line";
import type { TaskWithRelations } from "@/lib/tasks/types";
import { cn } from "@/lib/cn";
import { useEffect, useState } from "react";

type Props = {
  task: TaskWithRelations;
  typeLabel: string;
  todayYmd: string;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  /** true = als erledigt speichern, false = wieder öffnen */
  onToggleComplete: (willBeDone: boolean) => Promise<boolean>;
  onQuickToday: () => void;
  onQuickTomorrow: () => void;
};

export function TaskRowCard({
  task,
  typeLabel,
  todayYmd,
  selected,
  busy,
  onSelect,
  onToggleComplete,
  onQuickTomorrow,
}: Props) {
  const [optimisticDone, setOptimisticDone] = useState<boolean | null>(null);

  useEffect(() => {
    setOptimisticDone(null);
  }, [task.id, task.completed_at]);

  const isDone = optimisticDone !== null ? optimisticDone : task.completed_at != null;
  const visual = getTaskCardVisualState(task, todayYmd, isDone);
  const metaLine = formatTaskMetaLine(task, typeLabel, todayYmd);

  const refYmd = task.planned_date ?? task.due_date ?? null;
  const tomorrowYmd = addBerlinCalendarDays(todayYmd, 1);
  const refIsToday = refYmd === todayYmd;
  const refIsTomorrow = refYmd === tomorrowYmd;
  const showHeuteButton = !refIsToday;
  const showMorgenButton = !refIsTomorrow;

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy) return;
    const next = !isDone;
    setOptimisticDone(next);
    const ok = await onToggleComplete(next);
    if (!ok) setOptimisticDone(null);
  }

  return (
    <div
      className={cn(
        "group relative -mx-2 rounded-xl px-2 py-0.5 transition-[background-color] duration-200",
        "lg:-mx-4 lg:px-4",
        "hover:bg-leif-primary-soft/50",
      )}
    >
      <Card
        className={cn(
          "border px-2.5 py-2 transition-[box-shadow,background-color,border-color,opacity,transform] duration-300 ease-out",
          "hover:border-leif-border",
          taskCardSurfaceClass(visual),
          selected
            ? "border-leif-primary/25 bg-leif-primary-soft/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
            : "",
          isDone && "translate-y-[3px] opacity-60 saturate-[0.92]",
        )}
      >
        <div className="flex gap-3.5">
          <TaskCompleteToggle done={isDone} disabled={busy} onClick={handleToggle} size="sm" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
              <button
                type="button"
                onClick={onSelect}
                className="min-w-0 flex-1 text-left"
              >
                <span
                  className={cn(
                    "flex min-w-0 items-center gap-1 truncate whitespace-nowrap text-[14px] font-medium leading-snug text-leif-text",
                    isDone && "text-leif-muted line-through decoration-leif-muted/75",
                  )}
                >
                  <span className="truncate">{task.title}</span>
                  {task.priority === "high" ? (
                    <span className="shrink-0 text-[12px] leading-none text-amber-600/90" aria-label="Favorit">
                      ★
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "mt-1 block max-w-full text-sm text-leif-muted",
                    isDone && "text-leif-muted/90",
                  )}
                >
                  {metaLine}
                </span>
              </button>

              {!isDone && (showHeuteButton || showMorgenButton) ? (
                <div
                  className={cn(
                    "flex shrink-0 justify-end gap-1 transition-opacity duration-200 sm:pt-0.5",
                    "pointer-events-auto opacity-100 sm:pointer-events-none sm:opacity-0",
                    "sm:group-hover:pointer-events-auto sm:group-hover:opacity-100",
                    selected && "sm:pointer-events-auto sm:opacity-100",
                  )}
                >
                  {showHeuteButton ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-6 rounded-full border border-leif-border/90 bg-white px-2 py-0 text-[10px] font-medium leading-none text-leif-secondary shadow-none hover:bg-leif-surface-soft"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickToday();
                      }}
                    >
                      Heute
                    </Button>
                  ) : null}
                  {showMorgenButton ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-6 rounded-full border border-leif-border/90 bg-white px-2 py-0 text-[10px] font-medium leading-none text-leif-secondary shadow-none hover:bg-leif-surface-soft"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickTomorrow();
                      }}
                    >
                      Morgen
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
