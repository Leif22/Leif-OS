"use client";

import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/control-styles";
import type { DocumentListItem } from "@/lib/documents/types";
import { FileUp, Link2 } from "lucide-react";
import type { RefObject } from "react";

export type SparringDocPick = Pick<DocumentListItem, "id" | "title" | "original_filename">;

type Props = {
  documents: SparringDocPick[];
  documentId: string | null;
  onDocumentId: (id: string | null) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (file: File | null) => void;
  pickedFileLabel: string | null;
  disabled: boolean;
};

export function SparringAttachmentFields({
  documents,
  documentId,
  onDocumentId,
  fileInputRef,
  onFileChange,
  pickedFileLabel,
  disabled,
}: Props) {
  const fileBlocked = Boolean(documentId);
  const docBlocked = Boolean(pickedFileLabel);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[min(100%,16rem)] flex-1 flex-col gap-1.5 text-sm">
          <span className="flex items-center gap-1.5 font-medium text-leif-secondary">
            <Link2 className="size-4 shrink-0 opacity-70" aria-hidden />
            Dokument aus Leif OS
          </span>
          <select
            className={controlClass}
            disabled={disabled || docBlocked}
            value={documentId ?? ""}
            onChange={(e) => onDocumentId(e.target.value ? e.target.value : null)}
          >
            <option value="">— keines —</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {(d.title || "").trim() || d.original_filename} ({d.original_filename})
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="flex items-center gap-1.5 font-medium text-leif-secondary">
            <FileUp className="size-4 shrink-0 opacity-70" aria-hidden />
            Datei vom Computer
          </span>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            disabled={disabled || fileBlocked}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              onFileChange(f);
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-10 max-w-full shrink-0 justify-start truncate px-3"
            disabled={disabled || fileBlocked}
            onClick={() => fileInputRef.current?.click()}
          >
            {pickedFileLabel ? pickedFileLabel : "Datei wählen…"}
          </Button>
        </div>
      </div>
      {pickedFileLabel ? (
        <button
          type="button"
          disabled={disabled}
          className="self-start text-xs font-medium text-leif-secondary underline-offset-4 hover:text-leif-text hover:underline disabled:opacity-50"
          onClick={() => {
            if (fileInputRef.current) fileInputRef.current.value = "";
            onFileChange(null);
          }}
        >
          Datei-Auswahl entfernen
        </button>
      ) : null}
      <p className="text-[12px] leading-snug text-leif-muted">
        PDF und Textdateien werden ausgelesen; Bilder (JPEG/PNG/GIF/WebP) werden der KI als Bild
        übergeben. Word/Excel ohne Textabruf — bitte als PDF exportieren oder kurz beschreiben.
      </p>
    </div>
  );
}
