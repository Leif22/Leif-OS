"use client";

import { createNote, deleteNote, restoreNote, updateNote, type NoteFormInput } from "@/app/(app)/notizen/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { NoteEditor, noteEditorToFormInput, validateNoteEditorValue, type NoteEditorValue } from "@/components/notizen/note-editor";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { TableShell } from "@/components/ui/table-shell";
import type { NoteListItem } from "@/lib/notes/types";
import { PRODUCT_COPY, PRODUCT_LABEL } from "@/lib/product-labels";
import type { SparringNotizPrefill } from "@/lib/sparring/note-prefill";
import type { AreaRow } from "@/lib/tasks/types";
import { ChevronDown, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type Props = {
  notes: NoteListItem[];
  deletedNotes: NoteListItem[];
  areas: AreaRow[];
  projects: { id: string; name: string }[];
  loadError: string | null;
  initialDialog: "none" | "create" | "edit";
  initialNoteId: string | null;
  /** Bei ?new=1&area= — gültige Bereichs-ID */
  initialAreaPrefill: string;
  /** Bei ?new=1&from_sparring= — serverseitig aus letzten Sparring-Nachrichten */
  sparringNotizDraft: SparringNotizPrefill | null;
};

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

function typeLabel(t: string | null | undefined): string {
  if (!t) return "—";
  return t;
}

export function NotizenPageClient({
  notes,
  deletedNotes,
  areas,
  projects,
  loadError,
  initialDialog,
  initialNoteId,
  initialAreaPrefill,
  sparringNotizDraft,
}: Props) {
  void areas;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formId = useId();
  const openedFromUrl = useRef(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NoteListItem | null>(null);
  const [draft, setDraft] = useState<NoteEditorValue>({
    title: "",
    description: "",
    type: "",
    document_id: "",
    project_id: "",
  });
  const [sourceSparringChatId, setSourceSparringChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deletedOpen, setDeletedOpen] = useState(false);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (modalOpen) {
      if (!el.open) el.showModal();
    } else if (el.open) el.close();
  }, [modalOpen]);

  useEffect(() => {
    if (openedFromUrl.current) return;
    const wantNew = searchParams.get("new") === "1";
    const fromMsg = searchParams.get("from_sparring_message");
    const fromChat = searchParams.get("from_sparring");
    if (initialDialog === "create" && sparringNotizDraft && (fromMsg || fromChat)) {
      openedFromUrl.current = true;
      beginCreate({
        areaId: initialAreaPrefill || undefined,
        content: sparringNotizDraft.content,
        sourceSparringChatId: sparringNotizDraft.chat_id,
      });
      if (wantNew) router.replace(pathname, { scroll: false });
      return;
    }
    if (initialDialog === "create") {
      openedFromUrl.current = true;
      beginCreate(initialAreaPrefill ? { areaId: initialAreaPrefill } : undefined);
      if (wantNew) router.replace(pathname, { scroll: false });
      return;
    }
    if (initialDialog === "edit" && initialNoteId) {
      if (notes.length === 0) return;
      openedFromUrl.current = true;
      const n = notes.find((x) => x.id === initialNoteId);
      if (n) beginEdit(n);
    }
  }, [
    initialDialog,
    initialNoteId,
    initialAreaPrefill,
    notes,
    sparringNotizDraft,
    searchParams,
    pathname,
    router,
  ]);

  function beginCreate(opts?: {
    content?: string;
    sourceSparringChatId?: string | null;
  }) {
    const fallbackTitle = String(opts?.content ?? "").trim().split("\n")[0] ?? "";
    const fallbackDescription = String(opts?.content ?? "").trim();
    setEditing(null);
    setDraft({
      title: fallbackTitle,
      description: fallbackDescription && fallbackDescription !== fallbackTitle ? fallbackDescription : "",
      type: "",
      document_id: "",
      project_id: "",
    });
    setSourceSparringChatId(opts?.sourceSparringChatId?.trim() || null);
    setError(null);
    setModalOpen(true);
  }

  function beginEdit(n: NoteListItem) {
    setEditing(n);
    setDraft({
      title: n.title ?? "",
      description: n.description ?? "",
      type: n.type ?? "",
      document_id: n.document_id ?? "",
      project_id: n.project_id ?? "",
    });
    setSourceSparringChatId(null);
    setError(null);
    setModalOpen(true);
  }

  function closeDialog() {
    setModalOpen(false);
    setEditing(null);
    setSourceSparringChatId(null);
    setError(null);
  }

  async function onSubmit() {
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
      type: mapped.type,
      content: mapped.content,
      area_id: null,
      source_sparring_chat_id: editing ? undefined : sourceSparringChatId,
    };
    setPending(true);
    try {
      if (editing) {
        const res = await updateNote(editing.id, input);
        if (!res.ok) {
          setError(res.error);
          return;
        }
      } else {
        const res = await createNote(input);
        if (!res.ok) {
          setError(res.error);
          return;
        }
      }
      closeDialog();
      router.replace(pathname, { scroll: false });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!editing) return;
    if (!window.confirm("Notiz wirklich löschen?")) return;
    setPending(true);
    try {
      const res = await deleteNote(editing.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      closeDialog();
      router.replace(pathname, { scroll: false });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function onQuickDelete(noteId: string) {
    if (!window.confirm("Notiz wirklich löschen?")) return;
    setPending(true);
    setError(null);
    try {
      const res = await deleteNote(noteId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.replace(pathname, { scroll: false });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function onRestore(noteId: string) {
    setPending(true);
    setError(null);
    try {
      const res = await restoreNote(noteId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.replace(pathname, { scroll: false });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (loadError) {
    return <AlertBanner variant="error">Notizen konnten nicht geladen werden: {loadError}</AlertBanner>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={PRODUCT_LABEL.notizen}
        description={PRODUCT_COPY.notizenPageDescription}
        actions={
          <Button type="button" onClick={() => beginCreate()}>
            {PRODUCT_COPY.plusMenuNotiz}
          </Button>
        }
      />

      <TableShell>
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-leif-divider bg-leif-divider/60">
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-leif-muted">
                Titel
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-leif-muted">Typ</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-leif-muted">
                Beschreibung
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-leif-muted">
                Aktualisiert
              </th>
              <th className="w-12 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-leif-muted">
                Aktion
              </th>
            </tr>
          </thead>
          <tbody>
            {notes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-leif-muted">
                  Noch keine Notizen.
                </td>
              </tr>
            ) : (
              notes.map((n) => (
                <tr
                  key={n.id}
                  className="cursor-pointer border-b border-leif-divider transition-colors last:border-0 hover:bg-leif-divider/50"
                  onClick={() => beginEdit(n)}
                >
                  <td className="max-w-md px-4 py-3 text-leif-text">{clip(n.title || "Ohne Titel", 100)}</td>
                  <td className="px-4 py-3 text-leif-secondary">{typeLabel(n.type)}</td>
                  <td className="px-4 py-3 text-leif-secondary">{clip(n.description ?? "—", 80)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-leif-muted">{formatWhen(n.updated_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={(event) => {
                        event.stopPropagation();
                        void onQuickDelete(n.id);
                      }}
                      className="inline-flex size-7 items-center justify-center rounded-md border border-leif-border/80 text-leif-muted transition-colors hover:bg-leif-divider/60 hover:text-leif-text disabled:opacity-60"
                      aria-label="Notiz löschen"
                      title="Notiz löschen"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>

      <div className="rounded-lg border border-leif-border bg-white px-4 py-3">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-leif-secondary"
          onClick={() => setDeletedOpen((open) => !open)}
          aria-expanded={deletedOpen}
        >
          <span>Gelöschte Notizen ({deletedNotes.length})</span>
          <ChevronDown className={`size-4 transition-transform ${deletedOpen ? "rotate-180" : ""}`} />
        </button>
        {deletedOpen ? (
          deletedNotes.length === 0 ? (
            <p className="pt-3 text-sm text-leif-muted">Keine gelöschten Notizen.</p>
          ) : (
            <ul className="mt-3 divide-y divide-leif-divider border-t border-leif-divider">
              {deletedNotes.map((n) => (
                <li key={n.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm text-leif-text">{clip(n.content, 120)}</p>
                    <p className="mt-1 text-xs text-leif-muted">Gelöscht/aktualisiert: {formatWhen(n.updated_at)}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => void onRestore(n.id)}
                  >
                    Wiederherstellen
                  </Button>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>

      <dialog
        ref={dialogRef}
        className="w-[min(36rem,calc(100vw-2rem))] max-h-[min(90vh,40rem)] overflow-hidden rounded-[12px] border border-leif-border bg-leif-surface p-0 text-leif-text shadow-leif [&::backdrop]:bg-black/25"
        onClose={closeDialog}
      >
        <form id={formId} className="flex max-h-[min(90vh,40rem)] flex-col">
          <header className="border-b border-leif-divider px-6 py-4">
            <h2 className="text-base font-semibold text-leif-text">
              {editing ? `${PRODUCT_LABEL.notiz} bearbeiten` : PRODUCT_COPY.plusMenuNotiz}
            </h2>
          </header>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
            {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
            {!editing && sourceSparringChatId ? (
              <p className="text-[12px] text-leif-muted">{PRODUCT_COPY.notizFromKiHint}</p>
            ) : null}
            <NoteEditor
              value={draft}
              pending={pending}
              error={error}
              onChange={setDraft}
              projects={projects}
              onSave={() => void onSubmit()}
              onCancel={() => dialogRef.current?.close()}
              titleAutoFocus
            />
          </div>
          <footer className="flex flex-wrap justify-between gap-2 border-t border-leif-divider px-6 py-4">
            <div>
              {editing ? (
                <Button type="button" variant="danger" disabled={pending} onClick={() => void onDelete()}>
                  Löschen
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()}>
                Abbrechen
              </Button>
            </div>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
