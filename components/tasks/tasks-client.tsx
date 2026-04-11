"use client";

import { useMemo, useState } from "react";
import type { RecommendationFeedbackInput } from "@/app/(app)/tasks/actions";
import type { RecommendationBreakdown } from "@/lib/tasks/recommended";
import type { AreaRow, TaskWithRelations } from "@/lib/tasks/types";
import {
  PRIORITY_ORDER,
  STATUS_ORDER,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "@/lib/tasks/types";
import { RecommendedTaskBlock } from "./recommended-task-block";
import { TaskFormDialog } from "./task-form-dialog";

type SortMode = "due_asc" | "due_desc" | "priority" | "status";

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

function dueSortKey(iso: string | null, nullLast: boolean): number {
  if (!iso) return nullLast ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  return new Date(`${iso}T00:00:00Z`).getTime();
}

function statusLabel(s: string): string {
  return TASK_STATUSES.find((x) => x.value === s)?.label ?? s;
}

function priorityLabel(p: string): string {
  return TASK_PRIORITIES.find((x) => x.value === p)?.label ?? p;
}

type Props = {
  tasks: TaskWithRelations[];
  areas: AreaRow[];
  recommended: { task: TaskWithRelations; breakdown: RecommendationBreakdown } | null;
  recommendedError: string | null;
};

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

export function TasksClient({ tasks, areas, recommended, recommendedError }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [areaFilter, setAreaFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [sortMode, setSortMode] = useState<SortMode>("due_asc");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);
  const [editRecommendationFeedback, setEditRecommendationFeedback] =
    useState<RecommendationFeedbackInput | null>(null);

  const filteredSorted = useMemo(() => {
    let list = tasks.slice();
    if (statusFilter) list = list.filter((t) => t.status === statusFilter);
    if (areaFilter) list = list.filter((t) => t.area_id === areaFilter);
    if (priorityFilter) list = list.filter((t) => t.priority === priorityFilter);

    list.sort((a, b) => {
      if (sortMode === "due_asc") {
        const ka = dueSortKey(a.due_date, true);
        const kb = dueSortKey(b.due_date, true);
        if (ka !== kb) return ka - kb;
      }
      if (sortMode === "due_desc") {
        const ka = dueSortKey(a.due_date, false);
        const kb = dueSortKey(b.due_date, false);
        if (ka !== kb) return kb - ka;
      }
      if (sortMode === "priority") {
        const pa = PRIORITY_ORDER[a.priority];
        const pb = PRIORITY_ORDER[b.priority];
        if (pa !== pb) return pa - pb;
      }
      if (sortMode === "status") {
        const sa = STATUS_ORDER[a.status];
        const sb = STATUS_ORDER[b.status];
        if (sa !== sb) return sa - sb;
      }
      return a.title.localeCompare(b.title, "de");
    });
    return list;
  }, [tasks, statusFilter, areaFilter, priorityFilter, sortMode]);

  function openCreate() {
    setDialogMode("create");
    setEditingTask(null);
    setEditRecommendationFeedback(null);
    setDialogOpen(true);
  }

  function openEdit(t: TaskWithRelations) {
    setDialogMode("edit");
    setEditingTask(t);
    if (recommended && t.id === recommended.task.id) {
      setEditRecommendationFeedback(acceptedFeedback(t.id, recommended.breakdown));
    } else {
      setEditRecommendationFeedback(null);
    }
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingTask(null);
    setEditRecommendationFeedback(null);
  }

  return (
    <div className="space-y-6">
      <RecommendedTaskBlock
        task={recommended?.task ?? null}
        breakdown={recommended?.breakdown ?? null}
        areas={areas}
        recommendationError={recommendedError}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={openCreate}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            disabled={areas.length === 0}
          >
            Task anlegen
          </button>
          {areas.length === 0 ? (
            <p className="max-w-xs text-right text-xs text-amber-700 dark:text-amber-300">
              Es sind keine Bereiche geladen. Ohne Bereich kann kein Task angelegt werden.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-600 dark:text-zinc-400">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-w-[10rem] rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">Alle</option>
            {TASK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-600 dark:text-zinc-400">Bereich</span>
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="min-w-[12rem] rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">Alle</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-600 dark:text-zinc-400">Priorität</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="min-w-[10rem] rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">Alle</option>
            {TASK_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-600 dark:text-zinc-400">Sortierung</span>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="min-w-[14rem] rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="due_asc">Fälligkeit (früheste zuerst)</option>
            <option value="due_desc">Fälligkeit (späteste zuerst)</option>
            <option value="priority">Priorität (hoch → niedrig)</option>
            <option value="status">Status</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <th className="px-3 py-2 font-medium">Titel</th>
              <th className="px-3 py-2 font-medium">Bereich</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Priorität</th>
              <th className="px-3 py-2 font-medium">Fälligkeit</th>
              <th className="px-3 py-2 font-medium">Tags</th>
            </tr>
          </thead>
          <tbody>
            {filteredSorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                  Keine Tasks für die aktuellen Filter.
                </td>
              </tr>
            ) : (
              filteredSorted.map((t) => (
                <tr
                  key={t.id}
                  className="cursor-pointer border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800/80 dark:hover:bg-zinc-900/40"
                  onClick={() => openEdit(t)}
                >
                  <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                    {t.title}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{t.area_name}</td>
                  <td className="px-3 py-2">{statusLabel(t.status)}</td>
                  <td className="px-3 py-2">{priorityLabel(t.priority)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatDate(t.due_date)}</td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {t.tags.length ? t.tags.join(", ") : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TaskFormDialog
        open={dialogOpen}
        mode={dialogMode}
        task={editingTask}
        areas={areas}
        onClose={closeDialog}
        recommendationFeedback={
          dialogMode === "edit" ? editRecommendationFeedback : null
        }
      />
    </div>
  );
}
