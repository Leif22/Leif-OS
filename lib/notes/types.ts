export type NoteType = string;

export type NoteRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  document_id: string | null;
  project_id: string | null;
  content: string;
  type: NoteType;
  area_id: string | null;
  source_sparring_chat_id: string | null;
  source_inbox_item_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteListItem = NoteRow & {
  area_name: string | null;
};
