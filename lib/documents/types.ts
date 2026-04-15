export type DocumentRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  byte_size: number;
  source: "manual" | "inbox" | "telegram_inbox";
  source_inbox_item_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type DocumentListItem = Pick<
  DocumentRow,
  "id" | "title" | "description" | "original_filename" | "mime_type" | "byte_size" | "created_at"
>;

export type DocumentLinkSets = {
  areaIds: string[];
  personIds: string[];
  noteIds: string[];
  resultIds: string[];
};

export type DocumentAreaLink = { area_id: string; areas: { id: string; name: string } | null };
export type DocumentPersonLink = {
  person_id: string;
  persons: { id: string; first_name: string; last_name: string } | null;
};
export type DocumentNoteLink = { note_id: string; notes: { id: string; content: string } | null };
export type DocumentResultLink = {
  result_id: string;
  results: { id: string; title: string } | null;
};

export type DocumentWithLinks = DocumentRow & {
  document_area_links: DocumentAreaLink[];
  document_person_links: DocumentPersonLink[];
  document_note_links: DocumentNoteLink[];
  document_result_links: DocumentResultLink[];
};
