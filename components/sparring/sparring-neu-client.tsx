"use client";

import { createSparringChatWithFirstMessage } from "@/app/(app)/sparring/actions";
import { SparringAttachmentFields } from "@/components/sparring/sparring-attachment-fields";
import { SparringModelToggle } from "@/components/sparring/sparring-model-toggle";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { textareaClass } from "@/components/ui/control-styles";
import type { AiModelKey } from "@/lib/ai/config";
import type { DocumentListItem } from "@/lib/documents/types";
import { PRODUCT_COPY } from "@/lib/product-labels";
import { stashPendingAssistantWarning } from "@/lib/sparring/pending-assistant-warning";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

type Props = {
  documents: DocumentListItem[];
};

export function SparringNeuClient({ documents }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [linkedDocumentId, setLinkedDocumentId] = useState<string | null>(null);
  const [pickedFileLabel, setPickedFileLabel] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<AiModelKey>("default");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const hasAttachment = Boolean(linkedDocumentId) || Boolean(pickedFileLabel);

  function onFirstMessageKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter") return;
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    if (pending || (!text.trim() && !hasAttachment)) return;
    formRef.current?.requestSubmit();
  }

  function goToOverview() {
    router.push("/sparring");
    router.refresh();
  }

  function onBackToOverview() {
    const draft = text.trim();
    const msg = draft ? PRODUCT_COPY.kiNeuAbbrauchMitText : PRODUCT_COPY.kiLeaveNeuConfirm;
    if (!window.confirm(msg)) return;
    goToOverview();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("content", text);
      fd.set("modelKey", aiModel);
      if (linkedDocumentId) fd.set("documentId", linkedDocumentId);
      const f = fileInputRef.current?.files?.[0];
      if (f) fd.set("attachment", f);

      const res = await createSparringChatWithFirstMessage(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.assistantWarning) stashPendingAssistantWarning(res.id, res.assistantWarning);
      router.replace(`/sparring/${res.id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBackToOverview}
        className="text-sm font-medium text-leif-secondary underline-offset-4 transition-colors hover:text-leif-text"
      >
        ← Zur Übersicht
      </button>

      {error ? <AlertBanner variant="warning">{error}</AlertBanner> : null}

      <p className="max-w-prose text-sm leading-relaxed text-leif-secondary">{PRODUCT_COPY.kiNeuDescription}</p>

      <form ref={formRef} onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <SparringModelToggle value={aiModel} onChange={setAiModel} disabled={pending} />
        <SparringAttachmentFields
          documents={documents}
          documentId={linkedDocumentId}
          onDocumentId={(id) => {
            setLinkedDocumentId(id);
            if (id && fileInputRef.current) {
              fileInputRef.current.value = "";
              setPickedFileLabel(null);
            }
          }}
          fileInputRef={fileInputRef}
          onFileChange={(file) => {
            setPickedFileLabel(file?.name ?? null);
            if (file) setLinkedDocumentId(null);
          }}
          pickedFileLabel={pickedFileLabel}
          disabled={pending}
        />
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-leif-secondary">Erste Nachricht</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onFirstMessageKeyDown}
            rows={6}
            className={textareaClass}
            placeholder="Gedanken, Stichpunkte, Fragen … (bei Anhang kann die Zeile leer bleiben)"
          />
          <span className="text-[12px] text-leif-muted">
            Enter senden · Umschalt+Enter oder Strg+Enter neue Zeile
          </span>
        </label>
        <Button type="submit" disabled={pending || (!text.trim() && !hasAttachment)}>
          {pending ? "Speichern…" : PRODUCT_COPY.kiNeuSubmit}
        </Button>
      </form>
    </div>
  );
}
