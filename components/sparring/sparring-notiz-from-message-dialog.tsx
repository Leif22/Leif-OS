"use client";

import { loadSparringNotizPrefillForMessage } from "@/app/(app)/sparring/actions";
import { createNote, type NoteFormInput } from "@/app/(app)/notizen/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { controlClass, textareaClass } from "@/components/ui/control-styles";
import type { NoteType } from "@/lib/notes/types";
import { PRODUCT_COPY, PRODUCT_LABEL } from "@/lib/product-labels";
import type { AreaRow } from "@/lib/tasks/types";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

type Props = {
  messageId: string | null;
  areas: AreaRow[];
  onClose: () => void;
  onLoadError: (message: string) => void;
};

export function SparringNotizFromMessageDialog({ messageId, areas, onClose, onLoadError }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [type, setType] = useState<NoteType>("note");
  const [areaId, setAreaId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const handlersRef = useRef({ onClose, onLoadError });
  handlersRef.current = { onClose, onLoadError };

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
      setContent("");
      setAreaId("");
      setError(null);
      return;
    }
    let cancelled = false;
    setChatId(null);
    setContent("");
    setAreaId("");
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
      setContent(res.prefill.content);
      setType("note");
      setAreaId("");
      setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [messageId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!chatId) return;
    setError(null);
    const input: NoteFormInput = {
      content,
      type,
      area_id: areaId.trim() ? areaId : null,
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
        <form id={formId} onSubmit={(e) => void onSubmit(e)} className="flex max-h-[min(90vh,40rem)] flex-col">
          <header className="border-b border-leif-divider px-6 py-4">
            <h2 className="text-base font-semibold text-leif-text">{PRODUCT_COPY.plusMenuNotiz}</h2>
            {chatId ? <p className="mt-1 text-[12px] text-leif-muted">{PRODUCT_COPY.notizFromKiHint}</p> : null}
          </header>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
            {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
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
          <footer className="flex justify-end gap-2 border-t border-leif-divider px-6 py-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => dialogRef.current?.close()}
              disabled={pending}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={pending}>
              Speichern
            </Button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
