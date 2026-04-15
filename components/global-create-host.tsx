"use client";

import { createDocumentUpload } from "@/app/(app)/dokumente/actions";
import { createInboxItemFromTaskDraft } from "@/app/(app)/inbox/actions";
import { createNote } from "@/app/(app)/notizen/actions";
import { NoteEditor, noteEditorToFormInput, validateNoteEditorValue, type NoteEditorValue } from "@/components/notizen/note-editor";
import { listCreateAreas, listProjects } from "@/app/(app)/tasks/actions";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { Button } from "@/components/ui/button";
import { controlClass, textareaClass } from "@/components/ui/control-styles";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type Action = "task_inbox" | "task_create" | "note" | "document";
type Area = { id: string; name: string };

export function GlobalCreateHost() {
  const router = useRouter();
  const taskRef = useRef<HTMLDialogElement>(null);
  const noteRef = useRef<HTMLDialogElement>(null);
  const documentRef = useRef<HTMLDialogElement>(null);
  const taskFormRef = useRef<HTMLFormElement>(null);

  const [active, setActive] = useState<Action | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [areasLoaded, setAreasLoaded] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [noteDraft, setNoteDraft] = useState<NoteEditorValue>({
    title: "",
    description: "",
    type: "",
    document_id: "",
    project_id: "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeRef = useMemo(() => {
    if (active === "task_inbox") return taskRef;
    if (active === "note") return noteRef;
    if (active === "document") return documentRef;
    return null;
  }, [active]);

  useEffect(() => {
    const dialog = activeRef?.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    if (active === "task_inbox") taskFormRef.current?.reset();
  }, [activeRef, active]);

  async function ensureAreas() {
    if (areasLoaded) return;
    const res = await listCreateAreas();
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setAreas(res.areas);
    setAreasLoaded(true);
  }

  async function ensureProjects() {
    if (projectsLoaded) return;
    const res = await listProjects();
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setProjects(res.projects);
    setProjectsLoaded(true);
  }

  useEffect(() => {
    function onGlobalCreate(ev: Event) {
      const action = (ev as CustomEvent<{ action?: string }>).detail?.action;
      if (action !== "task_inbox" && action !== "task_create" && action !== "note" && action !== "document") return;
      setError(null);
      setActive(action);
      if (action === "task_create") {
        void ensureAreas();
        void ensureProjects();
      }
      if (action === "note") {
        setNoteDraft({ title: "", description: "", type: "", document_id: "", project_id: "" });
        void ensureProjects();
      }
    }
    window.addEventListener("leif-global-create", onGlobalCreate);
    return () => window.removeEventListener("leif-global-create", onGlobalCreate);
  });

  function close() {
    taskFormRef.current?.reset();
    if (taskRef.current?.open) taskRef.current.close();
    if (noteRef.current?.open) noteRef.current.close();
    if (documentRef.current?.open) documentRef.current.close();
    setActive(null);
    setError(null);
    setPending(false);
  }

  async function onTaskSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    setPending(true);
    try {
      const res = await createInboxItemFromTaskDraft({
        title: String(fd.get("title") ?? ""),
        description: String(fd.get("description") ?? ""),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      close();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function onNoteSubmit() {
    setError(null);
    const validationError = validateNoteEditorValue(noteDraft);
    if (validationError) {
      setError(validationError);
      return;
    }
    const mapped = noteEditorToFormInput(noteDraft);
    setPending(true);
    try {
      const res = await createNote({
        title: mapped.title,
        description: mapped.description,
        document_id: mapped.document_id,
        project_id: mapped.project_id,
        content: mapped.content,
        type: mapped.type,
        area_id: null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      close();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function onDocumentSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    setPending(true);
    try {
      fd.set("area_ids", "[]");
      fd.set("person_ids", "[]");
      fd.set("note_ids", "[]");
      fd.set("result_ids", "[]");
      const res = await createDocumentUpload(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      close();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <dialog
        ref={taskRef}
        className="w-[min(100vw-2rem,32rem)] rounded-[12px] border border-leif-border bg-leif-surface p-0 text-leif-text shadow-leif [&::backdrop]:bg-black/25"
        onClose={close}
      >
        <form ref={taskFormRef} onSubmit={(e) => void onTaskSubmit(e)} className="flex flex-col gap-4 p-6">
          <h2 className="text-base font-semibold">Neuer Eingang</h2>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <input name="title" required placeholder="Titel" className={controlClass} />
          <textarea name="description" rows={3} placeholder="Beschreibung (optional)" className={textareaClass} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => taskRef.current?.close()}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Speichern…" : "Speichern"}
            </Button>
          </div>
        </form>
      </dialog>

      <TaskFormDialog
        open={active === "task_create"}
        mode="create"
        task={null}
        areas={areas}
        onClose={close}
        taskTypes={[]}
        documents={[]}
        projects={projects}
      />

      <dialog
        ref={noteRef}
        className="w-[min(100vw-2rem,32rem)] rounded-[12px] border border-leif-border bg-leif-surface p-0 text-leif-text shadow-leif [&::backdrop]:bg-black/25"
        onClose={close}
      >
        <form className="flex flex-col gap-4 p-6">
          <h2 className="text-base font-semibold">Notiz anlegen</h2>
          <NoteEditor
            value={noteDraft}
            pending={pending}
            error={error}
            onChange={setNoteDraft}
            projects={projects}
            onSave={() => void onNoteSubmit()}
            onCancel={() => noteRef.current?.close()}
            titleAutoFocus
          />
        </form>
      </dialog>

      <dialog
        ref={documentRef}
        className="w-[min(100vw-2rem,32rem)] rounded-[12px] border border-leif-border bg-leif-surface p-0 text-leif-text shadow-leif [&::backdrop]:bg-black/25"
        onClose={close}
      >
        <form onSubmit={(e) => void onDocumentSubmit(e)} className="flex flex-col gap-4 p-6">
          <h2 className="text-base font-semibold">Dokument hochladen</h2>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <input type="file" name="file" required className={controlClass} />
          <input name="title" required placeholder="Titel" className={controlClass} />
          <textarea name="description" rows={3} placeholder="Beschreibung (optional)" className={textareaClass} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => documentRef.current?.close()}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Speichern…" : "Speichern"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
