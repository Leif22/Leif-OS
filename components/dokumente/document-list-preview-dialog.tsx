"use client";

import { getDocumentDownloadUrl, updateDocumentMeta } from "@/app/(app)/dokumente/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { controlClass, textareaClass } from "@/components/ui/control-styles";
import type { DocumentListItem } from "@/lib/documents/types";
import { ExternalLink, Maximize2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

function previewKind(doc: DocumentListItem): "image" | "pdf" | "text" | "video" | "audio" | "none" {
  const m = doc.mime_type.toLowerCase();
  const name = doc.original_filename.toLowerCase();
  if (m.startsWith("image/") && !m.includes("svg")) return "image";
  if (m === "application/pdf" || m.endsWith("/pdf") || name.endsWith(".pdf")) return "pdf";
  if (m.startsWith("text/")) return "text";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  return "none";
}

type Props = {
  doc: DocumentListItem;
  onClose: () => void;
  onSaved: () => void;
};

const TEXT_PREVIEW_MAX = 500000;

export function DocumentListPreviewDialog({ doc, onClose, onSaved }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formId = useId();
  const [title, setTitle] = useState(doc.title);
  const [description, setDescription] = useState(doc.description ?? "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(true);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const kind = previewKind(doc);

  useEffect(() => {
    const el = dialogRef.current;
    if (el && !el.open) el.showModal();

    let cancelled = false;
    setTitle(doc.title);
    setDescription(doc.description ?? "");
    setUrlLoading(true);
    setUrlError(null);
    setPreviewUrl(null);
    setTextContent(null);
    setTextLoading(false);

    void (async () => {
      const r = await getDocumentDownloadUrl(doc.id);
      if (cancelled) return;
      if (!r.ok) {
        setUrlError(r.error);
        setUrlLoading(false);
        return;
      }
      setPreviewUrl(r.url);
      setUrlLoading(false);

      if (previewKind(doc) === "text") {
        setTextLoading(true);
        try {
          const res = await fetch(r.url);
          const t = await res.text();
          if (!cancelled) {
            setTextContent(
              t.length > TEXT_PREVIEW_MAX ? `${t.slice(0, TEXT_PREVIEW_MAX)}\n\n… (gekürzt)` : t,
            );
          }
        } catch {
          if (!cancelled) setTextContent(null);
        } finally {
          if (!cancelled) setTextLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [doc.id, doc.title, doc.description, doc.mime_type, doc.original_filename]);

  function handleDialogClose() {
    onClose();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      const res = await updateDocumentMeta(doc.id, {
        title,
        description: description.trim() || null,
      });
      if (!res.ok) {
        setSaveError(res.error);
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[100] m-0 flex max-h-[100dvh] w-full max-w-none cursor-default items-center justify-center border-0 bg-transparent p-3 sm:p-4 [&::backdrop]:bg-black/35"
      onClose={handleDialogClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) dialogRef.current?.close();
      }}
    >
      <div
        className="flex max-h-[min(92vh,720px)] w-[min(96vw,56rem)] max-w-full cursor-auto flex-col overflow-hidden rounded-[12px] border border-leif-border bg-leif-surface text-leif-text shadow-leif"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-leif-divider px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold text-leif-text">{title}</h2>
            <p className="mt-0.5 truncate text-[12px] text-leif-muted">
              {doc.original_filename} · {doc.mime_type}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 shrink-0 gap-0 p-0"
              disabled={urlLoading || !previewUrl || !!urlError}
              title="In neuem Browser-Tab in voller Größe"
              aria-label="In neuem Tab in voller Größe"
              onClick={() => {
                if (previewUrl) window.open(previewUrl, "_blank", "noopener,noreferrer");
              }}
            >
              <Maximize2 className="size-4" aria-hidden />
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => dialogRef.current?.close()}>
              Schließen
            </Button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_min(100%,280px)] lg:divide-x lg:divide-leif-divider">
          <div className="min-h-[200px] overflow-auto bg-[#F4F6F9] p-3 sm:min-h-[280px] sm:p-4 lg:min-h-[320px]">
            {urlLoading ? (
              <p className="text-sm text-leif-secondary">Vorschau wird geladen…</p>
            ) : urlError ? (
              <AlertBanner variant="error">{urlError}</AlertBanner>
            ) : !previewUrl ? (
              <p className="text-sm text-leif-secondary">Keine Vorschau-URL.</p>
            ) : kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt=""
                className="mx-auto max-h-[min(55vh,480px)] w-auto max-w-full rounded-[8px] border border-leif-border object-contain shadow-sm"
              />
            ) : kind === "pdf" ? (
              <iframe
                title="PDF-Vorschau"
                src={previewUrl}
                className="h-[min(55vh,480px)] w-full rounded-[8px] border border-leif-border bg-white"
              />
            ) : kind === "text" ? (
              textLoading ? (
                <p className="text-sm text-leif-secondary">Text wird geladen…</p>
              ) : textContent != null ? (
                <pre className="max-h-[min(55vh,480px)] overflow-auto whitespace-pre-wrap break-words rounded-[8px] border border-leif-border bg-white p-3 text-[13px] leading-relaxed text-leif-text">
                  {textContent}
                </pre>
              ) : (
                <div className="space-y-3 rounded-[8px] border border-dashed border-leif-border bg-white p-4 text-[13px] text-leif-secondary">
                  <p>Text konnte nicht geladen werden.</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
                  >
                    In neuem Tab öffnen
                  </Button>
                </div>
              )
            ) : kind === "video" ? (
              <video
                src={previewUrl}
                controls
                className="mx-auto max-h-[min(55vh,480px)] w-full max-w-full rounded-[8px] border border-leif-border bg-black"
              />
            ) : kind === "audio" ? (
              <div className="rounded-[8px] border border-leif-border bg-white p-4">
                <audio src={previewUrl} controls className="w-full" />
              </div>
            ) : (
              <div className="space-y-3 rounded-[8px] border border-dashed border-leif-border bg-white p-4 text-[13px] text-leif-secondary">
                <p>Für diesen Dateityp gibt es keine eingebettete Vorschau.</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
                >
                  Datei in neuem Tab öffnen
                </Button>
              </div>
            )}
          </div>

          <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto border-t border-leif-divider p-4 lg:border-t-0">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-leif-muted">Bearbeiten</h3>
            {saveError ? <AlertBanner variant="error">{saveError}</AlertBanner> : null}
            <form id={formId} onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3">
              <label className="block text-sm font-medium text-leif-secondary">
                Titel
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className={`${controlClass} mt-1.5`}
                />
              </label>
              <label className="block text-sm font-medium text-leif-secondary">
                Beschreibung
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className={`${textareaClass} mt-1.5`}
                />
              </label>
            </form>
            <div className="mt-auto flex flex-col gap-2 border-t border-leif-divider pt-3">
              <Button type="submit" form={formId} variant="primary" size="sm" disabled={saving}>
                {saving ? "Speichern…" : "Speichern"}
              </Button>
              <Link
                href={`/dokumente/${doc.id}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-[8px] border border-leif-border bg-white px-3 py-2 text-center text-sm font-medium text-leif-secondary transition-colors hover:bg-[#F8FAFC] hover:text-leif-text"
              >
                Verknüpfungen & Details
                <ExternalLink className="size-3.5 shrink-0 opacity-70" aria-hidden />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </dialog>
  );
}

