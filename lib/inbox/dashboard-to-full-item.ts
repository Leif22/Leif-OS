import type { DashboardInboxItem, InboxListItem } from "@/lib/inbox/types";

/** Dashboard-Inbox-Zeilen als vollständige `InboxListItem` für gemeinsame Workflow-Logik. */
export function dashboardInboxItemToFull(d: DashboardInboxItem): InboxListItem {
  return {
    id: d.id,
    content: d.content,
    source: d.source,
    source_ref: d.source_ref,
    status: "pending",
    processed_as: null,
    processed_ref_id: null,
    metadata: d.metadata,
    ai_status: d.ai_status,
    ai_error: d.ai_error,
    ai_suggestion: d.ai_suggestion,
    ai_suggestion_rejected: d.ai_suggestion_rejected,
    ai_suggestion_checked: d.ai_suggestion_checked,
    created_at: d.created_at,
    updated_at: d.created_at,
  };
}
