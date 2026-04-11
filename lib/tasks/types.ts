export type TaskStatus = "inbox" | "open" | "planned" | "done" | "canceled";

export type TaskPriority = "high" | "medium" | "low";

export type AreaRow = {
  id: string;
  name: string;
  sort_order: number;
};

export type TaskRow = {
  id: string;
  user_id: string;
  area_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  planned_date: string | null;
  estimated_minutes: number | null;
  created_at: string;
  updated_at: string;
};

export type TaskWithRelations = TaskRow & {
  area_name: string;
  tags: string[];
};

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "inbox", label: "Inbox" },
  { value: "open", label: "Offen" },
  { value: "planned", label: "Geplant" },
  { value: "done", label: "Erledigt" },
  { value: "canceled", label: "Abgebrochen" },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "high", label: "Hoch" },
  { value: "medium", label: "Mittel" },
  { value: "low", label: "Niedrig" },
];

export const STATUS_ORDER: Record<TaskStatus, number> = {
  inbox: 0,
  open: 1,
  planned: 2,
  done: 3,
  canceled: 4,
};

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};
