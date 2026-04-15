export type PersonRow = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  category: string | null;
  address: string | null;
  birthday: string | null;
  birthday_reminder_days: number;
  /** Microsoft Graph Serienmaster-ID (jährlicher Geburtstags-Ganztagstermin) */
  birthday_outlook_event_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PersonWithAreas = PersonRow & {
  area_ids: string[];
  area_names: string[];
};
