"use client";

import {
  createTask,
  updateTask,
  type RecommendationFeedbackInput,
} from "@/app/(app)/tasks/actions";
import {
  TaskEditor,
  taskEditorToPayload,
  taskToEditorValue,
  type TaskEditorValue,
  validateTaskEditorValue,
} from "@/components/tasks/task-editor";
import { PRODUCT_COPY } from "@/lib/product-labels";
import { DEFAULT_TASK_TYPES } from "@/lib/task-types/defaults";
import type { SparringTaskDraft } from "@/lib/sparring/task-draft";
import type { TaskTypeRow } from "@/lib/task-types/defaults";
import type { AreaRow, TaskWithRelations } from "@/lib/tasks/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Mode = "create" | "edit";

type Props = {
  open: boolean;
  mode: Mode;
  task: TaskWithRelations | null;
  areas: AreaRow[];
  taskTypes?: TaskTypeRow[];
  documents?: { id: string; title: string }[];
  projects?: { id: string; name: string }[];
  onClose: () => void;
  /** Bei Bearbeitung aus dem Empfehlungsblock: Feedback „accepted“ nach Speichern loggen */
  recommendationFeedback?: RecommendationFeedbackInput | null;
  /** Vorausfüllung + Verknüpfung beim Anlegen aus Sparring */
  sparringCreateContext?: SparringTaskDraft | null;
  /** Create-Modus: Bereich aus z. B. `/tasks?new=1&area=` */
  initialCreateAreaId?: string | null;
};

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
  projects = [],
  onClose,
  recommendationFeedback = null,
  sparringCreateContext = null,
  initialCreateAreaId = null,
}: Props) {
  void areas;
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const initialDraft = useMemo<TaskEditorValue>(() => {
    if (mode === "edit" && task) {
      return taskToEditorValue(task);
    }
    return {
      title: sparringCreateContext?.title ?? "",
      estimated_minutes: "",
      plan_choice: "inbox",
      planned_date: "",
      task_type: "",
      priority: "normal",
      description: sparringCreateContext?.description ?? "",
      document_id: "",
      project_id: "",
    };
  }, [mode, task, sparringCreateContext]);
  const [draft, setDraft] = useState<TaskEditorValue>(initialDraft);

  useEffect(() => {
    setDraft(initialDraft);
    setError(null);
    setPending(false);
  }, [initialDraft, open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open]);

  async function handleSave() {
    setError(null);
    const validationError = validateTaskEditorValue(draft, { allowInboxWithoutDuration: true });
    if (validationError) {
      setError(validationError);
      return;
    }
    const payload = taskEditorToPayload(draft);
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
        <div
          key={
            mode === "create"
              ? `new-${sparringCreateContext?.chat_id ?? initialCreateAreaId ?? "plain"}`
              : (task?.id ?? "edit")
          }
          className="flex flex-1 flex-col gap-4 overflow-y-auto p-6"
        >
          <TaskEditor
            mode="modal"
            value={draft}
            taskTypes={taskTypes}
            documents={documents}
            projects={projects}
            pending={pending}
            error={error}
            titleAutoFocus
            onChange={setDraft}
            onSave={() => void handleSave()}
            onCancel={onClose}
            saveLabel="Speichern"
          />
        </div>
      </div>
    </dialog>
  );
}
