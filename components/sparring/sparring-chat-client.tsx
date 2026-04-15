"use client";

import {
  appendSparringUserMessage,
  closeSparringChat,
  deleteSparringChat,
  setSparringChatAiModel,
} from "@/app/(app)/sparring/actions";
import { SparringAttachmentFields } from "@/components/sparring/sparring-attachment-fields";
import { SparringModelToggle } from "@/components/sparring/sparring-model-toggle";
import { SparringNotizFromMessageDialog } from "@/components/sparring/sparring-notiz-from-message-dialog";
import { SparringTaskFromMessageDialog } from "@/components/sparring/sparring-task-from-message-dialog";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { textareaClass } from "@/components/ui/control-styles";
import { PageHeader } from "@/components/ui/page-header";
import { StatusChip } from "@/components/ui/status-chip";
import { formatKiDeletedReadonly, PRODUCT_COPY, PRODUCT_LABEL } from "@/lib/product-labels";
import { takePendingAssistantWarning } from "@/lib/sparring/pending-assistant-warning";
import type { AiModelKey } from "@/lib/ai/config";
import type { DocumentListItem } from "@/lib/documents/types";
import type { SparringChatRow, SparringMessageRow } from "@/lib/sparring/types";
import type { AreaRow } from "@/lib/tasks/types";
import { DoorClosed, ListTodo, StickyNote } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

type Props = {
  chat: SparringChatRow;
  messages: SparringMessageRow[];
  loadError: string | null;
  areas: AreaRow[];
  documents: DocumentListItem[];
};

function displayTitle(c: SparringChatRow): string {
  return c.title.trim() || PRODUCT_COPY.kiUntitledChat;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

function AssistantMessageToolbar({
  disabled,
  onTask,
  onNotiz,
}: {
  disabled: boolean;
  onTask: () => void;
  onNotiz: () => void;
}) {
  const btnClass =
    "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-blue-200/80 bg-white text-blue-800 transition-colors hover:bg-blue-100 disabled:opacity-40";
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-blue-200/60 pt-2">
      <button
        type="button"
        className={btnClass}
        disabled={disabled}
        title="Task anlegen"
        aria-label="Task aus dieser KI-Antwort"
        onClick={onTask}
      >
        <ListTodo className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        className={btnClass}
        disabled={disabled}
        title="Notiz anlegen"
        aria-label="Notiz aus dieser KI-Antwort"
        onClick={onNotiz}
      >
        <StickyNote className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export function SparringChatClient({ chat, messages, loadError, areas, documents }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [linkedDocumentId, setLinkedDocumentId] = useState<string | null>(null);
  const [pickedFileLabel, setPickedFileLabel] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskFromMessageId, setTaskFromMessageId] = useState<string | null>(null);
  const [notizFromMessageId, setNotizFromMessageId] = useState<string | null>(null);
  const [modelSaving, setModelSaving] = useState(false);
  const sendFormRef = useRef<HTMLFormElement>(null);
  const isDeleted = Boolean(chat.deleted_at);

  useEffect(() => {
    const pending = takePendingAssistantWarning(chat.id);
    if (pending) setError(pending);
  }, [chat.id]);

  const hasAttachment = Boolean(linkedDocumentId) || Boolean(pickedFileLabel);

  function onMessageKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter") return;
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    if (pending || (!text.trim() && !hasAttachment) || !chat.is_open || isDeleted) return;
    sendFormRef.current?.requestSubmit();
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!chat.is_open || isDeleted) return;
    setError(null);
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("chatId", chat.id);
      fd.set("content", text);
      if (linkedDocumentId) fd.set("documentId", linkedDocumentId);
      const f = fileInputRef.current?.files?.[0];
      if (f) fd.set("attachment", f);

      const res = await appendSparringUserMessage(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.assistantWarning) setError(res.assistantWarning);
      setText("");
      setLinkedDocumentId(null);
      setPickedFileLabel(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function onCloseChat() {
    if (!window.confirm(PRODUCT_COPY.kiCloseConfirm)) return;
    setError(null);
    const res = await closeSparringChat(chat.id);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/sparring");
    router.refresh();
  }

  async function onBackToOverview() {
    setError(null);
    if (isDeleted) {
      router.push("/sparring");
      router.refresh();
      return;
    }
    const keep = window.confirm(PRODUCT_COPY.kiBackKeepConfirm);
    if (keep) {
      router.push("/sparring");
      router.refresh();
      return;
    }
    const res = await deleteSparringChat(chat.id);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/sparring");
    router.refresh();
  }

  const statusMeta = (
    <span className="flex flex-wrap items-center gap-2">
      {isDeleted ? (
        <StatusChip tone="danger">Gelöscht</StatusChip>
      ) : chat.is_open ? (
        <StatusChip tone="primary">Offen</StatusChip>
      ) : (
        <StatusChip tone="muted">Geschlossen</StatusChip>
      )}
      <StatusChip tone="neutral">Typ {chat.type}</StatusChip>
    </span>
  );

  const toolbarDisabled = !chat.is_open || isDeleted;

  async function onAiModelChange(next: AiModelKey) {
    if (next === chat.ai_model || toolbarDisabled || modelSaving) return;
    setError(null);
    setModelSaving(true);
    try {
      const res = await setSparringChatAiModel(chat.id, next);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    } finally {
      setModelSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {loadError ? <AlertBanner variant="error">{loadError}</AlertBanner> : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <button
            type="button"
            onClick={() => void onBackToOverview()}
            className="text-sm font-medium text-leif-secondary underline-offset-4 hover:text-leif-text"
          >
            ← {PRODUCT_LABEL.ki}
          </button>
          <PageHeader
            className="border-0 pb-0"
            title={displayTitle(chat)}
            description={undefined}
            actions={
              !isDeleted && chat.is_open ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-9 w-9 shrink-0 p-0"
                    title={PRODUCT_COPY.kiCloseListAria}
                    aria-label={PRODUCT_COPY.kiCloseListAria}
                    onClick={() => void onCloseChat()}
                  >
                    <DoorClosed className="h-4 w-4 shrink-0" aria-hidden />
                  </Button>
                </div>
              ) : null
            }
          />
          <div className="-mt-2">{statusMeta}</div>
        </div>
      </div>

      {error ? <AlertBanner variant="warning">{error}</AlertBanner> : null}

      <div className="space-y-4 rounded-[12px] border border-leif-border bg-white p-5 shadow-leif">
        <h2 className="text-sm font-semibold text-leif-text">Verlauf</h2>
        {messages.length === 0 ? (
          <p className="text-sm text-leif-muted">Noch keine Nachrichten.</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => {
              const isUser = m.role === "user";
              const isAssistant = m.role === "assistant";
              return (
                <li key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[min(100%,28rem)] rounded-[8px] border px-4 py-3 text-sm ${
                      isAssistant ? "border-blue-200 bg-blue-50/80" : "border-leif-border bg-leif-canvas"
                    }`}
                  >
                    <div
                      className={`mb-1 flex gap-2 text-[12px] text-leif-muted ${
                        isUser ? "flex-row-reverse justify-end" : "justify-between"
                      }`}
                    >
                      <span>{isAssistant ? "Assistent" : "Du"}</span>
                      <span className="tabular-nums">{formatTime(m.created_at)}</span>
                    </div>
                    <p className={`whitespace-pre-wrap text-leif-text ${isUser ? "text-right" : "text-left"}`}>
                      {m.content}
                    </p>
                    {isAssistant ? (
                      <AssistantMessageToolbar
                        disabled={toolbarDisabled}
                        onTask={() => setTaskFromMessageId(m.id)}
                        onNotiz={() => setNotizFromMessageId(m.id)}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isDeleted ? (
        <p className="text-sm text-leif-muted">{formatKiDeletedReadonly(PRODUCT_LABEL.ki)}</p>
      ) : chat.is_open ? (
        <form ref={sendFormRef} onSubmit={onSend} className="space-y-3">
          <SparringModelToggle
            value={chat.ai_model}
            onChange={(v) => void onAiModelChange(v)}
            disabled={toolbarDisabled || pending || modelSaving}
          />
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
            <span className="font-medium text-leif-secondary">Nachricht</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onMessageKeyDown}
              rows={4}
              className={textareaClass}
              placeholder="Gedanken, Stichpunkte, Fragen … (bei Anhang kann die Zeile leer bleiben)"
            />
            <span className="text-[12px] text-leif-muted">
              Enter senden · Umschalt+Enter oder Strg+Enter neue Zeile
            </span>
          </label>
          <Button type="submit" disabled={pending || (!text.trim() && !hasAttachment)}>
            {pending ? "Speichern…" : "Nachricht speichern"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-leif-muted">{PRODUCT_COPY.kiGeschlossenKeineNachrichten}</p>
      )}

      <SparringTaskFromMessageDialog
        messageId={taskFromMessageId}
        areas={areas}
        onClose={() => setTaskFromMessageId(null)}
        onLoadError={(msg) => setError(msg)}
      />
      <SparringNotizFromMessageDialog
        messageId={notizFromMessageId}
        areas={areas}
        onClose={() => setNotizFromMessageId(null)}
        onLoadError={(msg) => setError(msg)}
      />
    </div>
  );
}
