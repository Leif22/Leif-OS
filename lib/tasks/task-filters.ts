import { addBerlinCalendarDays } from "@/lib/calendar/berlin-ymd";
import type { TaskWithRelations } from "./types";

export type TaskSmartFilter =
  | "heute"
  | "morgen"
  | "ueberfaellig"
  | "geplant"
  | "erledigt"
  | "alle";

export const TASK_SMART_FILTER_OPTIONS: { id: TaskSmartFilter; label: string }[] = [
  { id: "heute", label: "Heute" },
  { id: "morgen", label: "Morgen" },
  { id: "ueberfaellig", label: "Überfällig" },
  { id: "geplant", label: "Geplant" },
  { id: "erledigt", label: "Erledigt" },
  { id: "alle", label: "Alle" },
];

function isDone(task: TaskWithRelations): boolean {
  return task.completed_at != null;
}

export function taskMatchesSmartFilter(
  task: TaskWithRelations,
  filter: TaskSmartFilter,
  todayYmd: string,
): boolean {
  if (filter === "alle") return true;
  if (filter === "erledigt") return isDone(task);

  if (isDone(task)) return false;

  const tomorrowYmd = addBerlinCalendarDays(todayYmd, 1);

  switch (filter) {
    case "heute":
      return task.planned_date === todayYmd;
    case "morgen":
      return task.planned_date === tomorrowYmd;
    case "ueberfaellig":
      return (
        (task.planned_date != null && task.planned_date < todayYmd) ||
        (task.due_date != null && task.due_date < todayYmd)
      );
    case "geplant":
      return task.planned_date != null;
    default:
      return false;
  }
}

export function filterTasksBySmartFilter(
  tasks: TaskWithRelations[],
  filter: TaskSmartFilter,
  todayYmd: string,
): TaskWithRelations[] {
  return tasks.filter((t) => taskMatchesSmartFilter(t, filter, todayYmd));
}

export function sortTasksForSmartFilter(
  tasks: TaskWithRelations[],
  filter: TaskSmartFilter,
): TaskWithRelations[] {
  const list = [...tasks];
  list.sort((a, b) => {
    if (filter === "erledigt") {
      const ca = a.completed_at ?? "";
      const cb = b.completed_at ?? "";
      return cb.localeCompare(ca);
    }
    /** „Alle“: Erledigte nach unten (offene zuerst). */
    if (filter === "alle") {
      const aDone = a.completed_at != null;
      const bDone = b.completed_at != null;
      if (aDone !== bDone) return aDone ? 1 : -1;
    }
    const pa = a.planned_date ?? "\uffff";
    const pb = b.planned_date ?? "\uffff";
    if (pa !== pb) return pa.localeCompare(pb);
    const da = a.due_date ?? "\uffff";
    const db = b.due_date ?? "\uffff";
    if (da !== db) return da.localeCompare(db);
    return a.title.localeCompare(b.title, "de");
  });
  return list;
}

export function countTasksForFilter(
  tasks: TaskWithRelations[],
  filter: TaskSmartFilter,
  todayYmd: string,
): number {
  return filterTasksBySmartFilter(tasks, filter, todayYmd).length;
}
