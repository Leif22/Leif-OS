"use client";

import {
  createArea,
  deleteArea,
  moveArea,
  updateArea,
} from "@/app/(app)/bereiche/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/control-styles";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { TableShell } from "@/components/ui/table-shell";
import type { AreaListRow } from "@/lib/areas/types";
import { PRODUCT_COPY, PRODUCT_LABEL } from "@/lib/product-labels";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

type Props = {
  areas: AreaListRow[];
  loadError: string | null;
  /** Eingebettet unter Einstellungen: kein Seiten-`PageHeader`, andere Einleitung */
  embeddedInSettings?: boolean;
};

export function BereichePageClient({ areas, loadError, embeddedInSettings = false }: Props) {
  const router = useRouter();
  const formId = useId();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const res = await createArea(name, desc);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setName("");
      setDesc("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function startEdit(a: AreaListRow) {
    setEditingId(a.id);
    setEditName(a.name);
    setEditDesc(a.description ?? "");
    setMsg(null);
  }

  async function onSaveEdit() {
    if (!editingId) return;
    setMsg(null);
    setBusy(true);
    try {
      const res = await updateArea(editingId, editName, editDesc);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm(PRODUCT_COPY.lebensbereichLoeschenConfirm)) return;
    setMsg(null);
    setBusy(true);
    try {
      const res = await deleteArea(id);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      if (editingId === id) setEditingId(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onMove(id: string, dir: "up" | "down") {
    setMsg(null);
    const res = await moveArea(id, dir);
    if (!res.ok) setMsg(res.error);
    else router.refresh();
  }

  if (loadError) {
    return <AlertBanner variant="error">Daten konnten nicht geladen werden: {loadError}</AlertBanner>;
  }

  const smallBtn =
    "rounded-[8px] border border-leif-border bg-white px-2 py-1 text-xs font-medium text-leif-text transition-colors duration-150 hover:bg-[#F8FAFC] disabled:opacity-40";

  return (
    <div className="space-y-8">
      {embeddedInSettings ? (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight text-leif-text">Task-Bereiche</h2>
          <p className="text-sm text-leif-secondary">{PRODUCT_COPY.bereicheSettingsDescription}</p>
        </div>
      ) : (
        <PageHeader title={PRODUCT_LABEL.lebensbereiche} description={PRODUCT_COPY.lebensbereichePageDescription} />
      )}

      {msg ? <AlertBanner variant="warning">{msg}</AlertBanner> : null}

      <form
        onSubmit={onCreate}
        className="space-y-4 rounded-[12px] border border-leif-border bg-white p-5 shadow-leif"
      >
        <SectionTitle className="text-base">{PRODUCT_COPY.neuerLebensbereich}</SectionTitle>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-2 text-sm">
            <span className="font-medium text-leif-secondary">Name</span>
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={controlClass}
              maxLength={120}
              required
            />
          </label>
          <label className="flex min-w-[16rem] flex-[2] flex-col gap-2 text-sm">
            <span className="font-medium text-leif-secondary">Beschreibung (optional)</span>
            <input
              name="description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className={controlClass}
              maxLength={500}
            />
          </label>
          <Button type="submit" disabled={busy}>
            Anlegen
          </Button>
        </div>
      </form>

      <TableShell>
        <table className="w-full min-w-[40rem] border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b border-leif-divider bg-white">
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Reihenfolge</th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Name</th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Slug</th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Tasks</th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Beschreibung</th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {areas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-[13px] text-leif-secondary">
                  {PRODUCT_COPY.lebensbereicheEmpty}
                </td>
              </tr>
            ) : (
              areas.map((a, i) => (
                <tr key={a.id} className="transition-colors duration-150">
                  <td className="px-4 py-3 align-middle">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={busy || i === 0}
                        onClick={() => void onMove(a.id, "up")}
                        className={smallBtn}
                        aria-label="Nach oben"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={busy || i === areas.length - 1}
                        onClick={() => void onMove(a.id, "down")}
                        className={smallBtn}
                        aria-label="Nach unten"
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle font-semibold text-leif-text">
                    {editingId === a.id ? (
                      <input
                        id={`${formId}-name-${a.id}`}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={`${controlClass} min-w-[8rem]`}
                      />
                    ) : (
                      <Link
                        href={`/bereiche/${a.id}`}
                        className="text-leif-text underline-offset-4 hover:underline"
                      >
                        {a.name}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle text-[12px] text-leif-muted">{a.slug}</td>
                  <td className="px-4 py-3 align-middle tabular-nums text-leif-secondary">{a.task_count}</td>
                  <td className="max-w-xs px-4 py-3 align-middle text-leif-secondary">
                    {editingId === a.id ? (
                      <input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className={controlClass}
                      />
                    ) : (
                      <span className="line-clamp-2">{a.description ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex flex-wrap gap-2">
                      {editingId === a.id ? (
                        <>
                          <Button type="button" size="sm" disabled={busy} onClick={() => void onSaveEdit()}>
                            Speichern
                          </Button>
                          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => setEditingId(null)}>
                            Abbrechen
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => startEdit(a)}>
                            Bearbeiten
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            disabled={busy || a.task_count > 0}
                            onClick={() => void onDelete(a.id)}
                          >
                            Löschen
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
