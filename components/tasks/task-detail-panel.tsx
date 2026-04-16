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
import { cn } from "@/lib/cn";
import type { SparringTaskDraft } from "@/lib/sparring/task-draft";
import type { TaskTypeRow } from "@/lib/task-types/defaults";
import type { TaskPriority, TaskWithRelations } from "@/lib/tasks/types";
import { Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

function payloadSignature(d: TaskEditorValue): string {
  try {
    return JSON.stringify(taskEditorToPayload(d));
  } catch {
    return "";
  }
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
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const lastSavedSig = useRef(payloadSignature(initialDraft));
  const feedbackLoggedRef = useRef(false);
  const saveInFlight = useRef(false);
  const titleRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    // Auto-height mit Obergrenze, damit der Header kompakt bleibt.
    el.style.height = "0px";
    const next = Math.min(el.scrollHeight, 96);
    el.style.height = `${next}px`;
  }, [draft.title]);

  useEffect(() => {
    setDraft(initialDraft);
    setError(null);
    setPending(false);
    setAutosaveStatus("idle");
    lastSavedSig.current = payloadSignature(initialDraft);
    feedbackLoggedRef.current = false;
  }, [initialDraft]);

  useEffect(() => {
    onDraftChange?.(initialDraft);
  }, [initialDraft, onDraftChange]);

  function handleDraftChange(next: TaskEditorValue) {
    setDraft(next);
    onDraftChange?.(next);
  }

  const runUpdate = useCallback(
    async (payload: TaskFormPayload) => {
      if (!task) return { ok: false as const, error: "Kein Task." };
      const fb = !feedbackLoggedRef.current && recommendationFeedback ? recommendationFeedback : null;
      const res = await updateTask(task.id, payload, fb ? { recommendationFeedback: fb } : undefined);
      if (res.ok && fb) feedbackLoggedRef.current = true;
      return res;
    },
    [task, recommendationFeedback],
  );

  /** Auto-Speichern nur im Bearbeiten-Modus, wenn der Entwurf gültig und geändert ist. */
  useEffect(() => {
    if (mode !== "edit" || !task) return;
    const sig = payloadSignature(draft);
    if (sig === lastSavedSig.current) {
      setAutosaveStatus("idle");
      return;
    }
    const validationError = validateTaskEditorValue(draft, { allowInboxWithoutDuration: true });
    if (validationError) {
      setAutosaveStatus("idle");
      return;
    }
    const payload = taskEditorToPayload(draft);
    const handle = window.setTimeout(() => {
      void (async () => {
        if (saveInFlight.current) return;
        saveInFlight.current = true;
        setAutosaveStatus("saving");
        setError(null);
        try {
          const res = await runUpdate(payload);
          if (!res.ok) {
            setError(res.error);
            setAutosaveStatus("error");
            return;
          }
          lastSavedSig.current = sig;
          setAutosaveStatus("saved");
          void Promise.resolve(router.refresh()).catch(() => {});
          window.setTimeout(() => setAutosaveStatus("idle"), 1800);
        } finally {
          saveInFlight.current = false;
        }
      })();
    }, 950);
    return () => window.clearTimeout(handle);
  }, [draft, mode, task, runUpdate, router]);

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
          : await runUpdate(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      lastSavedSig.current = payloadSignature(draft);
      void Promise.resolve(router.refresh()).catch(() => {});
      onSaved?.();
      if (mode === "create") onClose();
    } finally {
      setPending(false);
    }
  }

  function togglePriorityStar() {
    const next: TaskPriority = draft.priority === "high" ? "normal" : "high";
    handleDraftChange({ ...draft, priority: next });
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-leif-border/80 bg-leif-surface lg:border-l">
      <header className="flex shrink-0 items-center gap-2 border-b border-leif-border/70 px-3 py-2.5">
        <textarea
          ref={titleRef}
          value={draft.title}
          onChange={(e) => handleDraftChange({ ...draft, title: e.target.value })}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void handleSave();
            }
          }}
          placeholder={mode === "create" ? "Titel …" : undefined}
          aria-label="Titel"
          rows={2}
          className={cn(
            "min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent py-1 text-[15px] font-semibold leading-snug text-leif-text",
            "placeholder:text-leif-muted focus:outline-none focus:ring-0",
          )}
        />
        <button
          type="button"
          onClick={togglePriorityStar}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            draft.priority === "high"
              ? "text-amber-500 hover:bg-amber-500/10"
              : "text-leif-muted hover:bg-black/[0.04] hover:text-leif-secondary",
          )}
          title={draft.priority === "high" ? "Wichtig: aus" : "Als wichtig markieren"}
          aria-label={draft.priority === "high" ? "Wichtig entfernen" : "Als wichtig markieren"}
          aria-pressed={draft.priority === "high"}
        >
          <Star className={cn("size-[18px]", draft.priority === "high" && "fill-current")} strokeWidth={1.75} />
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 shrink-0 p-0"
          onClick={onClose}
          aria-label="Schließen"
        >
          <X className="size-4" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-2.5">
        <TaskEditor
          mode="inline"
          variant="panel"
          omitTitle
          hidePanelSaveButton
          value={draft}
          taskTypes={taskTypes}
          documents={documents}
          projects={projects}
          pending={pending}
          error={error}
          titleAutoFocus={false}
          onChange={handleDraftChange}
          onSave={() => void handleSave()}
          onCancel={onClose}
          saveLabel="Speichern"
        />
      </div>

      {mode === "create" ? (
        <div className="shrink-0 border-t border-leif-border/75 bg-leif-surface/95 px-3 py-2 backdrop-blur-[6px] supports-[backdrop-filter]:bg-leif-surface/90">
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={pending}
            onClick={() => void handleSave()}
          >
            {pending ? "Anlegen…" : "Task anlegen"}
          </Button>
        </div>
      ) : (
        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-leif-border/60 px-3 py-1.5 text-[10px] text-leif-muted">
          <span className="min-w-0 tabular-nums">
            {autosaveStatus === "saving"
              ? "Speichern…"
              : autosaveStatus === "saved"
                ? "Gespeichert"
                : autosaveStatus === "error"
                  ? "Speichern fehlgeschlagen"
                  : "Auto-Speichern aktiv"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-[11px]"
            disabled={pending}
            onClick={() => void handleSave()}
          >
            {pending ? "…" : "Jetzt speichern"}
          </Button>
        </footer>
      )}
    </div>
  );
}
