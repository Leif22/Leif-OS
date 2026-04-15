"use client";

import {
  createTaskType,
  deleteTaskType,
  moveTaskType,
  updateTaskType,
} from "@/app/(app)/einstellungen/task-types-actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/control-styles";
import { TableShell } from "@/components/ui/table-shell";
import type { TaskTypeRow } from "@/lib/task-types/defaults";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Props = {
  taskTypes: TaskTypeRow[];
  loadError: string | null;
};

export function TaskTypesSection({ taskTypes, loadError }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await createTaskType(name);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setName("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    if (!editingId) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await updateTaskType(editingId, editingLabel);
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
    if (!window.confirm("Task-Art wirklich löschen? Zugeordnete Tasks verlieren die Art.")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await deleteTaskType(id);
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

  async function onMove(id: string, direction: "up" | "down") {
    setMsg(null);
    const res = await moveTaskType(id, direction);
    if (!res.ok) setMsg(res.error);
    else router.refresh();
  }

  if (loadError) {
    return <AlertBanner variant="error">Task-Arten konnten nicht geladen werden: {loadError}</AlertBanner>;
  }

  return (
    <section id="task-arten" className="scroll-mt-6 space-y-4">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-leif-text">Task-Arten</h2>
        <p className="text-sm text-leif-secondary">
          Diese Liste steuert die Auswahl bei der Task-Erstellung. Du kannst Arten erweitern, umbenennen und löschen.
        </p>
      </div>

      {msg ? <AlertBanner variant="warning">{msg}</AlertBanner> : null}

      <form
        onSubmit={onCreate}
        className="space-y-4 rounded-[12px] border border-leif-border bg-white p-5 shadow-leif"
      >
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex min-w-[16rem] flex-1 flex-col gap-2 text-sm">
            <span className="font-medium text-leif-secondary">Neue Art</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={controlClass}
              maxLength={80}
              required
            />
          </label>
          <Button type="submit" disabled={busy}>
            Hinzufügen
          </Button>
        </div>
      </form>

      <TableShell>
        <table className="w-full min-w-[36rem] border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b border-leif-divider bg-white">
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Reihenfolge</th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Name</th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Key</th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {taskTypes.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-14 text-center text-[13px] text-leif-secondary">
                  Noch keine Task-Arten vorhanden.
                </td>
              </tr>
            ) : (
              taskTypes.map((t, i) => (
                <tr key={t.id}>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={busy || i === 0}
                        onClick={() => void onMove(t.id, "up")}
                        className="rounded-[8px] border border-leif-border bg-white px-2 py-1 text-xs"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={busy || i === taskTypes.length - 1}
                        onClick={() => void onMove(t.id, "down")}
                        className="rounded-[8px] border border-leif-border bg-white px-2 py-1 text-xs"
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {editingId === t.id ? (
                      <input
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        className={controlClass}
                      />
                    ) : (
                      t.label
                    )}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-leif-muted">{t.key}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {editingId === t.id ? (
                        <>
                          <Button type="button" size="sm" disabled={busy} onClick={() => void onSave()}>
                            Speichern
                          </Button>
                          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => setEditingId(null)}>
                            Abbrechen
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={busy}
                            onClick={() => {
                              setEditingId(t.id);
                              setEditingLabel(t.label);
                            }}
                          >
                            Bearbeiten
                          </Button>
                          <Button type="button" variant="danger" size="sm" disabled={busy} onClick={() => void onDelete(t.id)}>
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
    </section>
  );
}
