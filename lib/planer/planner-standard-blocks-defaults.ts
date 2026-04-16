import type { PlannerRecurrenceRule } from "@/lib/planer/recurrence";

/** Seed-Daten, wenn ein Nutzer noch keine Einträge in `user_planner_standard_blocks` hat. */
export const DEFAULT_PLANNER_STANDARD_BLOCK_SEEDS: Array<{
  title: string;
  description?: string;
  duration_minutes: number;
  priority: number;
  relevance: number;
  recurrence_rule: PlannerRecurrenceRule;
  sort_order: number;
}> = [
  {
    title: "E-Mails bearbeiten",
    duration_minutes: 45,
    priority: 1,
    relevance: 9,
    recurrence_rule: { frequency: "daily", interval: 1 },
    sort_order: 0,
  },
  {
    title: "Tickets bearbeiten",
    duration_minutes: 60,
    priority: 1,
    relevance: 8,
    recurrence_rule: { frequency: "weekly", interval: 1, weekdays: [1, 2, 3, 4, 5] },
    sort_order: 1,
  },
  {
    title: "Rücksprachen",
    duration_minutes: 30,
    priority: 2,
    relevance: 7,
    recurrence_rule: { frequency: "weekly", interval: 1, weekdays: [1, 2, 3, 4, 5] },
    sort_order: 2,
  },
  {
    title: "Finanzbuchhaltung",
    duration_minutes: 50,
    priority: 2,
    relevance: 7,
    recurrence_rule: { frequency: "monthly", interval: 1, mode: "nth_weekday", weekday: 2, nth: 3 },
    sort_order: 3,
  },
];
