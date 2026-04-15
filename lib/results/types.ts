export type ResultType = "insight" | "decision";

export type ResultRow = {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  type: ResultType;
  project_id: string | null;
  source_sparring_chat_id: string | null;
  source_inbox_item_id: string | null;
  created_at: string;
  updated_at: string;
};
