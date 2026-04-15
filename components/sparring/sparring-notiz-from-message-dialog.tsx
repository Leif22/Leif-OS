"use client";

import { loadSparringNotizPrefillForMessage } from "@/app/(app)/sparring/actions";
import { listProjects } from "@/app/(app)/tasks/actions";
import { createNote, type NoteFormInput } from "@/app/(app)/notizen/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { NoteEditor, noteEditorToFormInput, validateNoteEditorValue, type NoteEditorValue } from "@/components/notizen/note-editor";
import { Button } from "@/components/ui/button";
import { PRODUCT_COPY } from "@/lib/product-labels";
import type { AreaRow } from "@/lib/tasks/types";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type Props = {
  messageId: string | null;
  areas: AreaRow[];
  onClose: () => void;
  onLoadError: (message: string) => void;
};

export function SparringNotizFromMessageDialog({ messageId, areas, onClose, onLoadError }: Props) {
  void areas;
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NoteEditorValue>({
    title: "",
    description: "",
    type: "",
    document_id: "",
    project_id: "",
  });
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const handlersRef = useRef({ onClose, onLoadError });
  handlersRef.current = { onClose, onLoadError };

  useEffect(() => {
    if (projectsLoaded) return;
    void listProjects().then((res) => {
      if (!res.ok) return;
      setProjects(res.projects);
      setProjectsLoaded(true);
    });
  }, [projectsLoaded]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else if (el.open) el.close();
  }, [open]);

  useEffect(() => {
    if (!messageId) {
      setOpen(false);
      setLoading(false);
      setChatId(null);
      setDraft({ title: "", description: "", type: "", document_id: "", project_id: "" });
      setError(null);
      return;
    }
    let cancelled = false;
    setChatId(null);
    setDraft({ title: "", description: "", type: "", document_id: "", project_id: "" });
    setError(null);
    setLoading(true);
    setOpen(false);
    void loadSparringNotizPrefillForMessage(messageId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        handlersRef.current.onLoadError(res.error);
        handlersRef.current.onClose();
        return;
      }
      setChatId(res.prefill.chat_id);
      const prefill = String(res.prefill.content ?? "").trim();
      const title = prefill.split("\n")[0] ?? "";
      setDraft({
        title,
        description: prefill && prefill !== title ? prefill : "",
        type: "",
        document_id: "",
        project_id: "",
      });
      setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [messageId]);

  async function onSubmit() {
    if (!chatId) return;
    setError(null);
    const validationError = validateNoteEditorValue(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    const mapped = noteEditorToFormInput(draft);
    const input: NoteFormInput = {
      title: mapped.title,
      description: mapped.description,
      document_id: mapped.document_id,
      project_id: mapped.project_id,
      content: mapped.content,
      type: mapped.type,
      area_id: null,
      source_sparring_chat_id: chatId,
    };
    setPending(true);
    try {
      const res = await createNote(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      dialogRef.current?.close();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {messageId && loading ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/25 p-4">
          <div className="flex max-w-sm flex-col gap-4 rounded-[12px] border border-leif-border bg-leif-surface p-6 shadow-leif">
            <p className="text-sm text-leif-text">Notiz-Vorschlag wird erstellt …</p>
            <Button type="button" variant="secondary" onClick={onClose}>
              Abbrechen
            </Button>
          </div>
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        className="w-[min(36rem,calc(100vw-2rem))] max-h-[min(90vh,40rem)] overflow-hidden rounded-[12px] border border-leif-border bg-leif-surface p-0 text-leif-text shadow-leif [&::backdrop]:bg-black/25"
        onClose={() => {
          setOpen(false);
          onClose();
        }}
      >
        <form id={formId} className="flex max-h-[min(90vh,40rem)] flex-col">
          <header className="border-b border-leif-divider px-6 py-4">
            <h2 className="text-base font-semibold text-leif-text">{PRODUCT_COPY.plusMenuNotiz}</h2>
            {chatId ? <p className="mt-1 text-[12px] text-leif-muted">{PRODUCT_COPY.notizFromKiHint}</p> : null}
          </header>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
            {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
            <NoteEditor
              value={draft}
              pending={pending}
              error={error}
              projects={projects}
              onChange={setDraft}
              onSave={() => void onSubmit()}
              onCancel={() => dialogRef.current?.close()}
              titleAutoFocus
            />
          </div>
          <footer className="flex justify-end gap-2 border-t border-leif-divider px-6 py-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => dialogRef.current?.close()}
              disabled={pending}
            >
              Abbrechen
            </Button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
