export type TaskDerivedStatus = "inbox" | "geplant" | "erledigt";
export type TaskPlanningStatus = "ungeplant" | "geplant";
export type TaskPriority = "high" | "normal" | "low";
export type TaskType = string;

export type AreaRow = {
  id: string;
  name: string;
  sort_order: number;
};

export type TaskRow = {
  id: string;
  user_id: string;
  area_id: string | null;
  project_id: string | null;
  title: string;
  description: string | null;
  status: string;
  task_type: string | null;
  priority: string;
  due_date: string | null;
  planned_date: string | null;
  estimated_minutes: number | null;
  document_id: string | null;
  completed_at: string | null;
  source_sparring_chat_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskWithRelations = TaskRow & {
  priority: TaskPriority;
  task_type: TaskType | null;
  status: TaskDerivedStatus;
  raw_status: string;
  area_name: string;
  document_title: string | null;
};

export const TASK_STATUSES: { value: TaskDerivedStatus; label: string }[] = [
  { value: "inbox", label: "Ohne Termin" },
  { value: "geplant", label: "Geplant" },
  { value: "erledigt", label: "Erledigt" },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "high", label: "Hoch" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Niedrig" },
];

export const STATUS_ORDER: Record<TaskDerivedStatus, number> = {
  inbox: 0,
  geplant: 1,
  erledigt: 2,
};

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

/** Kalender-gebucht: DB-Status `planned` und Kalendertag gesetzt (nicht nur Formular-Absicht). */
export function taskIsBookedInCalendar(
  task: Pick<TaskRow, "completed_at" | "planned_date" | "status">,
): boolean {
  if (task.completed_at) return false;
  const day = task.planned_date?.trim();
  if (!day) return false;
  return String(task.status).trim() === "planned";
}

export function taskPlanningStatusFromTask(
  task: Pick<TaskRow, "completed_at" | "planned_date" | "status">,
): TaskPlanningStatus {
  return taskIsBookedInCalendar(task) ? "geplant" : "ungeplant";
}

export function deriveTaskStatus(
  task: Pick<TaskRow, "completed_at" | "planned_date" | "status">,
): TaskDerivedStatus {
  if (task.completed_at) return "erledigt";
  if (taskIsBookedInCalendar(task)) return "geplant";
  return "inbox";
}
