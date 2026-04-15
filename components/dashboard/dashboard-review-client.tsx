"use client";

import {
  markTaskReviewDone,
  moveTaskReviewToTomorrow,
  replanTaskFromReview,
  sendTaskReviewBackToInbox,
} from "@/app/(app)/dashboard/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { addBerlinCalendarDays } from "@/lib/calendar/berlin-ymd";
import { todayYmdInRecommendationTz } from "@/lib/dashboard/berlin-date";
import type { TodayPlannedTaskBrief } from "@/lib/dashboard/fetch-today-dashboard";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
  tasks: TodayPlannedTaskBrief[];
  loadError: string | null;
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("de-DE", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function DashboardReviewClient({ tasks, loadError }: Props) {
  const router = useRouter();
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [plannedDate, setPlannedDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const tomorrowYmd = useMemo(
    () => addBerlinCalendarDays(todayYmdInRecommendationTz(), 1),
    [],
  );

  async function runTaskAction(taskId: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    setBusyTaskId(taskId);
    try {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Aktion fehlgeschlagen.");
      if (res.ok && expandedTaskId === taskId) {
        setExpandedTaskId(null);
      }
      if (res.ok) {
        void Promise.resolve(router.refresh()).catch(() => {});
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        msg === "Failed to fetch" || msg.includes("Load failed")
          ? "Verbindung zum Server fehlgeschlagen. Bitte Seite neu laden oder kurz warten."
          : msg,
      );
    } finally {
      setBusyTaskId(null);
    }
  }

  function toggleReplan(task: TodayPlannedTaskBrief) {
    const open = expandedTaskId === task.id;
    if (open) {
      setExpandedTaskId(null);
      return;
    }
    setExpandedTaskId(task.id);
    setPlannedDate(task.planned_date || tomorrowYmd);
    setDueDate(task.planned_date || tomorrowYmd);
  }

  return (
    <section
      className="space-y-3 rounded-xl border border-leif-border/28 bg-leif-surface-soft px-3 pb-4 pt-3 sm:px-4 sm:pb-4 sm:pt-3.5 lg:px-5 shadow-[0_3px_12px_rgba(15,23,42,0.07)]"
      aria-labelledby="dashboard-review-heading"
    >
      <div className="flex items-end gap-2.5">
        <h2 id="dashboard-review-heading" className="min-w-0 flex-1 text-xl font-semibold tracking-tight text-leif-text">
          Tagesreview
        </h2>
        {tasks.length > 0 ? (
          <span className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-full bg-leif-primary/10 px-2.5 text-sm font-medium tabular-nums text-leif-primary">
            {tasks.length}
          </span>
        ) : null}
      </div>

      <p className="text-[12px] text-leif-secondary">Geplant, aber nicht erledigt: entscheide pro Task den naechsten Schritt.</p>

      {loadError ? <AlertBanner variant="error">Review-Liste konnte nicht geladen werden: {loadError}</AlertBanner> : null}
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      {!loadError && tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-leif-border/90 bg-leif-canvas/40 px-5 py-8 text-center">
          <CalendarClock className="mx-auto size-10 text-leif-muted" aria-hidden />
          <p className="mt-3 text-sm font-medium text-leif-text">Keine offenen Tagesruecklaeufe</p>
        </div>
      ) : null}

      {!loadError && tasks.length > 0 ? (
        <ul className="space-y-2.5">
          {tasks.map((task) => {
            const isBusy = busyTaskId === task.id;
            const isExpanded = expandedTaskId === task.id;
            return (
              <li key={task.id} className="rounded-lg border border-leif-border/70 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-semibold text-leif-text">{task.title}</p>
                    <p className="text-xs text-leif-secondary">
                      Geplant bis {formatDate(task.planned_date)} · {task.area_name}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      disabled={isBusy}
                      onClick={() => runTaskAction(task.id, () => markTaskReviewDone(task.id))}
                    >
                      Erledigt
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => runTaskAction(task.id, () => moveTaskReviewToTomorrow(task.id))}
                    >
                      Morgen
                    </Button>
                    <Button variant="ghost" size="sm" disabled={isBusy} onClick={() => toggleReplan(task)}>
                      Neu planen
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => runTaskAction(task.id, () => sendTaskReviewBackToInbox(task.id))}
                    >
                      Zurueck in Inbox
                    </Button>
                  </div>
                </div>

                {isExpanded ? (
                  <form
                    className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-leif-border/70 bg-leif-canvas/50 p-2.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void runTaskAction(task.id, () => replanTaskFromReview(task.id, plannedDate, dueDate || null));
                    }}
                  >
                    <label className="text-xs text-leif-secondary">
                      Planung
                      <input
                        type="date"
                        className="mt-1 block h-9 rounded-md border border-leif-border bg-white px-2 text-sm text-leif-text"
                        value={plannedDate}
                        onChange={(e) => setPlannedDate(e.target.value)}
                        required
                      />
                    </label>
                    <label className="text-xs text-leif-secondary">
                      Faelligkeit
                      <input
                        type="date"
                        className="mt-1 block h-9 rounded-md border border-leif-border bg-white px-2 text-sm text-leif-text"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </label>
                    <Button size="sm" type="submit" disabled={isBusy || !plannedDate}>
                      Speichern
                    </Button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
