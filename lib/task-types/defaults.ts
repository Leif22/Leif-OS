export type TaskTypeRow = {
  id: string;
  key: string;
  label: string;
  sort_order: number;
};

export const DEFAULT_TASK_TYPES: { key: string; label: string; sort_order: number }[] = [
  { key: "call", label: "Anruf", sort_order: 0 },
  { key: "deep", label: "Fokusarbeit", sort_order: 1 },
  { key: "admin", label: "Verwaltung", sort_order: 2 },
  { key: "finance", label: "Finanzen", sort_order: 3 },
  { key: "meeting", label: "Besprechung", sort_order: 4 },
];
