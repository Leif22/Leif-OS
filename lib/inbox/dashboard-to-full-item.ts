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
    metadata: {},
    created_at: d.created_at,
    updated_at: d.created_at,
  };
}
