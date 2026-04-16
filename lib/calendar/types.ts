export type KalenderView = "month" | "week" | "day" | "agenda";

export type CalendarEventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  is_private: boolean;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  source: string;
  area_id: string | null;
  outlook_event_id: string | null;
  /** Outlook-Serien-ID (seriesMasterId) oder Einzel-id; für Planung/Serienlogik. */
  outlook_recurrence_group_id: string | null;
  /** Termin existiert weiter, blockiert in der Planungsansicht aber keine Slots. */
  exclude_from_planner: boolean;
  /** Microsoft Graph sensitivity (Kleinbuchstaben), z. B. private. */
  outlook_sensitivity: string | null;
  /** Serientermin laut Graph (type ≠ singleInstance). */
  outlook_is_recurring: boolean;
};

export type PlannedTaskCalendarRow = {
  id: string;
  title: string;
  planned_date: string;
  status: string;
  estimated_minutes: number | null;
  area_name: string;
};

export type CalendarEventFormPayload = {
  title: string;
  description: string;
  location?: string;
  is_private?: boolean;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  /** Nur bei Neuanlage: Termin zusätzlich in Outlook (Microsoft Graph) anlegen. */
  writeToOutlook?: boolean;
};
