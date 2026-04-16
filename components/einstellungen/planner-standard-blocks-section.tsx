"use client";

import {
  createPlannerStandardBlock,
  deletePlannerStandardBlock,
  movePlannerStandardBlock,
  updatePlannerStandardBlock,
} from "@/app/(app)/einstellungen/planner-standard-blocks-actions";
import { StandardBlockRecurrenceFields } from "@/components/planer/standard-block-recurrence-fields";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/control-styles";
import { TableShell } from "@/components/ui/table-shell";
import {
  buildRecurrenceRuleFromFormState,
  recurrenceFormStateFromRule,
  type StandardBlockRecurrenceFormState,
} from "@/lib/planer/build-standard-block-recurrence-rule";
import type { PlannerStandardPaletteItem } from "@/lib/planer/fetch-planner-standard-blocks";
import {
  findNextDueDate,
  formatDueDateLabel,
  formatRecurrenceLabel,
  normalizeRecurrenceRule,
  type PlannerRecurrenceRule,
} from "@/lib/planer/recurrence";
import { todayYmdInRecommendationTz } from "@/lib/tasks/recommended";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type FormEvent, type SetStateAction } from "react";

type Props = {
  blocks: PlannerStandardPaletteItem[];
  loadError: string | null;
};

function emptyRecurrenceForm(): StandardBlockRecurrenceFormState {
  return recurrenceFormStateFromRule({ frequency: "daily", interval: 1 });
}

export function PlannerStandardBlocksSection({ blocks, loadError }: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("45");
  const [priority, setPriority] = useState("2");
  const [relevance, setRelevance] = useState("7");
  const [recForm, setRecForm] = useState<StandardBlockRecurrenceFormState>(() => emptyRecurrenceForm());

  const anchorIso = useMemo(() => todayYmdInRecommendationTz(), []);

  const setFrequency = useCallback((v: PlannerRecurrenceRule["frequency"]) => {
    setRecForm((prev) => ({ ...prev, frequency: v }));
  }, []);
  const setIntervalStr = useCallback((v: string) => {
    setRecForm((prev) => ({ ...prev, interval: v }));
  }, []);
  const setWeeklyWeekdays = useCallback((action: SetStateAction<number[]>) => {
    setRecForm((prev) => ({
      ...prev,
      weeklyWeekdays: typeof action === "function" ? action(prev.weeklyWeekdays) : action,
    }));
  }, []);
  const setMonthlyMode = useCallback((v: "day_of_month" | "nth_weekday") => {
    setRecForm((prev) => ({ ...prev, monthlyMode: v }));
  }, []);
  const setMonthlyDay = useCallback((v: string) => {
    setRecForm((prev) => ({ ...prev, monthlyDay: v }));
  }, []);
  const setMonthlyNth = useCallback((v: string) => {
    setRecForm((prev) => ({ ...prev, monthlyNth: v }));
  }, []);
  const setMonthlyWeekday = useCallback((v: string) => {
    setRecForm((prev) => ({ ...prev, monthlyWeekday: v }));
  }, []);
  const setYearlyMonth = useCallback((v: string) => {
    setRecForm((prev) => ({ ...prev, yearlyMonth: v }));
  }, []);
  const setYearlyDay = useCallback((v: string) => {
    setRecForm((prev) => ({ ...prev, yearlyDay: v }));
  }, []);

  const builtRule = useMemo(
    () => buildRecurrenceRuleFromFormState(anchorIso, recForm),
    [anchorIso, recForm],
  );

  const previewLabel = useMemo(() => {
    const nextDueIso = findNextDueDate(builtRule, anchorIso);
    if (!nextDueIso) return "Keine Fälligkeit innerhalb der nächsten 3 Jahre gefunden.";
    return `Nächste Fälligkeit: ${formatDueDateLabel(nextDueIso)}`;
  }, [builtRule, anchorIso]);

  function openCreate() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setDuration("45");
    setPriority("2");
    setRelevance("7");
    setRecForm(recurrenceFormStateFromRule({ frequency: "daily", interval: 1, start_date: anchorIso }));
    setDialogOpen(true);
    setMsg(null);
  }

  function openEdit(block: PlannerStandardPaletteItem) {
    setEditingId(block.id);
    setTitle(block.title);
    setDescription(block.description ?? "");
    setDuration(String(block.durationMinutes));
    setPriority(String(block.priority));
    setRelevance(String(block.relevance));
    const rule = normalizeRecurrenceRule(block.recurrenceRule, block.frequency);
    setRecForm(recurrenceFormStateFromRule(rule));
    setDialogOpen(true);
    setMsg(null);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const rule = buildRecurrenceRuleFromFormState(anchorIso, recForm);
      const dm = Math.max(15, Number(duration) || 45);
      const pr = Math.min(3, Math.max(1, Math.floor(Number(priority) || 2)));
      const rel = Math.min(10, Math.max(1, Math.floor(Number(relevance) || 7)));
      if (editingId) {
        const res = await updatePlannerStandardBlock(
          editingId,
          title,
          description.trim() ? description : null,
          dm,
          rule,
          pr,
          rel,
        );
        if (!res.ok) {
          setMsg(res.error);
          return;
        }
      } else {
        const res = await createPlannerStandardBlock(
          title,
          description.trim() ? description : null,
          dm,
          rule,
          pr,
          rel,
        );
        if (!res.ok) {
          setMsg(res.error);
          return;
        }
      }
      closeDialog();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Standardblock wirklich löschen? Geplante Vorkommen im lokalen Planer werden beim nächsten Öffnen entfernt.")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await deletePlannerStandardBlock(id);
      if (!res.ok) setMsg(res.error);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onMove(id: string, direction: "up" | "down") {
    setMsg(null);
    const res = await movePlannerStandardBlock(id, direction);
    if (!res.ok) setMsg(res.error);
    else router.refresh();
  }

  if (loadError) {
    return (
      <AlertBanner variant="error">Standardblöcke konnten nicht geladen werden: {loadError}</AlertBanner>
    );
  }

  return (
    <section id="standard-bloecke" className="scroll-mt-6 space-y-4">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-leif-text">Standardblöcke (Planer)</h2>
        <p className="text-sm text-leif-secondary">
          Wiederkehrende Arbeitsblöcke für den Tagesplaner. Sie erscheinen in der Planungsliste neben deinen Tasks; Reihenfolge
          per Pfeiltasten. Bearbeitung hier, nicht mehr im Planer-Dialog.
        </p>
        <p className="text-sm text-leif-secondary">
          <Link href="/planer" className="font-medium text-leif-primary underline-offset-2 hover:underline">
            Zum Planer
          </Link>
        </p>
      </div>

      {msg ? <AlertBanner variant="error">{msg}</AlertBanner> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => openCreate()} disabled={busy}>
          <Plus className="mr-1 h-4 w-4" aria-hidden />
          Neuer Standardblock
        </Button>
      </div>

      <TableShell>
        <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-leif-border text-xs font-semibold uppercase tracking-wide text-leif-secondary">
              <th className="py-2 pr-3">Titel</th>
              <th className="py-2 pr-3">Dauer</th>
              <th className="py-2 pr-3">Rhythmus</th>
              <th className="w-28 py-2 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {blocks.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-sm text-leif-secondary">
                  Noch keine Einträge.
                </td>
              </tr>
            ) : (
              blocks.map((b, idx) => (
                <tr key={b.id} className="border-b border-leif-border/70 last:border-0">
                  <td className="py-2 pr-3 font-medium text-leif-text">{b.title}</td>
                  <td className="py-2 pr-3 tabular-nums text-leif-secondary">{b.durationMinutes} min</td>
                  <td className="py-2 pr-3 text-leif-secondary">
                    {formatRecurrenceLabel(normalizeRecurrenceRule(b.recurrenceRule, undefined))}
                  </td>
                  <td className="py-2 text-right">
                    <div className="inline-flex items-center gap-0.5">
                      <button
                        type="button"
                        className="rounded p-1 text-leif-secondary hover:bg-leif-divider/50 hover:text-leif-text disabled:opacity-40"
                        disabled={busy || idx === 0}
                        aria-label="Nach oben"
                        onClick={() => void onMove(b.id, "up")}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1 text-leif-secondary hover:bg-leif-divider/50 hover:text-leif-text disabled:opacity-40"
                        disabled={busy || idx === blocks.length - 1}
                        aria-label="Nach unten"
                        onClick={() => void onMove(b.id, "down")}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1 text-leif-secondary hover:bg-leif-divider/50 hover:text-leif-text"
                        aria-label="Bearbeiten"
                        onClick={() => openEdit(b)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1 text-red-600 hover:bg-red-50"
                        aria-label="Löschen"
                        onClick={() => void onDelete(b.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <form
            onSubmit={(e) => void onSubmit(e)}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-leif-border bg-leif-surface p-4 shadow-[var(--leif-shadow)]"
          >
            <h3 className="text-base font-semibold text-leif-text">
              {editingId ? "Standardblock bearbeiten" : "Standardblock anlegen"}
            </h3>
            <div className="mt-3 space-y-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-leif-secondary">Titel</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className={controlClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-leif-secondary">Beschreibung</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className={controlClass}
                />
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-leif-secondary">Dauer (min)</span>
                  <input
                    type="number"
                    min={15}
                    step={5}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className={controlClass}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-leif-secondary">Priorität (1–3)</span>
                  <input
                    type="number"
                    min={1}
                    max={3}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className={controlClass}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-leif-secondary">Relevanz (1–10)</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={relevance}
                    onChange={(e) => setRelevance(e.target.value)}
                    className={controlClass}
                  />
                </label>
              </div>
              <StandardBlockRecurrenceFields
                form={recForm}
                setFrequency={setFrequency}
                setInterval={setIntervalStr}
                setWeeklyWeekdays={setWeeklyWeekdays}
                setMonthlyMode={setMonthlyMode}
                setMonthlyDay={setMonthlyDay}
                setMonthlyNth={setMonthlyNth}
                setMonthlyWeekday={setMonthlyWeekday}
                setYearlyMonth={setYearlyMonth}
                setYearlyDay={setYearlyDay}
              />
              <div className="rounded-md border border-leif-border bg-leif-canvas/60 px-3 py-2 text-xs text-leif-secondary">
                {previewLabel}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-leif-border pt-4">
              <Button type="button" variant="secondary" disabled={busy} onClick={closeDialog}>
                Abbrechen
              </Button>
              <Button type="submit" variant="primary" disabled={busy}>
                Speichern
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
