export type NoteType = "note" | "draft";

export type NoteRow = {
  id: string;
  user_id: string;
  content: string;
  type: NoteType;
  area_id: string | null;
  source_sparring_chat_id: string | null;
  source_inbox_item_id: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteListItem = NoteRow & {
  area_name: string | null;
};
