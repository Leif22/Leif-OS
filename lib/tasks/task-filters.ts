import { addBerlinCalendarDays } from "@/lib/calendar/berlin-ymd";
import { taskIsBookedInCalendar, type TaskWithRelations } from "./types";

export type TaskSmartFilter =
  | "heute"
  | "morgen"
  | "ueberfaellig"
  | "favoriten"
  | "planer_entwurf"
  | "geplant"
  | "erledigt"
  | "alle";

export type TaskSmartFilterContext = {
  /** Task-IDs mit offenem Planer-Entwurf (nicht finalisierter Tag), aus `localStorage`. */
  planerDraftTaskIds?: Set<string>;
};

export const TASK_SMART_FILTER_OPTIONS: { id: TaskSmartFilter; label: string }[] = [
  { id: "heute", label: "Heute" },
  { id: "morgen", label: "Morgen" },
  { id: "ueberfaellig", label: "Überfällig" },
  { id: "favoriten", label: "Favoriten" },
  { id: "planer_entwurf", label: "Gebunden" },
  { id: "geplant", label: "Geplant" },
  { id: "erledigt", label: "Erledigt" },
  { id: "alle", label: "Alle" },
];

function isDone(task: TaskWithRelations): boolean {
  return task.completed_at != null;
}

function booked(task: TaskWithRelations): boolean {
  return taskIsBookedInCalendar({
    completed_at: task.completed_at,
    planned_date: task.planned_date,
    status: task.raw_status,
  });
}

export function taskMatchesSmartFilter(
  task: TaskWithRelations,
  filter: TaskSmartFilter,
  todayYmd: string,
  ctx?: TaskSmartFilterContext,
): boolean {
  if (filter === "alle") return true;
  if (filter === "erledigt") return isDone(task);
  if (filter === "favoriten") return !isDone(task) && task.priority === "high";

  if (isDone(task)) return false;

  const tomorrowYmd = addBerlinCalendarDays(todayYmd, 1);

  switch (filter) {
    case "heute":
      return booked(task) && task.planned_date === todayYmd;
    case "morgen":
      return booked(task) && task.planned_date === tomorrowYmd;
    case "ueberfaellig":
      return (
        (booked(task) && task.planned_date != null && task.planned_date < todayYmd) ||
        (task.due_date != null && task.due_date < todayYmd)
      );
    case "planer_entwurf": {
      const draft = ctx?.planerDraftTaskIds;
      if (!draft || draft.size === 0) return false;
      return draft.has(task.id) && !booked(task);
    }
    case "geplant":
      return booked(task);
    default:
      return false;
  }
}

export function filterTasksBySmartFilter(
  tasks: TaskWithRelations[],
  filter: TaskSmartFilter,
  todayYmd: string,
  ctx?: TaskSmartFilterContext,
): TaskWithRelations[] {
  return tasks.filter((t) => taskMatchesSmartFilter(t, filter, todayYmd, ctx));
}

export function sortTasksForSmartFilter(
  tasks: TaskWithRelations[],
  filter: TaskSmartFilter,
): TaskWithRelations[] {
  const list = [...tasks];
  list.sort((a, b) => {
    if (filter === "planer_entwurf") {
      return a.title.localeCompare(b.title, "de");
    }
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
  ctx?: TaskSmartFilterContext,
): number {
  return filterTasksBySmartFilter(tasks, filter, todayYmd, ctx).length;
}
