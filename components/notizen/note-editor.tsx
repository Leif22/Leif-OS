"use client";

import { Button } from "@/components/ui/button";
import { controlClass, textareaClass } from "@/components/ui/control-styles";
import type { TaskTypeRow } from "@/lib/task-types/defaults";

export type NoteEditorValue = {
  title: string;
  description: string;
  type: string;
  document_id: string;
  project_id: string;
};

type Props = {
  value: NoteEditorValue;
  pending?: boolean;
  error?: string | null;
  taskTypes?: TaskTypeRow[];
  projects?: { id: string; name: string }[];
  onChange: (next: NoteEditorValue) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
  titleAutoFocus?: boolean;
};

function fallbackTypes(): TaskTypeRow[] {
  return [
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
  ];
}

export function noteEditorToFormInput(value: NoteEditorValue) {
  const title = value.title.trim();
  const description = value.description.trim();
  const content = description ? `${title}\n\n${description}` : title;
  return {
    title,
    description: description || null,
    document_id: value.document_id.trim() || null,
    project_id: value.project_id.trim() || null,
    type: value.type.trim() || null,
    content,
  };
}

export function validateNoteEditorValue(value: NoteEditorValue): string | null {
  if (!value.title.trim()) return "Titel ist Pflichtfeld.";
  return null;
}

export function NoteEditor({
  value,
  pending = false,
  error = null,
  taskTypes = [],
  projects = [],
  onChange,
  onSave,
  onCancel,
  saveLabel = "Speichern",
  titleAutoFocus = false,
}: Props) {
  const typeOptions = taskTypes.length > 0 ? taskTypes : fallbackTypes();

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
      ) : null}

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-leif-secondary">
          Titel <span className="text-leif-error">*</span>
        </span>
        <input
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          className={controlClass}
          autoFocus={titleAutoFocus}
          required
        />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-leif-secondary">Beschreibung (optional)</span>
        <textarea
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          rows={6}
          className={textareaClass}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-leif-secondary">Art (optional)</span>
        <select
          value={value.type}
          onChange={(e) => onChange({ ...value, type: e.target.value })}
          className={controlClass}
        >
          <option value="">—</option>
          {typeOptions.map((t) => (
            <option key={t.id} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-leif-secondary">Dokument (optional)</span>
        <input
          value={value.document_id}
          onChange={(e) => onChange({ ...value, document_id: e.target.value })}
          className={controlClass}
          placeholder="Dokument-ID (UUID)"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-leif-secondary">Projekt (optional)</span>
        <select
          value={value.project_id}
          onChange={(e) => onChange({ ...value, project_id: e.target.value })}
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

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
          Abbrechen
        </Button>
        <Button type="button" onClick={onSave} disabled={pending}>
          {pending ? "Speichern…" : saveLabel}
        </Button>
      </div>
    </div>
  );
}
