"use client";

import { markInboxItemRead } from "@/app/(app)/inbox/actions";
import type { DashboardInboxItem } from "@/lib/inbox/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

type Props = {
  items: DashboardInboxItem[];
  loadError: string | null;
};

export function DashboardInboxClient({ items, loadError }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleRead(id: string) {
    setActionError(null);
    setPendingId(id);
    try {
      const res = await markInboxItemRead(id);
      if (!res.ok) {
        setActionError(res.error);
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="space-y-3" aria-labelledby="dashboard-inbox-heading">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="dashboard-inbox-heading" className="text-lg font-semibold tracking-tight">
          Inbox <span className="font-normal text-zinc-500">(ungelesen)</span>
        </h2>
        <Link
          href="/inbox"
          className="text-sm text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          Zur Inbox-Seite
        </Link>
      </div>

      {loadError ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          Inbox konnte nicht geladen werden: {loadError}
        </p>
      ) : null}

      {actionError ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {actionError}
        </p>
      ) : null}

      {!loadError && items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
          Keine ungelesenen Inbox-Einträge.
        </p>
      ) : null}

      {!loadError && items.length > 0 ? (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">
                  {item.content}
                </p>
                <p className="text-xs text-zinc-500">
                  Quelle: {item.source}
                  {item.source_ref ? ` · ${item.source_ref}` : ""}
                  <span className="mx-1.5">·</span>
                  {formatWhen(item.created_at)}
                </p>
              </div>
              <button
                type="button"
                disabled={pendingId === item.id}
                onClick={() => handleRead(item.id)}
                className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-900"
              >
                {pendingId === item.id ? "…" : "Als gelesen markieren"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
