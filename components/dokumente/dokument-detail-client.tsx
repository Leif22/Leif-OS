"use client";

import {
  addDocumentAreaLink,
  addDocumentNoteLink,
  deleteDocument,
  getDocumentDownloadUrl,
  removeDocumentAreaLink,
  removeDocumentNoteLink,
} from "@/app/(app)/dokumente/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/control-styles";
import { PageHeader } from "@/components/ui/page-header";
import { SectionTitle } from "@/components/ui/page-header";
import type { DocumentWithLinks } from "@/lib/documents/types";
import { PRODUCT_LABEL } from "@/lib/product-labels";
import type { AreaRow } from "@/lib/tasks/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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
  doc: DocumentWithLinks;
  areas: AreaRow[];
  notes: { id: string; content: string; type: string }[];
};

export function DokumentDetailClient({ doc, areas, notes }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dlBusy, setDlBusy] = useState(false);

  const linkedAreaIds = useMemo(
    () => new Set(doc.document_area_links.map((l) => l.area_id)),
    [doc.document_area_links],
  );
  const linkedNoteIds = useMemo(
    () => new Set(doc.document_note_links.map((l) => l.note_id)),
    [doc.document_note_links],
  );
  const areasFree = areas.filter((a) => !linkedAreaIds.has(a.id));
  const notesFree = notes.filter((n) => !linkedNoteIds.has(n.id));

  async function onDownload() {
    setError(null);
    setDlBusy(true);
    try {
      const res = await getDocumentDownloadUrl(doc.id, { download: true });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    } finally {
      setDlBusy(false);
    }
  }

  async function onDelete() {
    if (!window.confirm("Dokument inkl. Datei wirklich löschen? Verknüpfungen werden entfernt.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await deleteDocument(doc.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/dokumente");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function pickArea(areaId: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await addDocumentAreaLink(doc.id, areaId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function pickNote(noteId: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await addDocumentNoteLink(doc.id, noteId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title={doc.title} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={dlBusy} onClick={() => void onDownload()}>
            {dlBusy ? "…" : "Herunterladen"}
          </Button>
          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void onDelete()}>
            Löschen
          </Button>
        </div>
      </div>

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <div className="rounded-[12px] border border-leif-border bg-white p-5 text-sm shadow-leif">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-leif-muted">Datei</dt>
            <dd className="mt-0.5 text-leif-text">{doc.original_filename}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-leif-muted">Typ / Größe</dt>
            <dd className="mt-0.5 text-leif-secondary">
              {doc.mime_type} · {formatBytes(doc.byte_size)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-leif-muted">Quelle</dt>
            <dd className="mt-0.5 text-leif-secondary">{doc.source}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-leif-muted">Erstellt</dt>
            <dd className="mt-0.5 text-leif-secondary">{formatWhen(doc.created_at)}</dd>
          </div>
        </dl>
        {doc.description ? (
          <p className="mt-4 whitespace-pre-wrap text-[13px] leading-relaxed text-leif-secondary">{doc.description}</p>
        ) : null}
        <p className="mt-4">
          <Link href="/dokumente" className="text-sm font-medium text-leif-secondary underline-offset-4 hover:underline">
            ← Alle Dokumente
          </Link>
        </p>
      </div>

      <section className="space-y-4" aria-labelledby="dok-links-heading">
        <SectionTitle id="dok-links-heading">Verknüpfungen</SectionTitle>
        <p className="text-[13px] text-leif-secondary">
          Mehrere Verknüpfungen pro Kategorie möglich. Über die Auswahlfelder weitere hinzufügen.
        </p>

        <div className="space-y-6 rounded-[12px] border border-leif-border bg-white p-5 shadow-leif">
          <div>
            <h3 className="text-sm font-semibold text-leif-text">{PRODUCT_LABEL.lebensbereiche}</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {doc.document_area_links.map((l) => {
                const name = l.areas?.name ?? l.area_id;
                return (
                  <li
                    key={l.area_id}
                    className="inline-flex items-center gap-1 rounded-full border border-leif-border bg-[#F8FAFC] px-2 py-1 text-[12px]"
                  >
                    <Link href={`/tasks?area=${encodeURIComponent(l.area_id)}`} className="text-leif-text hover:underline">
                      {name}
                    </Link>
                    <button
                      type="button"
                      className="text-leif-muted hover:text-leif-text"
                      disabled={busy}
                      aria-label="Verknüpfung entfernen"
                      onClick={() =>
                        void (async () => {
                          setBusy(true);
                          const r = await removeDocumentAreaLink(doc.id, l.area_id);
                          if (!r.ok) setError(r.error);
                          else router.refresh();
                          setBusy(false);
                        })()
                      }
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
            {areasFree.length ? (
              <label className="mt-3 block text-[13px] text-leif-secondary">
                Hinzufügen
                <select
                  className={`${controlClass} mt-1 max-w-md`}
                  defaultValue=""
                  disabled={busy}
                  onChange={(e) => {
                    const v = e.target.value;
                    e.target.value = "";
                    if (v) void pickArea(v);
                  }}
                >
                  <option value="">— {PRODUCT_LABEL.lebensbereich} wählen</option>
                  {areasFree.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-leif-text">{PRODUCT_LABEL.notizen}</h3>
            <ul className="mt-2 space-y-2">
              {doc.document_note_links.map((l) => {
                const line = l.notes?.content?.split("\n")[0]?.trim() ?? l.note_id;
                const clip = line.length > 100 ? `${line.slice(0, 97)}…` : line;
                return (
                  <li
                    key={l.note_id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-leif-border px-3 py-2 text-[13px]"
                  >
                    <Link href={`/notizen?note=${encodeURIComponent(l.note_id)}`} className="text-leif-text hover:underline">
                      {clip}
                    </Link>
                    <button
                      type="button"
                      className="text-sm text-leif-muted hover:text-leif-text"
                      disabled={busy}
                      onClick={() =>
                        void (async () => {
                          setBusy(true);
                          const r = await removeDocumentNoteLink(doc.id, l.note_id);
                          if (!r.ok) setError(r.error);
                          else router.refresh();
                          setBusy(false);
                        })()
                      }
                    >
                      Entfernen
                    </button>
                  </li>
                );
              })}
            </ul>
            {notesFree.length ? (
              <label className="mt-3 block text-[13px] text-leif-secondary">
                Hinzufügen
                <select
                  className={`${controlClass} mt-1 max-w-md`}
                  defaultValue=""
                  disabled={busy}
                  onChange={(e) => {
                    const v = e.target.value;
                    e.target.value = "";
                    if (v) void pickNote(v);
                  }}
                >
                  <option value="">— {PRODUCT_LABEL.notiz} wählen</option>
                  {notesFree.map((n) => {
                    const preview = (n.content.split("\n")[0] ?? n.content).trim().slice(0, 72);
                    return (
                      <option key={n.id} value={n.id}>
                        {preview || n.id}
                      </option>
                    );
                  })}
                </select>
              </label>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
