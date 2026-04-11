export type InboxItemStatus = "pending" | "processed" | "discarded";

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
  is_read: boolean;
  status: InboxItemStatus;
  processed_as: string | null;
  processed_ref_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
