"use client";

import { updateTask, type TaskFormPayload } from "@/app/(app)/tasks/actions";
import {
  TaskEditor,
  taskEditorToPayload,
  type TaskEditorValue,
  validateTaskEditorValue,
} from "@/components/tasks/task-editor";
import { cn } from "@/lib/cn";
import type { TaskTypeRow } from "@/lib/task-types/defaults";
import type { TaskWithRelations } from "@/lib/tasks/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  task: TaskWithRelations;
  taskTypes: TaskTypeRow[];
  documents: { id: string; title: string }[];
  projects?: { id: string; name: string }[];
  onRequestClose: () => void;
  className?: string;
};

function initialDraft(task: TaskWithRelations): TaskEditorValue {
  return {
    title: task.title,
    estimated_minutes: task.estimated_minutes ? String(task.estimated_minutes) : "",
    plan_choice: task.planned_date ? "date" : "inbox",
    planned_date: task.planned_date ?? "",
    task_type: task.task_type ?? "",
    priority: task.priority,
    description: task.description ?? "",
    document_id: task.document_id ?? "",
    project_id: task.project_id ?? "",
  };
}

export function TaskInlineEditor({ task, taskTypes, documents, projects = [], onRequestClose, className }: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<TaskEditorValue>(() => initialDraft(task));
  const [lastSaved, setLastSaved] = useState<TaskFormPayload>(() => taskEditorToPayload(initialDraft(task)));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextDraft = initialDraft(task);
    setDraft(nextDraft);
    setLastSaved(taskEditorToPayload(nextDraft));
    setError(null);
    setPending(false);
  }, [task]);

  const payload = useMemo(() => taskEditorToPayload(draft), [draft]);
  const hasChanges = JSON.stringify(payload) !== JSON.stringify(lastSaved);

  async function persist(closeAfterSave = false) {
    if (pending) return;
    const validationError = validateTaskEditorValue(draft, { allowInboxWithoutDuration: true });
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!hasChanges) {
      if (closeAfterSave) onRequestClose();
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await updateTask(task.id, payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setLastSaved(payload);
      router.refresh();
      if (closeAfterSave) onRequestClose();
    } finally {
      setPending(false);
    }
  }

  function handleRootBlur(event: React.FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (next instanceof Node && rootRef.current?.contains(next)) return;
    void persist(false);
  }

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      void persist(true);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  });

  return (
    <div
      ref={rootRef}
      onBlurCapture={handleRootBlur}
      className={cn("rounded-lg border border-leif-border bg-leif-surface p-4 shadow-sm", className)}
    >
      <TaskEditor
        mode="inline"
        value={draft}
        taskTypes={taskTypes}
        documents={documents}
        projects={projects}
        pending={pending}
        error={error}
        titleAutoFocus
        onChange={setDraft}
        onSave={() => void persist(false)}
        onCancel={() => {
          setDraft(initialDraft(task));
          onRequestClose();
        }}
      />
      {pending ? <p className="mt-3 text-xs text-leif-secondary">Speichern…</p> : null}
    </div>
  );
}
