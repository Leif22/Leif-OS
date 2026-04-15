"use client";

import { closeSparringChat, deleteSparringChat } from "@/app/(app)/sparring/actions";
import { TrashIcon } from "@/components/sparring/trash-icon";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/control-styles";
import { StatusChip, type StatusChipTone } from "@/components/ui/status-chip";
import { TableShell } from "@/components/ui/table-shell";
import { PRODUCT_COPY, PRODUCT_LABEL } from "@/lib/product-labels";
import { SPARRING_LIST_VIEW_OPTIONS, type SparringListView } from "@/lib/sparring/list-view";
import type { SparringChatRow } from "@/lib/sparring/types";
import { DoorClosed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";

type Props = {
  chats: SparringChatRow[];
  loadError: string | null;
  listView: SparringListView;
};

function typeLabel(t: string): string {
  if (t === "context") return "Kontext";
  if (t === "project") return "Unterthema";
  return "Frei";
}

function displayTitle(c: SparringChatRow): string {
  return c.title.trim() || PRODUCT_COPY.kiUntitledChat;
}

function formatUpdated(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

function statusTone(c: SparringChatRow): StatusChipTone {
  if (c.deleted_at) return "danger";
  if (c.is_open) return "primary";
  return "muted";
}

function statusLabel(c: SparringChatRow): string {
  if (c.deleted_at) return "Gelöscht";
  if (c.is_open) return "Offen";
  return "Geschlossen";
}

function emptyHint(view: SparringListView): string {
  const w = PRODUCT_LABEL.ki;
  switch (view) {
    case "offen":
      return PRODUCT_COPY.kiListEmptyOffen(w);
    case "alle_aktiven":
      return PRODUCT_COPY.kiListEmptyAktiv(w);
    case "geloescht":
      return PRODUCT_COPY.kiListEmptyGeloescht(w);
    case "alle":
    default:
      return PRODUCT_COPY.kiListEmptyAlle(w);
  }
}

export function SparringPageClient({ chats, loadError, listView }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function onFilterChange(next: SparringListView) {
    setActionError(null);
    const q = next === "offen" ? "" : `?filter=${encodeURIComponent(next)}`;
    router.replace(`/sparring${q}`);
  }

  async function onCloseRow(id: string, e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (!window.confirm(PRODUCT_COPY.kiCloseConfirm)) return;
    setActionError(null);
    setClosingId(id);
    try {
      const res = await closeSparringChat(id);
      if (!res.ok) {
        setActionError(res.error);
        return;
      }
      router.refresh();
    } finally {
      setClosingId(null);
    }
  }

  async function onTrashRow(id: string) {
    if (!window.confirm(PRODUCT_COPY.kiDeleteConfirm)) {
      return;
    }
    setActionError(null);
    setDeletingId(id);
    try {
      const res = await deleteSparringChat(id);
      if (!res.ok) {
        setActionError(res.error);
        return;
      }
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (loadError) {
    return <AlertBanner variant="error">{loadError}</AlertBanner>;
  }

  return (
    <div className="space-y-6">
      {actionError ? <AlertBanner variant="warning">{actionError}</AlertBanner> : null}

      <div className="flex flex-wrap items-end gap-3">
        <label htmlFor="sparring-list-filter" className="text-[13px] font-medium text-leif-secondary">
          Anzeige
        </label>
        <select
          id="sparring-list-filter"
          value={listView}
          onChange={(e) => onFilterChange(e.target.value as SparringListView)}
          className={`${controlClass} w-auto min-w-[12rem]`}
        >
          {SPARRING_LIST_VIEW_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <TableShell>
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-leif-divider bg-leif-divider/60">
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-leif-muted">
                Titel
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-leif-muted">
                Typ
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-leif-muted">
                Status
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-leif-muted">
                Aktualisiert
              </th>
              <th className="w-11 px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-leif-muted">
                <span className="sr-only">Schließen</span>
              </th>
              <th className="w-11 px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-leif-muted">
                <span className="sr-only">Löschen</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {chats.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-leif-muted">
                  {emptyHint(listView)}
                </td>
              </tr>
            ) : (
              chats.map((c) => {
                const deleted = Boolean(c.deleted_at);
                const showTrash = !deleted;
                const showClose = !deleted && c.is_open;
                const dim = !c.is_open || deleted;
                return (
                  <tr
                    key={c.id}
                    className={`cursor-pointer border-b border-leif-divider transition-colors duration-150 last:border-0 hover:bg-leif-divider/50 ${dim ? "opacity-70" : ""}`}
                    onClick={() => router.push(`/sparring/${c.id}`)}
                  >
                    <td className="px-4 py-3.5 font-medium text-leif-text">{displayTitle(c)}</td>
                    <td className="px-4 py-3.5 text-leif-secondary">{typeLabel(c.type)}</td>
                    <td className="px-4 py-3.5">
                      <StatusChip tone={statusTone(c)}>{statusLabel(c)}</StatusChip>
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-leif-secondary">{formatUpdated(c.updated_at)}</td>
                    <td className="px-2 py-3.5 text-center align-middle">
                      {showClose ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={closingId === c.id}
                          onClick={(e) => void onCloseRow(c.id, e)}
                          className="h-10 w-10 min-w-0 p-0 text-leif-secondary hover:bg-leif-divider hover:text-leif-text"
                          title={PRODUCT_COPY.kiCloseListAria}
                          aria-label={PRODUCT_COPY.kiCloseListAria}
                        >
                          <DoorClosed className="h-[18px] w-[18px] shrink-0" aria-hidden />
                        </Button>
                      ) : (
                        <span className="inline-block h-10 w-10" aria-hidden />
                      )}
                    </td>
                    <td className="px-2 py-3.5 text-center align-middle">
                      {showTrash ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === c.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void onTrashRow(c.id);
                          }}
                          className="h-10 w-10 min-w-0 p-0 text-leif-secondary hover:bg-red-50 hover:text-red-700"
                          title={PRODUCT_COPY.kiDeleteAria}
                          aria-label={PRODUCT_COPY.kiDeleteAria}
                        >
                          <TrashIcon className="h-[18px] w-[18px]" />
                        </Button>
                      ) : (
                        <span className="inline-block h-10 w-10" aria-hidden />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
