"use client";

import {
  PRIORITY_ORDER,
  STATUS_ORDER,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "@/lib/tasks/types";
import type { RecommendationFeedbackInput } from "@/app/(app)/tasks/actions";
import { PRODUCT_COPY, PRODUCT_LABEL } from "@/lib/product-labels";
import type { SparringTaskDraft } from "@/lib/sparring/task-draft";
import type { TaskTypeRow } from "@/lib/task-types/defaults";
import type { RecommendationBreakdown } from "@/lib/tasks/recommended";
import type { AreaRow, TaskWithRelations } from "@/lib/tasks/types";
import { taskPriorityChipTone, taskStatusChipTone } from "@/lib/tasks/chip-tones";
import { RecommendedTaskBlock } from "./recommended-task-block";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskInlineEditor } from "./task-inline-editor";
import { Fragment, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterField } from "@/components/ui/filter-bar";
import { TableShell } from "@/components/ui/table-shell";
import { StatusChip } from "@/components/ui/status-chip";
import { controlClass } from "@/components/ui/control-styles";

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
  taskTypes: TaskTypeRow[];
  documents: { id: string; title: string }[];
  recommended: { task: TaskWithRelations; breakdown: RecommendationBreakdown } | null;
  recommendedError: string | null;
  /** Serverseitig aus `?from_sparring=` gebaut; nach URL-Clear im Client weiter genutzt */
  sparringTaskDraft: SparringTaskDraft | null;
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

export function TasksClient({
  tasks,
  areas,
  taskTypes,
  documents,
  recommended,
  recommendedError,
  sparringTaskDraft,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [sortMode, setSortMode] = useState<SortMode>("due_asc");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [editRecommendationFeedback, setEditRecommendationFeedback] =
    useState<RecommendationFeedbackInput | null>(null);
  const [sparPersist, setSparPersist] = useState<SparringTaskDraft | null>(null);
  const [createAreaPrefill, setCreateAreaPrefill] = useState<string | null>(null);

  // Sync dialog state from URL query once after navigation (Next.js clears query in same tick).
  /* eslint-disable react-hooks/set-state-in-effect -- intentional URL→dialog hydration */
  useEffect(() => {
    const wantNew = searchParams.get("new") === "1";
    const fromSparring = searchParams.get("from_sparring");
    const fromSparringMessage = searchParams.get("from_sparring_message");
    const taskId = searchParams.get("task");
    const areaId = searchParams.get("area");
    if (!wantNew && !taskId && !areaId && !fromSparring && !fromSparringMessage) return;

    if (wantNew && (fromSparring || fromSparringMessage)) {
      setCreateAreaPrefill(null);
      setDialogMode("create");
      setEditingTask(null);
      setEditRecommendationFeedback(null);
      setSparPersist(sparringTaskDraft);
      setDialogOpen(true);
    } else if (wantNew) {
      const a = searchParams.get("area");
      setCreateAreaPrefill(a && areas.some((ar) => ar.id === a) ? a : null);
      setSparPersist(null);
      setDialogMode("create");
      setEditingTask(null);
      setEditRecommendationFeedback(null);
      setDialogOpen(true);
    }

    if (taskId) {
      const t = tasks.find((x) => x.id === taskId);
      if (t) {
        setDialogMode("edit");
        setEditingTask(t);
        setExpandedTaskId(t.id);
        if (recommended && t.id === recommended.task.id) {
          setEditRecommendationFeedback(acceptedFeedback(t.id, recommended.breakdown));
        } else {
          setEditRecommendationFeedback(null);
        }
        setDialogOpen(false);
      }
    }

    if (areaId) void areaId;

    router.replace(pathname, { scroll: false });
  }, [searchParams, tasks, areas, recommended, pathname, router, sparringTaskDraft]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filteredSorted = useMemo(() => {
    let list = tasks.slice();
    if (statusFilter) list = list.filter((t) => t.status === statusFilter);
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
  }, [tasks, statusFilter, priorityFilter, sortMode]);

  function openCreate() {
    setCreateAreaPrefill(null);
    setSparPersist(null);
    setDialogMode("create");
    setEditingTask(null);
    setEditRecommendationFeedback(null);
    setDialogOpen(true);
  }

  function toggleInlineEdit(t: TaskWithRelations) {
    setExpandedTaskId((current) => (current === t.id ? null : t.id));
    setEditingTask(t);
  }

  function closeDialog() {
    setDialogOpen(false);
    setCreateAreaPrefill(null);
    setEditingTask(null);
    setEditRecommendationFeedback(null);
    setSparPersist(null);
  }

  const selectClass = `${controlClass} min-w-0`;

  return (
    <div className="space-y-8">
      <PageHeader
        title={PRODUCT_LABEL.tasks}
        description="Priorisierte Liste mit klaren Status- und Prioritätskennzeichnungen."
        actions={
          <Button type="button" onClick={openCreate}>
            {PRODUCT_COPY.plusMenuTask}
          </Button>
        }
      />

      <RecommendedTaskBlock
        task={recommended?.task ?? null}
        breakdown={recommended?.breakdown ?? null}
        areas={areas}
        taskTypes={taskTypes}
        recommendationError={recommendedError}
      />

      <FilterBar>
        <FilterField label="Status">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${selectClass} min-w-[10rem]`}
          >
            <option value="">Alle</option>
            {TASK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Priorität">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className={`${selectClass} min-w-[10rem]`}
          >
            <option value="">Alle</option>
            {TASK_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Sortierung">
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className={`${selectClass} min-w-[14rem]`}
          >
            <option value="due_asc">Fälligkeit (früheste zuerst)</option>
            <option value="due_desc">Fälligkeit (späteste zuerst)</option>
            <option value="priority">Priorität (hoch → niedrig)</option>
            <option value="status">Status</option>
          </select>
        </FilterField>
      </FilterBar>

      <TableShell>
        <table className="w-full min-w-[56rem] border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b border-leif-divider bg-white">
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Titel</th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">
                Art
              </th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Status</th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Priorität</th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Geplant</th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Dauer</th>
            </tr>
          </thead>
          <tbody>
            {filteredSorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-[13px] text-leif-secondary">
                  Keine Tasks für die aktuellen Filter.
                </td>
              </tr>
            ) : (
              filteredSorted.map((t) => (
                <Fragment key={t.id}>
                  <tr className="cursor-pointer transition-colors duration-150" onClick={() => toggleInlineEdit(t)}>
                    <td className="px-4 py-3 align-middle text-[15px] font-semibold text-leif-text">{t.title}</td>
                    <td className="px-4 py-3 align-middle">
                      <StatusChip tone="neutral">
                        {taskTypes.find((x) => x.key === t.task_type)?.label ?? "—"}
                      </StatusChip>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <StatusChip tone={taskStatusChipTone(t.status)}>{statusLabel(t.status)}</StatusChip>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <StatusChip tone={taskPriorityChipTone(t.priority)}>{priorityLabel(t.priority)}</StatusChip>
                    </td>
                    <td className="px-4 py-3 align-middle tabular-nums text-leif-secondary">
                      {formatDate(t.planned_date)}
                    </td>
                    <td className="px-4 py-3 align-middle text-leif-secondary">
                      {t.estimated_minutes ? `${t.estimated_minutes} min` : "—"}
                    </td>
                  </tr>
                  {expandedTaskId === t.id ? (
                    <tr>
                      <td colSpan={6} className="bg-[#fbfcfe] px-4 py-3">
                        <TaskInlineEditor
                          task={editingTask && editingTask.id === t.id ? editingTask : t}
                          taskTypes={taskTypes}
                          documents={documents}
                          onRequestClose={() => setExpandedTaskId(null)}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </TableShell>

      <TaskFormDialog
        open={dialogOpen}
        mode={dialogMode}
        task={dialogMode === "edit" ? editingTask : null}
        areas={areas}
        taskTypes={taskTypes}
        documents={documents}
        onClose={closeDialog}
        recommendationFeedback={dialogMode === "edit" ? editRecommendationFeedback : null}
        sparringCreateContext={dialogMode === "create" ? sparPersist : null}
        initialCreateAreaId={dialogMode === "create" ? createAreaPrefill : null}
      />
    </div>
  );
}
