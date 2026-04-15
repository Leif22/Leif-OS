export type InboxItemStatus = "pending" | "processed" | "discarded";

export type InboxAiSuggestion = {
  tool: "task" | "calendar" | "note";
  confidence: number;
  title: string;
  task?: {
    due_choice?: "today" | "tomorrow" | "date";
    due_date?: string | null;
    duration_minutes?: number | null;
    priority?: "high" | "normal" | "low";
    description?: string | null;
    task_type?: string | null;
    document_id?: string | null;
  };
  calendar?: {
    start_local?: string | null;
    end_local?: string | null;
    is_all_day?: boolean;
    date?: string | null;
    description?: string | null;
    location?: string | null;
    is_private?: boolean;
  };
  note?: {
    type?: "note" | "draft";
    description?: string | null;
    document_id?: string | null;
  };
};

export type DashboardInboxItem = {
  id: string;
  content: string;
  source: string;
  source_ref: string | null;
  created_at: string;
};

export type InboxListItem = {
  id: string;
  content: string;
  source: string;
  source_ref: string | null;
  status: InboxItemStatus;
  processed_as: string | null;
  processed_ref_id: string | null;
  metadata: Record<string, unknown>;
  ai_status?: "pending" | "ready" | "rejected" | "failed";
  ai_error?: string | null;
  ai_suggestion: InboxAiSuggestion | null;
  ai_suggestion_rejected: boolean;
  ai_suggestion_checked: boolean;
  created_at: string;
  updated_at: string;
};
