"use client";

import {
  createTask,
  updateTask,
  type RecommendationFeedbackInput,
  type TaskFormPayload,
} from "@/app/(app)/tasks/actions";
import {
  TaskEditor,
  taskEditorToPayload,
  taskToEditorValue,
  type TaskEditorValue,
  validateTaskEditorValue,
} from "@/components/tasks/task-editor";
import { Button } from "@/components/ui/button";
import type { SparringTaskDraft } from "@/lib/sparring/task-draft";
import type { TaskTypeRow } from "@/lib/task-types/defaults";
import type { TaskWithRelations } from "@/lib/tasks/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type PanelMode = "create" | "edit";

type Props = {
  mode: PanelMode;
  task: TaskWithRelations | null;
  taskTypes: TaskTypeRow[];
  documents: { id: string; title: string }[];
  projects: { id: string; name: string }[];
  recommendationFeedback?: RecommendationFeedbackInput | null;
  sparringCreateContext?: SparringTaskDraft | null;
  onClose: () => void;
  onSaved?: () => void;
  /** Entwurf bei jeder Änderung (Live-Vorschau in der Liste). */
  onDraftChange?: (draft: TaskEditorValue) => void;
};

function emptyCreateValue(spar: SparringTaskDraft | null | undefined): TaskEditorValue {
  return {
    title: spar?.title ?? "",
    estimated_minutes: "",
    plan_choice: "inbox",
    planned_date: "",
    task_type: "",
    priority: "normal",
    description: spar?.description ?? "",
    document_id: "",
    project_id: "",
  };
}

export function TaskDetailPanel({
  mode,
  task,
  taskTypes,
  documents,
  projects,
  recommendationFeedback = null,
  sparringCreateContext = null,
  onClose,
  onSaved,
  onDraftChange,
}: Props) {
  const router = useRouter();
  const initialDraft = useMemo(() => {
    if (mode === "edit" && task) return taskToEditorValue(task);
    return emptyCreateValue(sparringCreateContext);
  }, [mode, task, sparringCreateContext]);

  const [draft, setDraft] = useState<TaskEditorValue>(initialDraft);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setDraft(initialDraft);
    setError(null);
    setPending(false);
  }, [initialDraft]);

  useEffect(() => {
    onDraftChange?.(initialDraft);
  }, [initialDraft, onDraftChange]);

  function handleDraftChange(next: TaskEditorValue) {
    setDraft(next);
    onDraftChange?.(next);
  }

  async function handleSave() {
    setError(null);
    const validationError = validateTaskEditorValue(draft, { allowInboxWithoutDuration: true });
    if (validationError) {
      setError(validationError);
      return;
    }
    const payload: TaskFormPayload = taskEditorToPayload(draft);
    setPending(true);
    try {
      const res =
        mode === "create"
          ? await createTask(
              payload,
              sparringCreateContext ? { source_sparring_chat_id: sparringCreateContext.chat_id } : undefined,
            )
          : task
            ? await updateTask(task.id, payload, recommendationFeedback ? { recommendationFeedback } : undefined)
            : ({ ok: false as const, error: "Kein Task." } as const);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      void Promise.resolve(router.refresh()).catch(() => {});
      onSaved?.();
      onClose();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-leif-border/80 bg-leif-surface lg:border-l">
      <header className="flex shrink-0 items-start justify-between gap-2 border-b border-transparent px-4 py-3.5">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-leif-muted">
            {mode === "create" ? "Neu" : "Details"}
          </h2>
        </div>
        <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={onClose}>
          Schließen
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 pt-3">
        <TaskEditor
          mode="inline"
          variant="panel"
          hidePanelSaveButton
          value={draft}
          taskTypes={taskTypes}
          documents={documents}
          projects={projects}
          pending={pending}
          error={error}
          titleAutoFocus={mode === "create"}
          onChange={handleDraftChange}
          onSave={() => void handleSave()}
          onCancel={onClose}
          saveLabel="Speichern"
        />
      </div>

      <div className="sticky bottom-0 z-10 shrink-0 border-t border-leif-border/75 bg-leif-surface/95 px-4 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.07)] backdrop-blur-[8px] supports-[backdrop-filter]:bg-leif-surface/90">
        <Button
          type="button"
          variant="primary"
          className="w-full sm:ml-auto sm:block sm:w-auto sm:min-w-[11rem]"
          disabled={pending}
          onClick={() => void handleSave()}
        >
          {pending ? "Speichern…" : "Speichern"}
        </Button>
      </div>
    </div>
  );
}
