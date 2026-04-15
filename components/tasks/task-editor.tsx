"use client";

import { Button } from "@/components/ui/button";
import { controlClass, textareaClass } from "@/components/ui/control-styles";
import { cn } from "@/lib/cn";
import type { TaskTypeRow } from "@/lib/task-types/defaults";
import { addBerlinCalendarDays } from "@/lib/calendar/berlin-ymd";
import { todayYmdInRecommendationTz } from "@/lib/tasks/recommended";
import {
  deriveTaskStatus,
  TASK_PRIORITIES,
  type TaskPriority,
  type TaskType,
  type TaskWithRelations,
} from "@/lib/tasks/types";
import { ChevronDown } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";

export type TaskEditorPlanChoice = "inbox" | "today" | "tomorrow" | "date";

export type TaskEditorValue = {
  title: string;
  estimated_minutes: string;
  plan_choice: TaskEditorPlanChoice;
  planned_date: string;
  task_type: string;
  priority: TaskPriority;
  description: string;
  document_id: string;
  project_id: string;
};

type Props = {
  mode: "inline" | "modal";
  /** Seitenleiste Tasks: flache Felder, kein „Erweitert“-Klappbereich, nur Speichern. */
  variant?: "default" | "panel";
  /** Panel: Speichern außerhalb (z. B. sticky Leiste im Detail-Panel). */
  hidePanelSaveButton?: boolean;
  value: TaskEditorValue;
  taskTypes: TaskTypeRow[];
  documents: { id: string; title: string }[];
  projects?: { id: string; name: string }[];
  pending?: boolean;
  error?: string | null;
  titleAutoFocus?: boolean;
  hideInboxChoice?: boolean;
  onChange: (next: TaskEditorValue) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
};

export function taskToEditorValue(task: TaskWithRelations): TaskEditorValue {
  const today = todayYmdInRecommendationTz();
  const tomorrow = addBerlinCalendarDays(today, 1);
  let plan_choice: TaskEditorPlanChoice = "inbox";
  if (task.planned_date === today) plan_choice = "today";
  else if (task.planned_date === tomorrow) plan_choice = "tomorrow";
  else if (task.planned_date) plan_choice = "date";
  return {
    title: task.title,
    estimated_minutes: task.estimated_minutes ? String(task.estimated_minutes) : "",
    plan_choice,
    planned_date: task.planned_date ?? "",
    task_type: task.task_type ?? "",
    priority: task.priority,
    description: task.description ?? "",
    document_id: task.document_id ?? "",
    project_id: task.project_id ?? "",
  };
}

function setField<K extends keyof TaskEditorValue>(
  current: TaskEditorValue,
  key: K,
  val: TaskEditorValue[K],
): TaskEditorValue {
  return { ...current, [key]: val };
}

export function taskEditorToPayload(value: TaskEditorValue): {
  title: string;
  description: string;
  task_type: TaskType | null;
  priority: TaskPriority;
  planned_date: string | null;
  estimated_minutes: number | null;
  document_id: string | null;
  project_id: string | null;
} {
  const estStr = value.estimated_minutes.trim();
  let estimated: number | null = null;
  if (estStr) {
    const n = Number(estStr);
    estimated = Number.isFinite(n) ? Math.round(n) : null;
  }
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0, 0, 0);
  const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, "0")}-${String(tomorrowDate.getDate()).padStart(2, "0")}`;
  const plannedDate =
    value.plan_choice === "today"
      ? today
      : value.plan_choice === "tomorrow"
        ? tomorrow
        : value.plan_choice === "date"
          ? value.planned_date.trim() || null
          : null;
  return {
    title: value.title,
    description: value.description,
    task_type: (value.task_type.trim() || null) as TaskType | null,
    priority: value.priority,
    planned_date: plannedDate,
    estimated_minutes: estimated,
    document_id: value.document_id.trim() || null,
    project_id: value.project_id.trim() || null,
  };
}

/** Liste/Panel: Entwurf sofort als Task anzeigen (Meta, Titel). */
export function applyTaskEditorValueToTask(
  base: TaskWithRelations,
  value: TaskEditorValue,
): TaskWithRelations {
  const p = taskEditorToPayload(value);
  const status = deriveTaskStatus({
    completed_at: base.completed_at,
    planned_date: p.planned_date,
  });
  return {
    ...base,
    title: p.title,
    description: p.description,
    task_type: p.task_type,
    priority: p.priority,
    planned_date: p.planned_date,
    estimated_minutes: p.estimated_minutes,
    document_id: p.document_id,
    project_id: p.project_id,
    status,
  };
}

export function validateTaskEditorValue(
  value: TaskEditorValue,
  options?: { allowInboxWithoutDuration?: boolean },
): string | null {
  if (!value.title.trim()) return "Titel ist Pflichtfeld.";
  const allowInbox = options?.allowInboxWithoutDuration ?? true;
  if (value.plan_choice !== "inbox" || !allowInbox) {
    const est = Number(value.estimated_minutes.trim());
    if (!Number.isFinite(est) || est <= 0) return "Für geplante Tasks ist die Dauer Pflicht.";
  }
  if (value.plan_choice === "date" && !value.planned_date.trim()) {
    return "Bitte ein Datum auswählen.";
  }
  return null;
}

export function TaskEditor({
  mode,
  variant = "default",
  hidePanelSaveButton = false,
  value,
  taskTypes,
  documents,
  projects = [],
  pending = false,
  error = null,
  titleAutoFocus = false,
  hideInboxChoice = false,
  onChange,
  onSave,
  onCancel,
  saveLabel = "Speichern",
}: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isPanel = variant === "panel";
  const typeOptions = useMemo(
    () =>
      taskTypes.length > 0
        ? taskTypes
        : [
            { id: "call", key: "call", label: "Anruf", sort_order: 0 },
            { id: "followup", key: "followup", label: "Rücksprache", sort_order: 1 },
            { id: "delegate", key: "delegate", label: "Delegieren", sort_order: 2 },
            { id: "prep", key: "prep", label: "Vorbereitung", sort_order: 3 },
            { id: "research", key: "research", label: "Recherche", sort_order: 4 },
            { id: "finance", key: "finance", label: "Finanzen", sort_order: 5 },
            { id: "private", key: "private", label: "privat", sort_order: 6 },
            { id: "operational", key: "operational", label: "operativ", sort_order: 7 },
            { id: "invoice", key: "invoice", label: "Rechnung", sort_order: 8 },
            { id: "offer", key: "offer", label: "Angebot", sort_order: 9 },
          ],
    [taskTypes],
  );

  function onTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    /** Panel: Strg/Cmd+Enter speichern — Enter allein nicht (weniger versehentliche Saves). */
    if (isPanel && !event.metaKey && !event.ctrlKey) return;
    event.preventDefault();
    onSave();
  }

  const advancedBlock = (
    <>
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-leif-secondary">Beschreibung</span>
        <textarea
          rows={isPanel ? 4 : 3}
          value={value.description}
          onChange={(e) => onChange(setField(value, "description", e.target.value))}
          className={textareaClass}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-leif-secondary">Dokument</span>
        <select
          value={value.document_id}
          onChange={(e) => onChange(setField(value, "document_id", e.target.value))}
          className={controlClass}
        >
          <option value="">—</option>
          {documents.map((document) => (
            <option key={document.id} value={document.id}>
              {document.title}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-leif-secondary">Projekt (optional)</span>
        <select
          value={value.project_id}
          onChange={(e) => onChange(setField(value, "project_id", e.target.value))}
          className={controlClass}
        >
          <option value="">—</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );

  const titleField = (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-leif-secondary">
        Titel <span className="text-leif-error">*</span>
      </span>
      <input
        value={value.title}
        onChange={(e) => onChange(setField(value, "title", e.target.value))}
        onKeyDown={onTitleKeyDown}
        className={cn(controlClass, isPanel ? "text-[15px] font-medium" : "text-base")}
        autoFocus={titleAutoFocus}
        required
      />
    </label>
  );

  const planungFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-leif-secondary">
          Dauer (Min.) {value.plan_choice !== "inbox" ? <span className="text-leif-error">*</span> : null}
        </span>
        <select
          value={value.estimated_minutes}
          onChange={(e) => onChange(setField(value, "estimated_minutes", e.target.value))}
          className={controlClass}
        >
          <option value="">—</option>
          {[15, 30, 45, 60].map((minutes) => (
            <option key={minutes} value={String(minutes)}>
              {minutes} min
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-leif-secondary">Wann</span>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={value.plan_choice === "today" ? "primary" : "secondary"}
            onClick={() => onChange(setField(value, "plan_choice", "today"))}
          >
            Heute
          </Button>
          <Button
            type="button"
            size="sm"
            variant={value.plan_choice === "tomorrow" ? "primary" : "secondary"}
            onClick={() => onChange(setField(value, "plan_choice", "tomorrow"))}
          >
            Morgen
          </Button>
          <Button
            type="button"
            size="sm"
            variant={value.plan_choice === "date" ? "primary" : "secondary"}
            onClick={() => onChange(setField(value, "plan_choice", "date"))}
          >
            Datum
          </Button>
          {!hideInboxChoice ? (
            <Button
              type="button"
              size="sm"
              variant={value.plan_choice === "inbox" ? "primary" : "secondary"}
              onClick={() => onChange(setField(value, "plan_choice", "inbox"))}
            >
              Ohne Termin
            </Button>
          ) : null}
        </div>
        {value.plan_choice === "date" ? (
          <input
            type="date"
            value={value.planned_date}
            onChange={(e) => onChange(setField(value, "planned_date", e.target.value))}
            className={controlClass}
          />
        ) : null}
      </div>
    </div>
  );

  const artTypeButtonClass =
    "min-h-9 w-full justify-center px-2 py-2 text-center text-xs font-medium leading-tight";

  const einordnungFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-leif-secondary">Art</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Button
            type="button"
            size="sm"
            className={artTypeButtonClass}
            variant={value.task_type === "" ? "primary" : "secondary"}
            onClick={() => onChange(setField(value, "task_type", ""))}
          >
            —
          </Button>
          {typeOptions.map((type) => (
            <Button
              key={type.id}
              type="button"
              size="sm"
              className={artTypeButtonClass}
              variant={value.task_type === type.key ? "primary" : "secondary"}
              onClick={() => onChange(setField(value, "task_type", type.key))}
            >
              {type.label}
            </Button>
          ))}
        </div>
      </div>
      <label className="flex max-w-full flex-col gap-2 text-sm sm:max-w-[14rem]">
        <span className="font-medium text-leif-secondary">Priorität</span>
        <select
          value={value.priority}
          onChange={(e) => onChange(setField(value, "priority", e.target.value as TaskPriority))}
          className={controlClass}
        >
          {TASK_PRIORITIES.map((priority) => (
            <option key={priority.value} value={priority.value}>
              {priority.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  if (isPanel) {
    return (
      <div className="space-y-6">
        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-900">{error}</p>
        ) : null}

        {titleField}

        <section className="space-y-4 rounded-2xl bg-leif-canvas/45 px-4 py-4 sm:px-5 sm:py-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-leif-muted">Planung</h3>
          {planungFields}
        </section>

        <section className="space-y-4 rounded-2xl bg-leif-canvas/45 px-4 py-4 sm:px-5 sm:py-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-leif-muted">Einordnung</h3>
          {einordnungFields}
        </section>

        <section className="space-y-4 rounded-2xl bg-leif-canvas/45 px-4 py-4 sm:px-5 sm:py-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-leif-muted">Inhalt</h3>
          <div className="space-y-4">{advancedBlock}</div>
        </section>

        {!hidePanelSaveButton ? (
          <div className="flex justify-end pt-1">
            <Button type="button" variant="primary" className="min-w-[8rem] px-6" onClick={onSave} disabled={pending}>
              {pending ? "Speichern…" : saveLabel}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={mode === "inline" ? "space-y-3" : "space-y-4"}>
      {error ? (
        <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
      ) : null}

      {titleField}

      {planungFields}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="space-y-2">
          <p className="text-sm font-medium text-leif-secondary">Art</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={value.task_type === "" ? "primary" : "secondary"}
              onClick={() => onChange(setField(value, "task_type", ""))}
            >
              —
            </Button>
            {typeOptions.map((type) => (
              <Button
                key={type.id}
                type="button"
                size="sm"
                variant={value.task_type === type.key ? "primary" : "secondary"}
                onClick={() => onChange(setField(value, "task_type", type.key))}
              >
                {type.label}
              </Button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-2 text-sm sm:max-w-[10rem]">
          <span className="font-medium text-leif-secondary">Priorität</span>
          <select
            value={value.priority}
            onChange={(e) => onChange(setField(value, "priority", e.target.value as TaskPriority))}
            className={controlClass}
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <details
        open={detailsOpen}
        onToggle={(event) => setDetailsOpen((event.currentTarget as HTMLDetailsElement).open)}
        className="rounded-md border border-leif-border/70 bg-leif-canvas/30 p-2"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-leif-secondary">
          <span>Erweiterte Details</span>
          <ChevronDown className="size-4 shrink-0 text-[#9ca3af]" />
        </summary>
        <div className="mt-2 space-y-3">{advancedBlock}</div>
      </details>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
          Abbrechen
        </Button>
        <Button type="button" variant="primary" onClick={onSave} disabled={pending}>
          {pending ? "Speichern…" : saveLabel}
        </Button>
      </div>
    </div>
  );
}
