"use client";

import { createNote, deleteNote, updateNote, type NoteFormInput } from "@/app/(app)/notizen/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { controlClass, textareaClass } from "@/components/ui/control-styles";
import { PageHeader } from "@/components/ui/page-header";
import { TableShell } from "@/components/ui/table-shell";
import type { NoteListItem, NoteType } from "@/lib/notes/types";
import { PRODUCT_COPY, PRODUCT_LABEL } from "@/lib/product-labels";
import type { SparringNotizPrefill } from "@/lib/sparring/note-prefill";
import type { AreaRow } from "@/lib/tasks/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

type Props = {
  notes: NoteListItem[];
  areas: AreaRow[];
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

function typeLabel(t: NoteType): string {
  return t === "draft" ? "Entwurf" : "Notiz";
}

export function NotizenPageClient({
  notes,
  areas,
  loadError,
  initialDialog,
  initialNoteId,
  initialAreaPrefill,
  sparringNotizDraft,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formId = useId();
  const openedFromUrl = useRef(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NoteListItem | null>(null);
  const [content, setContent] = useState("");
  const [type, setType] = useState<NoteType>("note");
  const [areaId, setAreaId] = useState<string>("");
  const [sourceSparringChatId, setSourceSparringChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
    areaId?: string;
    content?: string;
    sourceSparringChatId?: string | null;
  }) {
    setEditing(null);
    setContent(opts?.content ?? "");
    setType("note");
    setAreaId(opts?.areaId ?? "");
    setSourceSparringChatId(opts?.sourceSparringChatId?.trim() || null);
    setError(null);
    setModalOpen(true);
  }

  function beginEdit(n: NoteListItem) {
    setEditing(n);
    setContent(n.content);
    setType(n.type);
    setAreaId(n.area_id ?? "");
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const input: NoteFormInput = {
      content,
      type,
      area_id: areaId.trim() ? areaId : null,
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
                Auszug
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-leif-muted">Typ</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-leif-muted">
                {PRODUCT_LABEL.lebensbereich}
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-leif-muted">
                Aktualisiert
              </th>
            </tr>
          </thead>
          <tbody>
            {notes.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-leif-muted">
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
                  <td className="max-w-md px-4 py-3 text-leif-text">{clip(n.content, 100)}</td>
                  <td className="px-4 py-3 text-leif-secondary">{typeLabel(n.type)}</td>
                  <td className="px-4 py-3 text-leif-secondary">{n.area_name ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-leif-muted">{formatWhen(n.updated_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>

      <dialog
        ref={dialogRef}
        className="w-[min(36rem,calc(100vw-2rem))] max-h-[min(90vh,40rem)] overflow-hidden rounded-[12px] border border-leif-border bg-leif-surface p-0 text-leif-text shadow-leif [&::backdrop]:bg-black/25"
        onClose={closeDialog}
      >
        <form id={formId} onSubmit={(e) => void onSubmit(e)} className="flex max-h-[min(90vh,40rem)] flex-col">
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
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-leif-secondary">Inhalt</span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                required
                className={textareaClass}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-leif-secondary">Typ</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as NoteType)}
                className={controlClass}
              >
                <option value="note">{PRODUCT_LABEL.notiz}</option>
                <option value="draft">Entwurf</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-leif-secondary">{PRODUCT_COPY.notizAreaOptional}</span>
              <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className={controlClass}>
                <option value="">—</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
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
              <Button type="submit" disabled={pending}>
                Speichern
              </Button>
            </div>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
