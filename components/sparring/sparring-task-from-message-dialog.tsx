"use client";

import { loadSparringTaskDraftForMessage } from "@/app/(app)/sparring/actions";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { Button } from "@/components/ui/button";
import type { SparringTaskDraft } from "@/lib/sparring/task-draft";
import type { AreaRow } from "@/lib/tasks/types";
import { useEffect, useRef, useState } from "react";

type Props = {
  messageId: string | null;
  areas: AreaRow[];
  onClose: () => void;
  onLoadError: (message: string) => void;
};

export function SparringTaskFromMessageDialog({ messageId, areas, onClose, onLoadError }: Props) {
  const [draft, setDraft] = useState<SparringTaskDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const handlersRef = useRef({ onClose, onLoadError });
  handlersRef.current = { onClose, onLoadError };

  useEffect(() => {
    if (!messageId) {
      setDraft(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setDraft(null);
    setLoading(true);
    void loadSparringTaskDraftForMessage(messageId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        handlersRef.current.onLoadError(res.error);
        handlersRef.current.onClose();
        return;
      }
      setDraft(res.draft);
    });
    return () => {
      cancelled = true;
    };
  }, [messageId]);

  const showForm = Boolean(messageId && draft && !loading);

  return (
    <>
      {messageId && loading ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/25 p-4">
          <div className="flex max-w-sm flex-col gap-4 rounded-[12px] border border-leif-border bg-leif-surface p-6 shadow-leif">
            <p className="text-sm text-leif-text">Task-Vorlage wird erstellt …</p>
            <Button type="button" variant="secondary" onClick={onClose}>
              Abbrechen
            </Button>
          </div>
        </div>
      ) : null}

      <TaskFormDialog
        open={showForm}
        mode="create"
        task={null}
        areas={areas}
        onClose={onClose}
        sparringCreateContext={draft}
        initialCreateAreaId={null}
      />
    </>
  );
}
