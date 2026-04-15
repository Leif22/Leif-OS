import type { TaskWithRelations } from "./types";

export type TaskCardVisualState = "erledigt" | "ueberfaellig" | "heute" | "ungeplant" | "geplant";

/**
 * Karten-Stil: ohne Termin neutral, Heute stärker, Überfällig warnend, Geplant ruhig.
 * @param treatAsDone — z. B. optimistischer Erledigt-Zustand vor Server-Refresh
 */
export function getTaskCardVisualState(
  task: TaskWithRelations,
  todayYmd: string,
  treatAsDone?: boolean,
): TaskCardVisualState {
  const done = treatAsDone !== undefined ? treatAsDone : task.completed_at != null;
  if (done) return "erledigt";

  const planned = task.planned_date;
  const due = task.due_date;
  const overduePlan = planned != null && planned < todayYmd;
  const overdueDue = due != null && due < todayYmd;

  if (overduePlan || overdueDue) return "ueberfaellig";
  if (planned === todayYmd) return "heute";
  if (!planned) return "ungeplant";
  return "geplant";
}

export function taskCardSurfaceClass(state: TaskCardVisualState): string {
  switch (state) {
    case "erledigt":
      return "border-leif-border/55 bg-leif-surface-soft/90";
    case "ueberfaellig":
      return "border-amber-300/70 bg-gradient-to-br from-amber-50/90 to-white shadow-[0_1px_0_rgba(251,191,36,0.35)]";
    case "heute":
      return "border-leif-primary/25 bg-gradient-to-br from-leif-primary/[0.07] to-white shadow-sm";
    case "ungeplant":
      return "border-leif-border/75 bg-white";
    case "geplant":
      return "border-leif-primary/18 bg-gradient-to-br from-leif-primary/[0.05] via-white to-slate-50/90 shadow-sm";
    default:
      return "border-leif-border/70 bg-white";
  }
}
