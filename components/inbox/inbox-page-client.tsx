"use client";

import {
  createTaskFromInbox,
  discardInboxItem,
  markInboxItemRead,
  type CreateTaskFromInboxInput,
} from "@/app/(app)/inbox/actions";
import type { InboxListItem } from "@/lib/inbox/types";
import type { AreaRow } from "@/lib/tasks/types";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function defaultTitleFromContent(content: string): string {
  const line = content.split("\n")[0]?.trim() ?? "";
  const base = line || content.trim();
  return base.length > 200 ? `${base.slice(0, 197)}…` : base;
}

function metadataPreview(meta: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) return "—";
  try {
    return JSON.stringify(meta);
  } catch {
    return "—";
  }
}

type Props = {
  pending: InboxListItem[];
  closed: InboxListItem[];
  areas: AreaRow[];
  errors: { pending: string | null; closed: string | null };
};

export function InboxPageClient({ pending, closed, areas, errors }: Props) {
  const router = useRouter();
  const [showClosed, setShowClosed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [taskDialogItem, setTaskDialogItem] = useState<InboxListItem | null>(null);
  const taskDialogRef = useRef<HTMLDialogElement>(null);
  const taskFormId = useId();

  useEffect(() => {
    const el = taskDialogRef.current;
    if (!el) return;
    if (taskDialogItem) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [taskDialogItem]);

  async function run(
    id: string,
    fn: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>,
  ) {
    setActionError(null);
    setBusyId(id);
    try {
      const res = await fn(id);
      if (!res.ok) setActionError(res.error ?? "Fehler");
      else router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function submitTaskFromInbox(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!taskDialogItem) return;
    const fd = new FormData(e.currentTarget);
    const input: CreateTaskFromInboxInput = {
      inbox_item_id: taskDialogItem.id,
      title: String(fd.get("title") ?? ""),
      area_id: String(fd.get("area_id") ?? ""),
    };
    setActionError(null);
    setBusyId(taskDialogItem.id);
    try {
      const res = await createTaskFromInbox(input);
      if (!res.ok) {
        setActionError(res.error);
        return;
      }
      setTaskDialogItem(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>

      {actionError ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {actionError}
        </p>
      ) : null}

      <section className="space-y-3" aria-labelledby="inbox-pending-heading">
        <h2 id="inbox-pending-heading" className="text-lg font-semibold tracking-tight">
          Offene Eingänge
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Alle Einträge mit Status „pending“ – unabhängig vom Gelesen-Status (Implementation-Map §3.1).
        </p>

        {errors.pending ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
            {errors.pending}
          </p>
        ) : null}

        {!errors.pending && pending.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
            Keine offenen Inbox-Einträge.
          </p>
        ) : null}

        {!errors.pending && pending.length > 0 ? (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {pending.map((item) => (
              <li key={item.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">
                      {item.content}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                      <span>Quelle: {item.source}</span>
                      {item.source_ref ? <span>· {item.source_ref}</span> : null}
                      <span>· {formatWhen(item.created_at)}</span>
                      <span
                        className={
                          item.is_read
                            ? "rounded bg-zinc-200 px-1.5 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            : "rounded bg-amber-100 px-1.5 py-0.5 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                        }
                      >
                        {item.is_read ? "Gelesen" : "Ungelesen"}
                      </span>
                    </div>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-zinc-600 dark:text-zinc-400">
                        Metadaten
                      </summary>
                      <pre className="mt-1 max-h-32 overflow-auto rounded bg-zinc-100 p-2 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        {metadataPreview(item.metadata)}
                      </pre>
                    </details>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === item.id || item.is_read}
                    onClick={() => run(item.id, (id) => markInboxItemRead(id))}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-900"
                  >
                    {busyId === item.id ? "…" : "Als gelesen markieren"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.id || areas.length === 0}
                    onClick={() => setTaskDialogItem(item)}
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                  >
                    Als Task anlegen
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => run(item.id, (id) => discardInboxItem(id))}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                  >
                    Verwerfen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-3" aria-labelledby="inbox-closed-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="inbox-closed-heading" className="text-lg font-semibold tracking-tight">
            Verarbeitet & verworfen
          </h2>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={showClosed}
              onChange={(e) => setShowClosed(e.target.checked)}
              className="rounded border-zinc-400"
            />
            Anzeigen
          </label>
        </div>

        {errors.closed ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
            {errors.closed}
          </p>
        ) : null}

        {showClosed && !errors.closed && closed.length === 0 ? (
          <p className="text-sm text-zinc-500">Keine verarbeiteten oder verworfenen Einträge.</p>
        ) : null}

        {showClosed && !errors.closed && closed.length > 0 ? (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {closed.map((item) => (
              <li key={item.id} className="p-4">
                <p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
                  {item.content}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  {item.status === "discarded" ? "Verworfen" : "Verarbeitet"}
                  {item.processed_as ? ` · ${item.processed_as}` : ""}
                  {item.processed_ref_id ? ` · Ref: ${item.processed_ref_id.slice(0, 8)}…` : ""}
                  <span className="mx-1">·</span>
                  {formatWhen(item.updated_at)}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <dialog
        ref={taskDialogRef}
        className="w-[min(100vw-2rem,28rem)] rounded-lg border border-zinc-200 bg-background p-0 text-foreground shadow-xl dark:border-zinc-800 [&::backdrop]:bg-zinc-950/50"
        onClose={() => setTaskDialogItem(null)}
      >
        {taskDialogItem ? (
          <div className="flex flex-col">
            <header className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h3 className="text-base font-semibold">Task aus Inbox</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Der Task startet mit Status „Inbox“; der Eingang wird als verarbeitet markiert.
              </p>
            </header>
            <form
              id={taskFormId}
              key={taskDialogItem.id}
              onSubmit={submitTaskFromInbox}
              className="space-y-3 p-4"
            >
              <label className="block text-sm font-medium">
                Titel
                <input
                  name="title"
                  type="text"
                  required
                  defaultValue={defaultTitleFromContent(taskDialogItem.content)}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
              <label className="block text-sm font-medium">
                Bereich
                <select
                  name="area_id"
                  required
                  defaultValue={areas[0]?.id ?? ""}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            </form>
            <footer className="flex justify-end gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <button
                type="button"
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
                onClick={() => setTaskDialogItem(null)}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                form={taskFormId}
                disabled={busyId === taskDialogItem.id || areas.length === 0}
                className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {busyId === taskDialogItem.id ? "Speichern…" : "Anlegen"}
              </button>
            </footer>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
