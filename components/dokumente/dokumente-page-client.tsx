"use client";

import { createDocumentUpload } from "@/app/(app)/dokumente/actions";
import { DocumentListPreviewDialog } from "@/components/dokumente/document-list-preview-dialog";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { controlClass, textareaClass } from "@/components/ui/control-styles";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { TableShell } from "@/components/ui/table-shell";
import { PRODUCT_COPY, PRODUCT_LABEL } from "@/lib/product-labels";
import type { AreaRow } from "@/lib/tasks/types";
import { Files } from "lucide-react";
import type { DocumentListItem } from "@/lib/documents/types";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

type Props = {
  documents: DocumentListItem[];
  areas: AreaRow[];
  notes: { id: string; content: string; type: string }[];
  loadError: string | null;
  initialCreateOpen: boolean;
};

export function DokumentePageClient({
  documents,
  areas,
  notes,
  loadError,
  initialCreateOpen,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formId = useId();
  const [createOpen, setCreateOpen] = useState(initialCreateOpen);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selAreas, setSelAreas] = useState<Set<string>>(new Set());
  const [selNotes, setSelNotes] = useState<Set<string>>(new Set());
  const [previewDoc, setPreviewDoc] = useState<DocumentListItem | null>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (createOpen) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [createOpen]);

  useEffect(() => {
    if (initialCreateOpen) setCreateOpen(true);
  }, [initialCreateOpen]);

  const notePreview = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of notes) {
      const line = n.content.split("\n")[0]?.trim() ?? n.content.trim();
      m.set(n.id, line.length > 80 ? `${line.slice(0, 77)}…` : line);
    }
    return m;
  }, [notes]);

  async function onCreateSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setActionError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("area_ids", JSON.stringify([...selAreas]));
    fd.set("person_ids", "[]");
    fd.set("note_ids", JSON.stringify([...selNotes]));
    fd.set("result_ids", "[]");
    setPending(true);
    try {
      const res = await createDocumentUpload(fd);
      if (!res.ok) {
        setActionError(res.error);
        return;
      }
      setCreateOpen(false);
      setSelAreas(new Set());
      setSelNotes(new Set());
      e.currentTarget.reset();
      router.replace(pathname, { scroll: false });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title={PRODUCT_LABEL.dokumente}
          description={PRODUCT_COPY.dokumentePageDescription}
        />
        <Button type="button" variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          Dokument hochladen
        </Button>
      </div>

      {actionError ? <AlertBanner variant="error">{actionError}</AlertBanner> : null}
      {loadError ? <AlertBanner variant="error">{loadError}</AlertBanner> : null}

      {!loadError && documents.length === 0 ? (
        <EmptyState
          illustration={<Files className="size-10 text-leif-muted" aria-hidden />}
          title="Noch keine Dokumente"
          description="Lege Dateien an — per Telegram-Anhang in der Inbox oder hier per Upload. Verknüpfungen zu Bereichen und Notizen pflegst du auf der Dokumentenseite."
        />
      ) : null}

      {!loadError && documents.length > 0 ? (
        <section className="space-y-3" aria-labelledby="dok-list-heading">
          <SectionTitle id="dok-list-heading">Deine Dokumente</SectionTitle>
          <p className="text-[13px] text-leif-secondary">
            Zeile anklicken für Vorschau und Kurz-Bearbeitung — Verknüpfungen auf der Detailseite.
          </p>
          <TableShell>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-leif-divider bg-leif-divider/60">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-leif-muted">
                      Titel
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-leif-muted">
                      Datei
                    </th>
                    <th className="w-[6rem] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-leif-muted">
                      Größe
                    </th>
                    <th className="w-[9.5rem] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-leif-muted">
                      Erstellt
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => (
                    <tr
                      key={d.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`${d.title} anzeigen`}
                      className="cursor-pointer border-b border-leif-divider transition-colors duration-150 last:border-0 hover:bg-[#F8FAFC]/80 focus-visible:bg-[#F8FAFC]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-leif-primary/25"
                      onClick={() => setPreviewDoc(d)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setPreviewDoc(d);
                        }
                      }}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-leif-text">{d.title}</span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-leif-secondary">
                        <span className="text-leif-muted">{d.mime_type}</span>
                        <span className="mx-2 text-leif-border">·</span>
                        {d.original_filename}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[13px] text-leif-secondary">
                        {formatBytes(d.byte_size)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[13px] text-leif-secondary">
                        {formatWhen(d.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableShell>
        </section>
      ) : null}

      <dialog
        ref={dialogRef}
        className="w-[min(100vw-2rem,34rem)] max-h-[min(92vh,44rem)] overflow-hidden rounded-[12px] border border-leif-border bg-leif-surface p-0 text-leif-text shadow-leif [&::backdrop]:bg-black/25"
        onClose={() => setCreateOpen(false)}
      >
        <div className="flex max-h-[min(92vh,44rem)] flex-col">
          <header className="border-b border-leif-divider px-6 py-4">
            <h2 className="text-base font-semibold text-leif-text">Dokument hochladen</h2>
            <p className="mt-1 text-[12px] text-leif-muted">
              Datei wählen, Titel setzen — Verknüpfungen optional (mehrfach möglich).
            </p>
          </header>
          <form
            id={formId}
            onSubmit={(e) => void onCreateSubmit(e)}
            className="flex flex-1 flex-col gap-4 overflow-y-auto p-6"
          >
            <label className="block text-sm font-medium text-leif-secondary">
              Datei
              <input name="file" type="file" required className={`${controlClass} mt-2`} />
            </label>
            <label className="block text-sm font-medium text-leif-secondary">
              Titel
              <input name="title" type="text" required className={`${controlClass} mt-2`} />
            </label>
            <label className="block text-sm font-medium text-leif-secondary">
              Beschreibung (optional)
              <textarea name="description" rows={3} className={`${textareaClass} mt-2`} />
            </label>

            <fieldset className="space-y-2 rounded-[8px] border border-leif-border bg-[#FAFBFC] p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-leif-muted">
                Verknüpfungen (optional)
              </legend>
              <p className="text-[12px] text-leif-secondary">
                Mehrere Einträge pro Kategorie möglich. Auswahl per Klick umschalten.
              </p>
              <div className="grid max-h-40 gap-2 overflow-y-auto text-[13px] sm:grid-cols-2">
                <div>
                  <p className="mb-1 font-medium text-leif-secondary">{PRODUCT_LABEL.lebensbereiche}</p>
                  <ul className="space-y-1">
                    {areas.map((a) => (
                      <li key={a.id}>
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selAreas.has(a.id)}
                            onChange={() =>
                              setSelAreas((prev) => {
                                const n = new Set(prev);
                                if (n.has(a.id)) n.delete(a.id);
                                else n.add(a.id);
                                return n;
                              })
                            }
                            className="size-4 rounded border-leif-border"
                          />
                          <span>{a.name}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 font-medium text-leif-secondary">{PRODUCT_LABEL.notizen}</p>
                  <ul className="max-h-32 space-y-1 overflow-y-auto">
                    {notes.map((n) => (
                      <li key={n.id}>
                        <label className="flex cursor-pointer items-start gap-2">
                          <input
                            type="checkbox"
                            checked={selNotes.has(n.id)}
                            onChange={() =>
                              setSelNotes((prev) => {
                                const s = new Set(prev);
                                if (s.has(n.id)) s.delete(n.id);
                                else s.add(n.id);
                                return s;
                              })
                            }
                            className="mt-0.5 size-4 rounded border-leif-border"
                          />
                          <span className="text-leif-text">{notePreview.get(n.id) ?? n.id}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </fieldset>
          </form>
          <footer className="flex justify-end gap-2 border-t border-leif-divider px-6 py-4">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" form={formId} variant="primary" disabled={pending}>
              {pending ? "Speichern…" : "Speichern"}
            </Button>
          </footer>
        </div>
      </dialog>

      {previewDoc ? (
        <DocumentListPreviewDialog
          key={previewDoc.id}
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onSaved={() => {
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
