"use client";

import type { RecommendationFeedbackInput } from "@/app/(app)/tasks/actions";
import {
  quickTaskMarkDone,
  quickTaskMoveToToday,
  quickTaskMoveToTomorrow,
  updateTaskStatus,
} from "@/app/(app)/tasks/actions";
import { PRODUCT_COPY, PRODUCT_LABEL } from "@/lib/product-labels";
import type { SparringTaskDraft } from "@/lib/sparring/task-draft";
import type { TaskTypeRow } from "@/lib/task-types/defaults";
import {
  breakdownForRecommendationLog,
  type RecommendationBreakdown,
} from "@/lib/tasks/recommended";
import { buildTaskTypeGroups, taskTypeGroupMetaLine } from "@/lib/tasks/group-tasks-by-type";
import {
  countTasksForFilter,
  filterTasksBySmartFilter,
  type TaskSmartFilter,
  type TaskSmartFilterContext,
  sortTasksForSmartFilter,
  TASK_SMART_FILTER_OPTIONS,
} from "@/lib/tasks/task-filters";
import { todayYmdInRecommendationTz } from "@/lib/tasks/recommended";
import { taskIsBookedInCalendar, type AreaRow, type TaskWithRelations } from "@/lib/tasks/types";
import { cn } from "@/lib/cn";
import {
  AlertTriangle,
  Calendar,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  LayoutGrid,
  Lock,
  Star,
} from "lucide-react";
import {
  applyTaskEditorValueToTask,
  type TaskEditorValue,
} from "@/components/tasks/task-editor";
import { RecommendedTaskBlock } from "./recommended-task-block";
import { TaskDetailPanel } from "./task-detail-panel";
import { TaskRowCard } from "./task-row-card";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlanerDraftTaskIds } from "@/components/tasks/use-planer-draft-task-ids";

const FILTER_ICONS: Record<TaskSmartFilter, typeof Calendar> = {
  heute: Calendar,
  morgen: CalendarClock,
  ueberfaellig: AlertTriangle,
  favoriten: Star,
  planer_entwurf: Lock,
  geplant: CalendarDays,
  erledigt: CheckCircle2,
  alle: LayoutGrid,
};

type Props = {
  tasks: TaskWithRelations[];
  areas: AreaRow[];
  taskTypes: TaskTypeRow[];
  documents: { id: string; title: string }[];
  projects: { id: string; name: string }[];
  recommended: { task: TaskWithRelations; breakdown: RecommendationBreakdown } | null;
  recommendedError: string | null;
  sparringTaskDraft: SparringTaskDraft | null;
};

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

export function TasksClient({
  tasks,
  areas,
  taskTypes,
  documents,
  projects,
  recommended,
  recommendedError,
  sparringTaskDraft,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const todayYmd = useMemo(() => todayYmdInRecommendationTz(), []);
  const planerDraftTaskIds = usePlanerDraftTaskIds();
  const filterCtx = useMemo<TaskSmartFilterContext>(
    () => ({ planerDraftTaskIds }),
    [planerDraftTaskIds],
  );

  const [filter, setFilter] = useState<TaskSmartFilter>("heute");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelCreate, setPanelCreate] = useState(false);
  const [editRecommendationFeedback, setEditRecommendationFeedback] =
    useState<RecommendationFeedbackInput | null>(null);
  const [sparPersist, setSparPersist] = useState<SparringTaskDraft | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  /** Live-Vorschau für die Liste, solange ein Task im Panel bearbeitet wird. */
  const [panelDraft, setPanelDraft] = useState<TaskEditorValue | null>(null);
  const [groupByType, setGroupByType] = useState(false);

  const refreshTypesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const scheduleRefresh = () => {
      if (refreshTypesDebounceRef.current) clearTimeout(refreshTypesDebounceRef.current);
      refreshTypesDebounceRef.current = setTimeout(() => {
        refreshTypesDebounceRef.current = null;
        void Promise.resolve(router.refresh()).catch(() => {});
      }, 400);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (refreshTypesDebounceRef.current) clearTimeout(refreshTypesDebounceRef.current);
    };
  }, [router]);

  const filteredSorted = useMemo(() => {
    const f = filterTasksBySmartFilter(tasks, filter, todayYmd, filterCtx);
    return sortTasksForSmartFilter(f, filter);
  }, [tasks, filter, todayYmd, filterCtx]);

  const listTasks = useMemo(() => {
    if (!recommended?.task) return filteredSorted;
    return filteredSorted.filter((t) => t.id !== recommended.task.id);
  }, [filteredSorted, recommended]);

  const taskGroups = useMemo(() => {
    const booked = (t: TaskWithRelations) =>
      taskIsBookedInCalendar({
        completed_at: t.completed_at,
        planned_date: t.planned_date,
        status: t.raw_status,
      });
    const gebunden = listTasks.filter(
      (t) => !t.completed_at && !booked(t) && planerDraftTaskIds.has(t.id),
    );
    const geplant = listTasks.filter((t) => !t.completed_at && booked(t));
    const ohneTermin = listTasks.filter(
      (t) => !t.completed_at && !booked(t) && !planerDraftTaskIds.has(t.id),
    );
    const erledigt = listTasks.filter((t) => t.completed_at);
    return [
      {
        key: "ohneTermin" as const,
        label: "Ohne Termin",
        items: ohneTermin,
        gap: "space-y-2" as const,
      },
      {
        key: "gebunden" as const,
        label: "Gebunden",
        items: gebunden,
        gap: "space-y-1.5" as const,
      },
      { key: "geplant" as const, label: "Geplant", items: geplant, gap: "space-y-1.5" as const },
      { key: "erledigt" as const, label: "Erledigt", items: erledigt, gap: "space-y-1.5" as const },
    ].filter((g) => g.items.length > 0);
  }, [listTasks, planerDraftTaskIds]);

  const handlePanelDraftChange = useCallback((d: TaskEditorValue) => {
    setPanelDraft(d);
  }, []);

  useEffect(() => {
    setPanelDraft(null);
  }, [selectedId, panelCreate]);

  const selectedTask = useMemo(
    () => (selectedId ? tasks.find((t) => t.id === selectedId) ?? null : null),
    [tasks, selectedId],
  );

  const detailOpen = panelCreate || selectedId != null;

  useEffect(() => {
    if (selectedId && !tasks.some((t) => t.id === selectedId)) {
      setSelectedId(null);
      setEditRecommendationFeedback(null);
    }
  }, [tasks, selectedId]);

  /* eslint-disable react-hooks/set-state-in-effect -- URL → Panel */
  useEffect(() => {
    const wantNew = searchParams.get("new") === "1";
    const fromSparring = searchParams.get("from_sparring");
    const fromSparringMessage = searchParams.get("from_sparring_message");
    const taskId = searchParams.get("task");
    if (!wantNew && !taskId && !fromSparring && !fromSparringMessage) return;

    if (wantNew && (fromSparring || fromSparringMessage)) {
      setSparPersist(sparringTaskDraft);
      setPanelCreate(true);
      setSelectedId(null);
      setEditRecommendationFeedback(null);
    } else if (wantNew) {
      setSparPersist(null);
      setPanelCreate(true);
      setSelectedId(null);
      setEditRecommendationFeedback(null);
    }

    if (taskId) {
      const t = tasks.find((x) => x.id === taskId);
      if (t) {
        setPanelCreate(false);
        setSelectedId(t.id);
        if (recommended && t.id === recommended.task.id) {
          setEditRecommendationFeedback(acceptedFeedback(t.id, recommended.breakdown));
        } else {
          setEditRecommendationFeedback(null);
        }
      }
    }

    router.replace(pathname, { scroll: false });
  }, [searchParams, tasks, recommended, pathname, router, sparringTaskDraft]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function closeDetail() {
    setPanelCreate(false);
    setSelectedId(null);
    setEditRecommendationFeedback(null);
    setSparPersist(null);
  }

  function openCreate() {
    setSparPersist(null);
    setSelectedId(null);
    setEditRecommendationFeedback(null);
    setPanelCreate(true);
  }

  function selectTask(id: string) {
    setPanelCreate(false);
    setSelectedId(id);
    if (recommended && id === recommended.task.id) {
      setEditRecommendationFeedback(acceptedFeedback(id, recommended.breakdown));
    } else {
      setEditRecommendationFeedback(null);
    }
  }

  function openRecommendedInPanel(t: TaskWithRelations) {
    selectTask(t.id);
  }

  async function runListAction(taskId: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setListError(null);
    setBusyId(taskId);
    try {
      const res = await fn();
      if (!res.ok) {
        setListError(res.error ?? "Aktion fehlgeschlagen.");
        return false;
      }
      void Promise.resolve(router.refresh()).catch(() => {});
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setListError(
        msg === "Failed to fetch" || msg.includes("Load failed")
          ? "Verbindung zum Server fehlgeschlagen."
          : msg,
      );
      return false;
    } finally {
      setBusyId(null);
    }
  }

  function typeLabel(task: TaskWithRelations): string {
    return taskTypes.find((x) => x.key === task.task_type)?.label ?? "—";
  }

  function taskForRow(t: TaskWithRelations): TaskWithRelations {
    if (panelCreate || selectedId !== t.id || !panelDraft) return t;
    return applyTaskEditorValueToTask(t, panelDraft);
  }

  async function toggleTaskComplete(task: TaskWithRelations, willBeDone: boolean): Promise<boolean> {
    if (willBeDone) {
      return runListAction(task.id, () => quickTaskMarkDone(task.id));
    }
    return runListAction(task.id, () => updateTaskStatus(task.id, "open"));
  }

  function taskRowLi(t: TaskWithRelations) {
    const row = taskForRow(t);
    return (
      <li key={t.id}>
        <TaskRowCard
          task={row}
          typeLabel={typeLabel(row)}
          todayYmd={todayYmd}
          selected={selectedId === t.id && !panelCreate}
          busy={busyId === t.id}
          onSelect={() => selectTask(t.id)}
          onToggleComplete={(willBeDone) => toggleTaskComplete(t, willBeDone)}
          onQuickToday={() => runListAction(t.id, () => quickTaskMoveToToday(t.id))}
          onQuickTomorrow={() => runListAction(t.id, () => quickTaskMoveToTomorrow(t.id))}
        />
      </li>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={PRODUCT_LABEL.tasks}
        description="Steuerzentrale: filtern, verschieben, erledigen — Fokus auf Planung."
        actions={
          <Button type="button" onClick={openCreate}>
            {PRODUCT_COPY.plusMenuTask}
          </Button>
        }
      />

      <div
        className={cn(
          "flex min-h-[min(85vh,calc(100vh-5.5rem))] flex-col gap-4",
          "lg:grid lg:grid-cols-[12rem_minmax(0,1fr)_minmax(17.5rem,24rem)] lg:gap-0 lg:divide-x lg:divide-leif-border/70",
        )}
      >
        {/* Spalte 1: Smart-Filter */}
        <nav
          className="flex shrink-0 flex-row flex-wrap gap-1.5 lg:flex-col lg:gap-2 lg:pr-3"
          aria-label="Task-Filter"
        >
          {TASK_SMART_FILTER_OPTIONS.map((opt) => {
            const count = countTasksForFilter(tasks, opt.id, todayYmd, filterCtx);
            const active = filter === opt.id;
            const Icon = FILTER_ICONS[opt.id];
            return (
              <button
                key={opt.id}
                type="button"
                title={
                  opt.id === "planer_entwurf"
                    ? "Im Planer auf einen Tag gezogen, Tag noch nicht finalisiert — noch nicht im Kalender gebucht."
                    : undefined
                }
                onClick={() => setFilter(opt.id)}
                className={cn(
                  "flex w-full min-w-[8rem] items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors",
                  active
                    ? "bg-leif-primary font-semibold text-white shadow-md shadow-leif-primary/25"
                    : "font-medium text-leif-secondary hover:bg-leif-surface-soft hover:text-leif-text",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon
                    className={cn("size-4 shrink-0", active ? "text-white" : "text-leif-muted")}
                    aria-hidden
                  />
                  <span className="truncate">{opt.label}</span>
                </span>
                <span
                  className={cn(
                    "tabular-nums text-[11px]",
                    active ? "text-white/90" : "text-leif-muted",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Spalte 2: Empfehlung + Liste */}
        <div className="min-w-0 space-y-6 lg:space-y-7 lg:px-4">
          <RecommendedTaskBlock
            task={recommended?.task ?? null}
            breakdown={recommended?.breakdown ?? null}
            areas={areas}
            taskTypes={taskTypes}
            projects={projects}
            recommendationError={recommendedError}
            onOpenTaskInPanel={openRecommendedInPanel}
          />

          {listError ? <AlertBanner variant="error">{listError}</AlertBanner> : null}

          <div>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-leif-muted">
                {TASK_SMART_FILTER_OPTIONS.find((o) => o.id === filter)?.label ?? "Tasks"}
              </p>
              <label
                htmlFor="tasks-group-by-type"
                title="Gruppiert nach Task-Art (Reihenfolge wie in den Einstellungen); Aufgaben ohne Art unter „Ohne Art“."
                className="flex cursor-pointer select-none items-center gap-2 text-[12px] font-medium text-leif-secondary"
              >
                <input
                  id="tasks-group-by-type"
                  type="checkbox"
                  checked={groupByType}
                  onChange={(e) => setGroupByType(e.target.checked)}
                  className="size-3.5 shrink-0 rounded border-leif-border text-leif-primary focus:ring-2 focus:ring-leif-primary/30"
                />
                Nach Art gruppieren
              </label>
            </div>
            {listTasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-leif-border/90 px-4 py-10 text-center text-[13px] text-leif-secondary">
                {filter === "planer_entwurf"
                  ? "Keine Tasks im Planer-Entwurf. Tasks erscheinen hier, sobald du sie im Planer auf einen Tag ziehst (ohne den Tag zu finalisieren)."
                  : "Keine Tasks für diesen Filter."}
              </div>
            ) : taskGroups.length === 1 ? (
              groupByType ? (
                <div className="space-y-5">
                  {buildTaskTypeGroups(taskGroups[0].items, taskTypes).map((tg) => (
                    <div key={tg.key}>
                      <p className="mb-0.5 text-[12px] font-semibold text-leif-text">{tg.label}</p>
                      <p className="mb-2 text-[10px] tabular-nums text-leif-muted">
                        {taskTypeGroupMetaLine(tg.items)}
                      </p>
                      <ul className={taskGroups[0].gap}>{tg.items.map((t) => taskRowLi(t))}</ul>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className={taskGroups[0].gap}>{taskGroups[0].items.map((t) => taskRowLi(t))}</ul>
              )
            ) : (
              <div className="space-y-0">
                {taskGroups.map((g, idx) => (
                  <div
                    key={g.key}
                    className={cn(idx > 0 && "mt-6 border-t border-leif-border/45 pt-6")}
                  >
                    <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-leif-muted">
                      {g.label}
                    </p>
                    {groupByType ? (
                      <div className="space-y-5">
                        {buildTaskTypeGroups(g.items, taskTypes).map((tg) => (
                          <div key={`${g.key}-${tg.key}`}>
                            <p className="mb-0.5 text-[12px] font-semibold text-leif-text">{tg.label}</p>
                            <p className="mb-2 text-[10px] tabular-nums text-leif-muted">
                              {taskTypeGroupMetaLine(tg.items)}
                            </p>
                            <ul className={g.gap}>{tg.items.map((t) => taskRowLi(t))}</ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <ul className={g.gap}>{g.items.map((t) => taskRowLi(t))}</ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Backdrop */}
        {detailOpen ? (
          <button
            type="button"
            aria-label="Detail schließen"
            className="fixed inset-0 z-40 bg-black/20 lg:hidden"
            onClick={closeDetail}
          />
        ) : null}

        {/* Spalte 3: Detailpanel */}
        <aside
          className={cn(
            "relative z-50 flex min-h-[18rem] flex-col bg-leif-surface lg:z-0 lg:min-h-0",
            "max-lg:fixed max-lg:bottom-0 max-lg:left-0 max-lg:right-0 max-lg:max-h-[88vh] max-lg:rounded-t-xl max-lg:border-t max-lg:border-leif-border max-lg:shadow-[0_-8px_32px_rgba(15,23,42,0.12)]",
            !detailOpen && "max-lg:hidden",
          )}
        >
          {!detailOpen ? (
            <div className="hidden min-h-[12rem] flex-1 flex-col items-center justify-center px-4 text-center lg:flex">
              <p className="text-[13px] text-leif-secondary">Task auswählen oder neu anlegen.</p>
            </div>
          ) : panelCreate ? (
            <TaskDetailPanel
              mode="create"
              task={null}
              taskTypes={taskTypes}
              documents={documents}
              projects={projects}
              sparringCreateContext={sparPersist}
              onClose={closeDetail}
            />
          ) : selectedTask ? (
            <TaskDetailPanel
              mode="edit"
              task={selectedTask}
              taskTypes={taskTypes}
              documents={documents}
              projects={projects}
              recommendationFeedback={editRecommendationFeedback}
              onClose={closeDetail}
              onDraftChange={handlePanelDraftChange}
            />
          ) : selectedId ? (
            <div className="flex flex-1 items-center justify-center p-6 text-[13px] text-leif-secondary">
              Task nicht gefunden.
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
